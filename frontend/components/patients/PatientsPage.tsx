'use client';

import { useEffect, useState } from 'react';
import { Patient } from '@/types';
import { apiClient } from '@/lib/api';
import {
  MagnifyingGlassIcon,
  UserPlusIcon,
  CalendarIcon,
  ClockIcon,
  FunnelIcon,
  XMarkIcon,
  PhoneIcon,
  EnvelopeIcon,
  IdentificationIcon,
} from '@heroicons/react/24/outline';

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  activo:   { bg: '#DCFCE7', text: '#16A34A', label: 'ACTIVO' },
  inactivo: { bg: '#FEE2E2', text: '#DC2626', label: 'INACTIVO' },
};

interface PatientForm {
  nombre: string; email: string; telefono: string;
  fecha_nacimiento: string; genero: string; direccion: string;
}
const emptyForm: PatientForm = { nombre: '', email: '', telefono: '', fecha_nacimiento: '', genero: '', direccion: '' };

export default function PatientsPage() {
  const [patients, setPatients]     = useState<Patient[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState('');
  const [showAdd, setShowAdd]       = useState(false);
  const [form, setForm]             = useState<PatientForm>(emptyForm);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showNewAppt, setShowNewAppt]         = useState(false);
  const [apptPatient, setApptPatient]         = useState<Patient | null>(null);

  useEffect(() => {
    apiClient.getPatients()
      .then((data) => setPatients(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.email.trim()) { setFormError('Nombre y email son obligatorios.'); return; }
    setSaving(true); setFormError('');
    try {
      const created = await apiClient.createPatient(form);
      setPatients((prev) => [created?.paciente ?? created, ...prev]);
      setShowAdd(false); setForm(emptyForm);
    } catch (err: any) {
      setFormError(err.message ?? 'Error al guardar el paciente.');
    } finally { setSaving(false); }
  };

  const filtered = patients.filter(
    (p) =>
      (p.nombre ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (p.email ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#457B9D] border-t-[#E63946]" />
      </div>
    );
  }

  const initials = (name: string) =>
    (name ?? '').split(' ').filter(Boolean).map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?';

  const newThisMonth = patients.filter((p) => {
    const d = new Date(p.creado_en);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: '#457B9D' }}>
            Panel · Gestión de Pacientes
          </p>
          <h1 className="text-2xl font-bold mt-0.5" style={{ color: '#1D3557' }}>
            Directorio de Pacientes
          </h1>
          <p className="text-sm mt-1 text-gray-500">
            Administra y monitorea los pacientes registrados en la clínica.
          </p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setFormError(''); setShowAdd(true); }}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-lg transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#1D3557' }}
        >
          <UserPlusIcon className="h-4 w-4" />
          Agregar Paciente
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl p-5 text-white" style={{ backgroundColor: '#1D3557' }}>
          <p className="text-xs font-medium text-white/70 uppercase tracking-wide">Activos este Mes</p>
          <p className="text-4xl font-bold mt-2">{patients.filter((p) => p.estado === 'activo').length}</p>
          <p className="text-xs text-white/60 mt-1">↑ +12.5% del mes pasado</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: '#457B9D' }}>
            Próximas Citas
          </p>
          <p className="text-4xl font-bold mt-2" style={{ color: '#1D3557' }}>24</p>
          <div className="flex gap-1 mt-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-6 h-6 rounded-full border-2 border-white"
                style={{ backgroundColor: '#457B9D', opacity: 0.6 + i * 0.1 }}
              />
            ))}
            <div
              className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-xs font-semibold"
              style={{ backgroundColor: '#F1F4F9', color: '#457B9D' }}
            >
              +21
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: '#457B9D' }}>
            Nuevos Registros
          </p>
          <p className="text-4xl font-bold mt-2" style={{ color: '#1D3557' }}>
            {String(newThisMonth).padStart(2, '0')}
          </p>
          <div className="mt-2">
            <div className="h-1.5 rounded-full" style={{ backgroundColor: '#F1F4F9' }}>
              <div
                className="h-1.5 rounded-full"
                style={{ backgroundColor: '#E63946', width: `${Math.min((newThisMonth / 12) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs mt-1 text-gray-400">Meta diaria: 12</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar paciente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#457B9D]"
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            <FunnelIcon className="h-4 w-4" />
            Filtrar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: '#F1F4F9' }}>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Paciente</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Teléfono</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Registro</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400 text-sm">
                    No se encontraron pacientes
                  </td>
                </tr>
              ) : (
                filtered.map((patient) => {
                  const s = statusColors[patient.estado] || statusColors.inactivo;
                  return (
                    <tr key={patient.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                            style={{ backgroundColor: '#457B9D' }}
                          >
                            {initials(patient.nombre)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold" style={{ color: '#1D3557' }}>
                              {patient.nombre}
                            </p>
                            <p className="text-xs text-gray-400">{patient.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <PhoneIcon className="h-3.5 w-3.5 text-gray-400" />
                          {patient.telefono || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <ClockIcon className="h-3.5 w-3.5 text-gray-400" />
                          {new Date(patient.creado_en).toLocaleDateString('es-PE', {
                            month: 'short', day: 'numeric', year: 'numeric',
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
                            onClick={() => setSelectedPatient(patient)}
                            className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition-opacity hover:opacity-90"
                            style={{ backgroundColor: '#1D3557' }}
                          >
                            Ver Expediente
                          </button>
                          <button
                            onClick={() => { setApptPatient(patient); setShowNewAppt(true); }}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors hover:bg-blue-50"
                            style={{ color: '#457B9D', borderColor: '#457B9D' }}
                          >
                            + Cita
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
            Mostrando {filtered.length} de {patients.length} pacientes
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

      {/* Floating button */}
      <div className="fixed bottom-6 right-6">
        <button
          onClick={() => { setForm(emptyForm); setFormError(''); setShowAdd(true); }}
          className="flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white rounded-full shadow-lg transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#E63946' }}
        >
          <UserPlusIcon className="h-4 w-4" />
          Nuevo Paciente
        </button>
      </div>

      {/* ── MODAL: AGREGAR PACIENTE ── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(29,53,87,0.55)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#1D3557' }}>
                  <UserPlusIcon className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-lg font-bold" style={{ color: '#1D3557' }}>Nuevo Paciente</h2>
              </div>
              <button onClick={() => setShowAdd(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <XMarkIcon className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleAddPatient} className="px-6 py-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg text-sm font-medium text-red-700" style={{ backgroundColor: '#FEE2E2' }}>
                  {formError}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                    Nombre completo <span className="text-red-500">*</span>
                  </label>
                  <input type="text" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    placeholder="Ej. Juan Pérez García"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#457B9D]" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="paciente@email.com"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#457B9D]" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Teléfono</label>
                  <input type="tel" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    placeholder="999 999 999"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#457B9D]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Fecha de Nacimiento</label>
                  <input type="date" value={form.fecha_nacimiento} onChange={(e) => setForm({ ...form, fecha_nacimiento: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#457B9D]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Género</label>
                  <select value={form.genero} onChange={(e) => setForm({ ...form, genero: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#457B9D] bg-white">
                    <option value="">Seleccionar...</option>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Dirección</label>
                  <input type="text" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                    placeholder="Av. Ejemplo 123, Lima"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#457B9D]" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-white rounded-lg transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ backgroundColor: '#1D3557' }}>
                  {saving ? 'Guardando...' : 'Registrar Paciente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: VER EXPEDIENTE ── */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(29,53,87,0.55)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-6 flex items-center gap-4" style={{ backgroundColor: '#1D3557' }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white flex-shrink-0"
                style={{ backgroundColor: '#457B9D' }}>
                {selectedPatient.nombre.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-white truncate">{selectedPatient.nombre}</h2>
                <p className="text-sm text-white/60">ID: #DN-{selectedPatient.id.toString().slice(-4).toUpperCase()}</p>
                <span className="inline-block mt-1 px-2.5 py-0.5 text-xs font-semibold rounded-full"
                  style={selectedPatient.estado === 'activo' ? { backgroundColor: '#DCFCE7', color: '#16A34A' } : { backgroundColor: '#FEE2E2', color: '#DC2626' }}>
                  {selectedPatient.estado?.toUpperCase()}
                </span>
              </div>
              <button onClick={() => setSelectedPatient(null)}
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-3">
              {[
                { icon: EnvelopeIcon,  label: 'Email',              value: selectedPatient.email },
                { icon: PhoneIcon,     label: 'Teléfono',           value: selectedPatient.telefono || 'No registrado' },
                { icon: CalendarIcon,  label: 'Fecha de nacimiento',
                  value: selectedPatient.fecha_nacimiento
                    ? new Date(selectedPatient.fecha_nacimiento).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })
                    : 'No registrada' },
                { icon: ClockIcon,     label: 'Registrado el',
                  value: new Date(selectedPatient.creado_en).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' }) },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: '#F1F4F9' }}>
                  <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: '#457B9D' }} />
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">{label}</p>
                    <p className="text-sm font-medium mt-0.5" style={{ color: '#1D3557' }}>{value}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 pb-5 flex gap-3">
              <button onClick={() => { setApptPatient(selectedPatient); setSelectedPatient(null); setShowNewAppt(true); }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-lg hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#E63946' }}>
                <CalendarIcon className="h-4 w-4" /> Nueva Cita
              </button>
              <button onClick={() => setSelectedPatient(null)}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: NUEVA CITA ── */}
      {showNewAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(29,53,87,0.55)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#E63946' }}>
                  <CalendarIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold" style={{ color: '#1D3557' }}>Nueva Cita</h2>
                  {apptPatient && <p className="text-xs text-gray-400">Para: {apptPatient.nombre}</p>}
                </div>
              </div>
              <button onClick={() => setShowNewAppt(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <XMarkIcon className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="p-4 rounded-xl text-center" style={{ backgroundColor: '#F1F4F9' }}>
                <IdentificationIcon className="h-8 w-8 mx-auto mb-2" style={{ color: '#457B9D' }} />
                <p className="text-sm font-medium" style={{ color: '#1D3557' }}>
                  Para crear una cita completa ve al módulo de{' '}
                  <a href="/citas" className="underline font-semibold" style={{ color: '#E63946' }}>Gestión de Citas</a>.
                </p>
                {apptPatient && <p className="text-xs text-gray-500 mt-1">Paciente: <strong>{apptPatient.nombre}</strong></p>}
              </div>
              <button onClick={() => setShowNewAppt(false)}
                className="w-full px-4 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}