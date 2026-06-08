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
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal, { ModalActions } from '@/components/ui/Modal';

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
        <div className="spinner-namay" />
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

  const filterLabels: Record<string, string> = {
    todos: 'Todos', pendiente: 'Pendiente', confirmada: 'Confirmada',
    completada: 'Completada', cancelada: 'Cancelada',
  };

  return (
    <>
    <div className="space-y-6">
      <PageHeader
        eyebrow="Panel · Gestión de Citas"
        title="Citas Médicas"
        subtitle="Gestiona y programa las citas de los pacientes."
        action={
          <button
            onClick={() => { setForm(emptyApptForm); setFormError(''); setShowNew(true); }}
            className="btn-primary"
          >
            <PlusIcon className="h-4 w-4" />
            Nueva Cita
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Citas',  value: stats.total,       color: '#1D3557' },
          { label: 'Citas Hoy',    value: stats.hoy,         color: '#457B9D' },
          { label: 'Pendientes',   value: stats.pendientes,  color: '#F59E0B' },
          { label: 'Completadas',  value: stats.completadas, color: '#16A34A' },
        ].map((s) => (
          <div key={s.label} className="card-base p-4">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.1em]">{s.label}</p>
            <p className="text-3xl font-bold mt-1.5 text-namay-navy tabular" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card-base overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar cita, paciente o doctor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-search"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['todos', 'pendiente', 'confirmada', 'completada', 'cancelada'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-btn capitalize transition-all duration-150 ${
                  filter === f
                    ? 'bg-namay-navy text-white shadow-card'
                    : 'text-gray-500 bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {filterLabels[f]}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-namay-cream">
                <th className="table-header">Paciente</th>
                <th className="table-header">Doctor</th>
                <th className="table-header">Servicio</th>
                <th className="table-header">Fecha</th>
                <th className="table-header">Estado</th>
                <th className="table-header">Acciones</th>
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
                filtered.map((apt) => (
                  <tr key={apt.id} className="hover:bg-namay-cream/50 transition-colors">
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold bg-namay-steel">
                          {apt.paciente_nombre?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-namay-navy">{apt.paciente_nombre}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <UserIcon className="h-3.5 w-3.5 text-gray-400" />
                        {apt.doctor_nombre}
                      </div>
                    </td>
                    <td className="table-cell text-sm text-gray-600">{apt.servicio}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <CalendarIcon className="h-3.5 w-3.5 text-gray-400" />
                        {new Date(apt.fecha_hora).toLocaleDateString('es-PE', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </div>
                    </td>
                    <td className="table-cell">
                      <StatusBadge status={apt.estado} kind="appointment" />
                    </td>
                    <td className="table-cell">
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setEditAppt(apt); setEditForm({ estado: apt.estado, fecha_hora: apt.fecha_hora, paciente_id: apt.paciente_id, doctor_id: apt.doctor_id }); setFormError(''); }}
                          className="btn-steel"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setViewAppt(apt)}
                          className="btn-ghost"
                        >
                          Ver
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Mostrando <span className="font-semibold text-namay-navy">{filtered.length}</span> de {appointments.length} citas
            </p>
          </div>
        )}
      </div>
    </div>

    {/* ── MODAL: NUEVA CITA ── */}
    <Modal
      open={showNew}
      onClose={() => setShowNew(false)}
      title="Nueva Cita"
      icon={<PlusIcon className="h-5 w-5 text-white" />}
      size="lg"
      footer={
        <ModalActions
          onCancel={() => setShowNew(false)}
          onConfirm={() => document.getElementById('new-appt-form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))}
          confirmLabel={saving ? 'Guardando...' : 'Crear Cita'}
          loading={saving}
        />
      }
    >
      <form id="new-appt-form" onSubmit={handleCreateAppt} className="space-y-4">
        {formError && (
          <div className="p-3 rounded-btn text-sm font-medium bg-danger-50 text-danger-600 border border-danger-100">
            {formError}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label-base">Paciente <span className="text-namay-coral">*</span></label>
            <select value={form.paciente_id} onChange={(e) => setForm({ ...form, paciente_id: e.target.value })}
              className="input-base bg-white" required>
              <option value="">Seleccionar paciente...</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="label-base">Odontólogo</label>
            <select value={form.doctor_id} onChange={(e) => setForm({ ...form, doctor_id: e.target.value })}
              className="input-base bg-white">
              <option value="">Sin asignar</option>
              {doctors.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="label-base">Estado</label>
            <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value as Appointment['estado'] })}
              className="input-base bg-white">
              {['programada','pendiente','confirmada','completada','cancelada'].map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-base">Fecha y hora <span className="text-namay-coral">*</span></label>
            <input type="datetime-local" value={form.fecha_hora} onChange={(e) => setForm({ ...form, fecha_hora: e.target.value })}
              className="input-base" required />
          </div>
        </div>
      </form>
    </Modal>

    {/* ── MODAL: VER CITA ── */}
    <Modal
      open={!!viewAppt}
      onClose={() => setViewAppt(null)}
      title="Detalle de Cita"
      variant="info"
      icon={<CalendarIcon className="h-5 w-5 text-white" />}
      footer={
        <button onClick={() => setViewAppt(null)} className="btn-cancel w-full">
          Cerrar
        </button>
      }
    >
      {viewAppt && (
        <div className="space-y-3">
          {[
            { label: 'Paciente',  value: viewAppt.paciente_nombre },
            { label: 'Doctor',    value: viewAppt.doctor_nombre || '—' },
            { label: 'Servicio',  value: viewAppt.servicio || '—' },
            { label: 'Fecha',     value: new Date(viewAppt.fecha_hora).toLocaleString('es-PE', { dateStyle: 'long', timeStyle: 'short' }) },
            { label: 'Estado',    value: viewAppt.estado?.toUpperCase() },
            { label: 'Notas',     value: viewAppt.notas || 'Sin notas' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-start gap-3 p-3 rounded-btn bg-namay-cream/60">
              <DocumentTextIcon className="h-4 w-4 mt-0.5 flex-shrink-0 text-namay-steel" />
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 uppercase tracking-[0.1em] font-semibold">{label}</p>
                <p className="text-sm font-medium mt-0.5 text-namay-navy">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>

    {/* ── MODAL: EDITAR CITA ── */}
    <Modal
      open={!!editAppt}
      onClose={() => setEditAppt(null)}
      title="Editar Cita"
      subtitle={editAppt?.paciente_nombre}
      icon={<ClockIcon className="h-5 w-5 text-white" />}
      footer={
        <ModalActions
          onCancel={() => setEditAppt(null)}
          onConfirm={() => document.getElementById('edit-appt-form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))}
          confirmLabel={saving ? 'Guardando...' : 'Guardar Cambios'}
          loading={saving}
        />
      }
    >
      <form id="edit-appt-form" onSubmit={handleSaveEdit} className="space-y-4">
        {formError && (
          <div className="p-3 rounded-btn text-sm font-medium bg-danger-50 text-danger-600 border border-danger-100">
            {formError}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label-base">Estado</label>
            <select value={editForm.estado ?? ''} onChange={(e) => setEditForm({ ...editForm, estado: e.target.value as any })}
              className="input-base bg-white">
              {['pendiente','confirmada','completada','cancelada'].map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-base">Fecha y hora</label>
            <input type="datetime-local" value={editForm.fecha_hora ?? ''} onChange={(e) => setEditForm({ ...editForm, fecha_hora: e.target.value })}
              className="input-base" />
          </div>
        </div>
      </form>
    </Modal>
  </>
  );
}
