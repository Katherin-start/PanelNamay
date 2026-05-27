'use client';

import { useEffect, useState } from 'react';
import { Appointment, Patient, User } from '@/types';
import { apiClient } from '@/lib/api';
import {
  CalendarIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  UserIcon,
  XMarkIcon,
  ClockIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  pendiente: { bg: '#FEF9C3', text: '#92400E', label: 'PENDIENTE' },
  confirmada: { bg: '#DCFCE7', text: '#16A34A', label: 'CONFIRMADA' },
  completada: { bg: '#DBEAFE', text: '#1D4ED8', label: 'COMPLETADA' },
  cancelada: { bg: '#FEE2E2', text: '#DC2626', label: 'CANCELADA' },
  programada: { bg: '#EDE9FE', text: '#6D28D9', label: 'PROGRAMADA' },
};

interface ApptForm {
  paciente_id: string; doctor_id: string;
  fecha_hora: string; estado: Appointment['estado'];
  servicio?: string; notas?: string;
}
const emptyApptForm: ApptForm = { paciente_id: '', doctor_id: '', fecha_hora: '', estado: 'programada' };

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('todos');
  const [saving, setSaving]           = useState(false);
  const [formError, setFormError]     = useState('');
  const [showNew, setShowNew]         = useState(false);
  const [form, setForm]               = useState<ApptForm>(emptyApptForm);
  const [viewAppt, setViewAppt]       = useState<Appointment | null>(null);
  const [editAppt, setEditAppt]       = useState<Appointment | null>(null);
  const [editForm, setEditForm]       = useState<Partial<Appointment>>({});

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const [data, patientData, userData] = await Promise.all([
          apiClient.getAppointments(),
          apiClient.getPatients(),
          apiClient.getUsers().catch(() => []),
        ]);
        setAppointments(Array.isArray(data) ? data : []);
        setPatients(Array.isArray(patientData) ? patientData : []);
        setDoctors((Array.isArray(userData) ? userData : []).filter((u: User) => u.rol === 'ODONTOLOGO'));
      } catch (error) {
        console.error('Error al cargar citas:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAppointments();
  }, []);

  const handleCreateAppt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.paciente_id || !form.fecha_hora) { setFormError('Paciente y fecha son obligatorios.'); return; }
    setSaving(true); setFormError('');
    try {
      const created = await apiClient.createAppointment(form);
      const newAppt = created?.cita ?? created?.data ?? created;
      if (newAppt && typeof newAppt === 'object' && newAppt.id) setAppointments((prev) => [newAppt, ...prev]);
      setShowNew(false); setForm(emptyApptForm);
    } catch (err: any) { setFormError(err.message ?? 'Error al guardar la cita.'); }
    finally { setSaving(false); }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAppt) return;
    setSaving(true); setFormError('');
    try {
      const updated = await apiClient.updateAppointment(editAppt.id, editForm);
      setAppointments((prev) => prev.map((a) => a.id === editAppt.id ? { ...a, ...editForm, ...(updated?.cita ?? updated) } : a));
      setEditAppt(null);
    } catch (err: any) { setFormError(err.message ?? 'Error al actualizar.'); }
    finally { setSaving(false); }
  };

  const filtered = appointments.filter((a) => {
    const matchSearch =
      a.paciente_nombre?.toLowerCase().includes(search.toLowerCase()) ||
      a.doctor_nombre?.toLowerCase().includes(search.toLowerCase()) ||
      a.servicio?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'todos' || a.estado === filter;
    return matchSearch && matchFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#457B9D] border-t-[#E63946]" />
      </div>
    );
  }

  const stats = {
    total: appointments.length,
    hoy: appointments.filter((a) => {
      const d = new Date(a.fecha_hora);
      return d.toDateString() === new Date().toDateString();
    }).length,
    pendientes: appointments.filter((a) => a.estado === 'pendiente').length,
    completadas: appointments.filter((a) => a.estado === 'completada').length,
  };

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: '#457B9D' }}>
            Panel · Gestión de Citas
          </p>
          <h1 className="text-2xl font-bold mt-0.5" style={{ color: '#1D3557' }}>
            Citas Médicas
          </h1>
          <p className="text-sm mt-1 text-gray-500">Gestiona y programa las citas de los pacientes.</p>
        </div>
        <button
          onClick={() => { setForm(emptyApptForm); setFormError(''); setShowNew(true); }}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-lg transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#E63946' }}
        >
          <PlusIcon className="h-4 w-4" />
          Nueva Cita
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Citas', value: stats.total, color: '#1D3557' },
          { label: 'Citas Hoy', value: stats.hoy, color: '#457B9D' },
          { label: 'Pendientes', value: stats.pendientes, color: '#F59E0B' },
          { label: 'Completadas', value: stats.completadas, color: '#16A34A' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{s.label}</p>
            <p className="text-3xl font-bold mt-1" style={{ color: s.color }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar cita, paciente o doctor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#457B9D]"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['todos', 'pendiente', 'confirmada', 'completada', 'cancelada'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${
                  filter === f ? 'text-white' : 'text-gray-500 bg-gray-100 hover:bg-gray-200'
                }`}
                style={filter === f ? { backgroundColor: '#1D3557' } : {}}
              >
                {f === 'todos' ? 'Todos' : f}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: '#F1F4F9' }}>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Paciente</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Doctor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Servicio</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                    No se encontraron citas
                  </td>
                </tr>
              ) : (
                filtered.map((apt) => {
                  const s = statusConfig[apt.estado] || statusConfig.pendiente;
                  return (
                    <tr key={apt.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                            style={{ backgroundColor: '#457B9D' }}
                          >
                            {apt.paciente_nombre?.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium" style={{ color: '#1D3557' }}>
                            {apt.paciente_nombre}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <UserIcon className="h-3.5 w-3.5 text-gray-400" />
                          {apt.doctor_nombre}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{apt.servicio}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <CalendarIcon className="h-3.5 w-3.5 text-gray-400" />
                          {new Date(apt.fecha_hora).toLocaleDateString('es-PE', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2.5 py-1 text-xs font-semibold rounded-full"
                          style={{ backgroundColor: s.bg, color: s.text }}
                        >
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setEditAppt(apt); setEditForm({ estado: apt.estado, fecha_hora: apt.fecha_hora, paciente_id: apt.paciente_id, doctor_id: apt.doctor_id }); setFormError(''); }}
                            className="px-2.5 py-1 text-xs font-medium text-white rounded-lg hover:opacity-90"
                            style={{ backgroundColor: '#457B9D' }}
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => setViewAppt(apt)}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                            Ver
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Mostrando {filtered.length} de {appointments.length} citas
          </p>
          <div className="flex items-center gap-1">
            {['‹', '1', '2', '3', '›'].map((p, i) => (
              <button
                key={i}
                className={`w-7 h-7 text-xs rounded flex items-center justify-center transition-colors ${
                  p === '1' ? 'text-white' : 'text-gray-500 hover:bg-gray-100'
                }`}
                style={p === '1' ? { backgroundColor: '#1D3557' } : {}}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>

    {/* ── MODAL: NUEVA CITA ── */}
    {showNew && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(29,53,87,0.55)' }}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#E63946' }}>
                <PlusIcon className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-lg font-bold" style={{ color: '#1D3557' }}>Nueva Cita</h2>
            </div>
            <button onClick={() => setShowNew(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <XMarkIcon className="h-5 w-5 text-gray-400" />
            </button>
          </div>
          <form onSubmit={handleCreateAppt} className="px-6 py-5 space-y-4">
            {formError && <div className="p-3 rounded-lg text-sm font-medium text-red-700" style={{ backgroundColor: '#FEE2E2' }}>{formError}</div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Paciente <span className="text-red-500">*</span></label>
                <select value={form.paciente_id} onChange={(e) => setForm({ ...form, paciente_id: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#457B9D] bg-white" required>
                  <option value="">Seleccionar paciente...</option>
                  {patients.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Odontologo</label>
                <select value={form.doctor_id} onChange={(e) => setForm({ ...form, doctor_id: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#457B9D] bg-white">
                  <option value="">Sin asignar</option>
                  {doctors.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Estado</label>
                <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value as Appointment['estado'] })}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#457B9D] bg-white">
                  {['programada','pendiente','confirmada','completada','cancelada'].map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Fecha y hora <span className="text-red-500">*</span></label>
                <input type="datetime-local" value={form.fecha_hora} onChange={(e) => setForm({ ...form, fecha_hora: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#457B9D]" required />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowNew(false)}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white rounded-lg transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: '#E63946' }}>
                {saving ? 'Guardando...' : 'Crear Cita'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* ── MODAL: VER CITA ── */}
    {viewAppt && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(29,53,87,0.55)' }}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="px-6 py-4 flex items-center gap-3" style={{ backgroundColor: '#1D3557' }}>
            <CalendarIcon className="h-6 w-6 text-white" />
            <h2 className="text-lg font-bold text-white flex-1">Detalle de Cita</h2>
            <button onClick={() => setViewAppt(null)} className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="px-6 py-5 space-y-3">
            {[
              { label: 'Paciente',  value: viewAppt.paciente_nombre },
              { label: 'Doctor',    value: viewAppt.doctor_nombre || '—' },
              { label: 'Servicio',  value: viewAppt.servicio || '—' },
              { label: 'Fecha',     value: new Date(viewAppt.fecha_hora).toLocaleString('es-PE', { dateStyle: 'long', timeStyle: 'short' }) },
              { label: 'Estado',    value: viewAppt.estado?.toUpperCase() },
              { label: 'Notas',     value: viewAppt.notas || 'Sin notas' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: '#F1F4F9' }}>
                <DocumentTextIcon className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: '#457B9D' }} />
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">{label}</p>
                  <p className="text-sm font-medium mt-0.5" style={{ color: '#1D3557' }}>{value}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="px-6 pb-5">
            <button onClick={() => setViewAppt(null)}
              className="w-full px-4 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ── MODAL: EDITAR CITA ── */}
    {editAppt && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(29,53,87,0.55)' }}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#457B9D' }}>
                <ClockIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold" style={{ color: '#1D3557' }}>Editar Cita</h2>
                <p className="text-xs text-gray-400">{editAppt.paciente_nombre}</p>
              </div>
            </div>
            <button onClick={() => setEditAppt(null)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <XMarkIcon className="h-5 w-5 text-gray-400" />
            </button>
          </div>
          <form onSubmit={handleSaveEdit} className="px-6 py-5 space-y-4">
            {formError && <div className="p-3 rounded-lg text-sm font-medium text-red-700" style={{ backgroundColor: '#FEE2E2' }}>{formError}</div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Estado</label>
                <select value={editForm.estado ?? ''} onChange={(e) => setEditForm({ ...editForm, estado: e.target.value as any })}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#457B9D] bg-white">
                  {['pendiente','confirmada','completada','cancelada'].map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Fecha y hora</label>
                <input type="datetime-local" value={editForm.fecha_hora ?? ''} onChange={(e) => setEditForm({ ...editForm, fecha_hora: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#457B9D]" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setEditAppt(null)}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white rounded-lg transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: '#457B9D' }}>
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  </>
  );
}
