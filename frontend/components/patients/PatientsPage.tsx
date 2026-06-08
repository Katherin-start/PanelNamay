'use client';

import { useEffect, useState } from 'react';
import { Patient, User } from '@/types';
import { apiClient } from '@/lib/api';
import {
  MagnifyingGlassIcon,
  UserPlusIcon,
  CalendarIcon,
  ClockIcon,
  FunnelIcon,
  EnvelopeIcon,
  PhoneIcon,
  IdentificationIcon,
  TrashIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal, { ModalActions } from '@/components/ui/Modal';
import { getInitials } from '@/lib/utils';

interface PatientForm {
  nombre: string; dni: string; telefono: string;
  fecha_nacimiento: string; genero: string; direccion: string;
}
const emptyForm: PatientForm = { nombre: '', dni: '', telefono: '', fecha_nacimiento: '', genero: '', direccion: '' };

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
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [deletingPatient, setDeletingPatient] = useState(false);

  useEffect(() => {
    const fetchPatientUsers = async () => {
      try {
        const data = await apiClient.getUsers();
        const users = Array.isArray(data) ? data : [];
        const patientUsers = users.filter((u: User) => /paciente|cliente/i.test(u.rol));

        if (patientUsers.length > 0) {
          setPatients(
            patientUsers.map((u: User) => ({
              id: u.id,
              nombre: u.nombre,
              email: u.email ?? '',
              dni: u.dni ?? '',
              telefono: u.telefono ?? '',
              creado_en: u.creado_en ?? new Date().toISOString(),
              estado: u.activo ? 'activo' : 'inactivo',
              foto_perfil: u.foto_perfil,
            }))
          );
          return;
        }

        const fallback = await apiClient.getPatients();
        setPatients(Array.isArray(fallback) ? fallback : []);
      } catch (error) {
        console.error('Error al cargar pacientes:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPatientUsers();
  }, []);

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) { setFormError('El nombre es obligatorio.'); return; }
    setSaving(true); setFormError('');
    try {
      const created = await apiClient.createPatient(form);
      setPatients((prev) => [created?.paciente ?? created, ...prev]);
      setShowAdd(false); setForm(emptyForm);
    } catch (err: any) {
      setFormError(err.message ?? 'Error al guardar el paciente.');
    } finally { setSaving(false); }
  };

  const handleDeletePatient = async () => {
    if (!patientToDelete?.id) return;
    setDeletingPatient(true);
    try {
      await apiClient.deletePatient(patientToDelete.id);
      setPatients((prev) => prev.filter((p) => p.id !== patientToDelete.id));
      setPatientToDelete(null);
      setFormError('');
    } catch (err: any) {
      const errorMsg = err.message ?? 'Error desconocido';
      console.error('Error al eliminar paciente:', err);

      let userMessage = `Error al eliminar paciente: ${errorMsg}`;
      if (errorMsg.includes('DELETE_ERROR_RELATED')) {
        userMessage = 'El paciente tiene datos relacionados (citas, tratamientos, etc.). Se han eliminado todos los registros asociados. Si el problema persiste, intente nuevamente.';
      } else if (errorMsg.includes('PATIENT_NOT_FOUND')) {
        userMessage = 'El paciente no fue encontrado.';
      }
      setFormError(userMessage);
    } finally { setDeletingPatient(false); }
  };

  const filtered = patients.filter(
    (p) =>
      (p.nombre ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (p.dni ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (p.telefono ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="spinner-namay" />
      </div>
    );
  }

  const newThisMonth = patients.filter((p) => {
    const d = new Date(p.creado_en);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Gestión clínica"
        title="Directorio de pacientes"
        subtitle="Administra y monitorea los pacientes registrados en la clínica."
        action={
          <button
            onClick={() => { setForm(emptyForm); setFormError(''); setShowAdd(true); }}
            className="btn-primary"
          >
            <UserPlusIcon className="h-4 w-4" />
            Agregar paciente
          </button>
        }
      />

      {/* Stats cards — hairline grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-gray-100">
        <div className="bg-white p-6">
          <p className="eyebrow">Activos este mes</p>
          <p className="mt-3 text-3xl font-medium text-namay-navy tabular">
            {patients.filter((p) => p.estado === 'activo').length}
          </p>
          <p className="text-xs mt-1.5 text-namay-steel/60 font-medium">+12.5% del mes pasado</p>
        </div>
        <div className="bg-white p-6">
          <p className="eyebrow">Próximas citas</p>
          <p className="mt-3 text-3xl font-medium text-namay-navy tabular">24</p>
          <div className="flex gap-1 mt-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-6 h-6 rounded-full border-2 border-white bg-namay-steel"
                style={{ opacity: 0.6 + i * 0.1 }}
              />
            ))}
            <div className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-semibold bg-namay-cream text-namay-steel">
              +21
            </div>
          </div>
        </div>
        <div className="bg-white p-6">
          <p className="eyebrow">Nuevos registros</p>
          <p className="mt-3 text-3xl font-medium text-namay-coral tabular">
            {String(newThisMonth).padStart(2, '0')}
          </p>
          <div className="mt-3">
            <div className="h-1 rounded-full bg-namay-cream overflow-hidden">
              <div
                className="h-full rounded-full bg-namay-coral transition-all duration-500"
                style={{ width: `${Math.min((newThisMonth / 12) * 100, 100)}%` }}
              />
            </div>
            <p className="text-[11px] mt-1.5 text-namay-steel/60 font-medium">Meta diaria: 12</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlassIcon className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
            <input
              type="text"
              placeholder="Buscar paciente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-search"
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-namay-steel/70 border-b border-transparent hover:text-namay-coral hover:border-namay-coral transition-colors">
            <FunnelIcon className="h-3.5 w-3.5" />
            Filtrar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Paciente</th>
                <th className="table-header">Correo electrónico</th>
                <th className="table-header">Registro</th>
                <th className="table-header">Estado</th>
                <th className="table-header text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-14 text-sm text-namay-steel/40 font-medium">
                    No se encontraron pacientes
                  </td>
                </tr>
              ) : (
                filtered.map((patient) => (
                  <tr key={patient.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        {patient.foto_perfil ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={patient.foto_perfil}
                            alt={patient.nombre}
                            className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 bg-namay-navy">
                            {getInitials(patient.nombre)}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-namay-navy">{patient.nombre}</p>
                          <p className="text-[11px] text-namay-steel/60 font-medium">DNI: {patient.dni || 'No registrado'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1.5 text-sm text-namay-steel font-medium">
                        <EnvelopeIcon className="h-3.5 w-3.5 text-namay-steel/40" />
                        {patient.email || '—'}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1.5 text-sm text-namay-steel font-medium tabular">
                        <ClockIcon className="h-3.5 w-3.5 text-namay-steel/40" />
                        {new Date(patient.creado_en).toLocaleDateString('es-PE', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}
                      </div>
                    </td>
                    <td className="table-cell">
                      <StatusBadge status={patient.estado} kind="patient" showDot />
                    </td>
                    <td className="table-cell">
                      <div className="flex gap-1.5 justify-end">
                        <button
                          onClick={() => setSelectedPatient(patient)}
                          className="btn-secondary !py-1.5 !text-[11px] !px-3"
                        >
                          Ver expediente
                        </button>
                        <button
                          onClick={() => { setApptPatient(patient); setShowNewAppt(true); }}
                          className="btn-ghost"
                        >
                          + Cita
                        </button>
                        <button
                          onClick={() => setPatientToDelete(patient)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold text-namay-coral border border-namay-coral/30 hover:bg-namay-coral hover:text-white rounded-hair transition-colors"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
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
          <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-[11px] font-medium text-namay-steel/60 uppercase tracking-[0.15em] tabular">
              Mostrando <span className="text-namay-navy font-semibold">{filtered.length}</span> de {patients.length} pacientes
            </p>
          </div>
        )}
      </div>

      {/* ── MODAL: AGREGAR PACIENTE ── */}
      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Nuevo paciente"
        icon={<UserPlusIcon className="h-4 w-4 text-namay-navy" />}
        size="lg"
        footer={
          <ModalActions
            onCancel={() => setShowAdd(false)}
            onConfirm={() => document.getElementById('patient-form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))}
            confirmLabel={saving ? 'Registrando...' : 'Registrar paciente'}
            loading={saving}
          />
        }
      >
        <form id="patient-form" onSubmit={handleAddPatient} className="space-y-5">
          {formError && (
            <div className="p-3 text-sm font-medium text-danger-700 bg-danger-50 border-l-2 border-danger-500">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label className="label-base">
                Nombre completo <span className="text-namay-coral">*</span>
              </label>
              <input type="text" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej. Juan Pérez García"
                className="input-underline" required />
            </div>
            <div>
              <label className="label-base">DNI</label>
              <input type="text" value={form.dni} onChange={(e) => setForm({ ...form, dni: e.target.value })}
                placeholder="12345678"
                className="input-underline" />
            </div>
            <div>
              <label className="label-base">Teléfono</label>
              <input type="tel" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                placeholder="999 999 999"
                className="input-underline" />
            </div>
            <div>
              <label className="label-base">Fecha de nacimiento</label>
              <input type="date" value={form.fecha_nacimiento} onChange={(e) => setForm({ ...form, fecha_nacimiento: e.target.value })}
                className="input-underline" />
            </div>
            <div>
              <label className="label-base">Género</label>
              <select value={form.genero} onChange={(e) => setForm({ ...form, genero: e.target.value })}
                className="input-underline bg-white">
                <option value="">Seleccionar...</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label-base">Dirección</label>
              <input type="text" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                placeholder="Av. Ejemplo 123, Lima"
                className="input-underline" />
            </div>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: VER EXPEDIENTE ── */}
      <Modal
        open={!!selectedPatient}
        onClose={() => setSelectedPatient(null)}
        title={selectedPatient?.nombre ?? ''}
        subtitle={selectedPatient?.id ? `ID #DN-${selectedPatient.id.toString().slice(-4).toUpperCase()}` : ''}
        icon={
          <div className="w-full h-full flex items-center justify-center text-white text-sm font-semibold bg-namay-navy">
            {selectedPatient ? getInitials(selectedPatient.nombre) : ''}
          </div>
        }
        footer={
          <div className="flex gap-3">
            <button
              onClick={() => { if (selectedPatient) { setApptPatient(selectedPatient); setSelectedPatient(null); setShowNewAppt(true); } }}
              className="btn-primary flex-1"
            >
              <CalendarIcon className="h-4 w-4" /> Nueva cita
            </button>
            <button onClick={() => setSelectedPatient(null)} className="btn-cancel flex-1">
              Cerrar
            </button>
          </div>
        }
      >
        {selectedPatient && (
          <div className="space-y-2">
            {selectedPatient.estado && (
              <div className="flex justify-center pb-2">
                <StatusBadge status={selectedPatient.estado} kind="patient" showDot />
              </div>
            )}
            {[
              { icon: IdentificationIcon, label: 'DNI', value: selectedPatient.dni || 'No registrado' },
              { icon: PhoneIcon,          label: 'Teléfono', value: selectedPatient.telefono || 'No registrado' },
              { icon: CalendarIcon,       label: 'Fecha de nacimiento',
                value: selectedPatient.fecha_nacimiento
                  ? new Date(selectedPatient.fecha_nacimiento).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })
                  : 'No registrada' },
              { icon: ClockIcon,          label: 'Registrado el',
                value: new Date(selectedPatient.creado_en).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' }) },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
                <Icon className="h-4 w-4 mt-0.5 flex-shrink-0 text-namay-steel/60" strokeWidth={1.5} />
                <div>
                  <p className="text-[10px] font-semibold text-namay-steel/60 uppercase tracking-[0.2em]">{label}</p>
                  <p className="text-sm font-medium text-namay-navy mt-1">{value}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* ── MODAL: NUEVA CITA (info) ── */}
      <Modal
        open={showNewAppt}
        onClose={() => setShowNewAppt(false)}
        title="Nueva cita"
        subtitle={apptPatient ? `Para: ${apptPatient.nombre}` : undefined}
        icon={<CalendarIcon className="h-4 w-4 text-namay-navy" />}
        variant="info"
        size="sm"
        footer={
          <button onClick={() => setShowNewAppt(false)} className="btn-cancel w-full">
            Cerrar
          </button>
        }
      >
        <div className="p-5 text-center border border-gray-100">
          <IdentificationIcon className="h-8 w-8 mx-auto mb-3 text-namay-steel/60" strokeWidth={1.5} />
          <p className="text-sm font-medium text-namay-navy">
            Para crear una cita completa ve al módulo de{' '}
            <a href="/citas" className="font-semibold text-namay-coral hover:underline">Gestión de citas</a>.
          </p>
          {apptPatient && <p className="text-xs text-namay-steel/60 font-medium mt-2">Paciente: <strong className="text-namay-navy">{apptPatient.nombre}</strong></p>}
        </div>
      </Modal>

      {/* ── MODAL: CONFIRMAR ELIMINACIÓN ── */}
      <Modal
        open={!!patientToDelete}
        onClose={() => setPatientToDelete(null)}
        title="Eliminar paciente"
        variant="danger"
        size="sm"
        icon={<TrashIcon className="h-4 w-4 text-white" />}
        footer={
          <div className="flex gap-3">
            <button onClick={() => setPatientToDelete(null)} className="btn-cancel flex-1">
              Cancelar
            </button>
            <button
              onClick={handleDeletePatient}
              disabled={deletingPatient}
              className="btn-primary flex-1"
            >
              <TrashIcon className="h-4 w-4" />
              {deletingPatient ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        }
      >
        <div className="p-5 text-center bg-danger-50 border-l-2 border-danger-500">
          <p className="text-sm font-semibold text-namay-navy">
            ¿Está seguro de que desea eliminar a <strong>{patientToDelete?.nombre}</strong>?
          </p>
          <p className="text-xs text-namay-steel font-medium mt-2">
            Esta acción no se puede deshacer. Se eliminará todo el registro del paciente.
          </p>
        </div>
      </Modal>
    </div>
  );
}
