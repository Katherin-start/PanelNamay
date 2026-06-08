'use client';

import { useEffect, useState } from 'react';
import { User } from '@/types';
import { apiClient } from '@/lib/api';
import {
  UserPlusIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal, { ModalActions } from '@/components/ui/Modal';
import { getInitials } from '@/lib/utils';

interface UserForm { nombre: string; email: string; password: string; rol: string; }
const emptyUserForm: UserForm = { nombre: '', email: '', password: '', rol: 'recepcionista' };

export default function UsersPage() {
  const [users, setUsers]       = useState<User[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [saving, setSaving]     = useState(false);
  const [formError, setFormError] = useState('');
  const [showNew, setShowNew]   = useState(false);
  const [form, setForm]         = useState<UserForm>(emptyUserForm);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<Partial<User>>({});

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await apiClient.getUsers();
        setUsers(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error al cargar usuarios:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.email.trim() || !form.password.trim()) { setFormError('Nombre, email y contraseña son obligatorios.'); return; }
    setSaving(true); setFormError('');
    try {
      const created = await apiClient.createUser(form);
      const newUser = created?.user ?? created;
      setUsers((prev) => [newUser, ...prev]);
      setShowNew(false); setForm(emptyUserForm);
    } catch (err: any) { setFormError(err.message ?? 'Error al crear el usuario.'); }
    finally { setSaving(false); }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setSaving(true); setFormError('');
    try {
      const updated = await apiClient.updateUser(editUser.id, editForm);
      setUsers((prev) => prev.map((u) => u.id === editUser.id ? { ...u, ...editForm, ...(updated?.usuario ?? {}) } : u));
      setEditUser(null);
    } catch (err: any) { setFormError(err.message ?? 'Error al actualizar.'); }
    finally { setSaving(false); }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este usuario?')) return;
    try {
      await apiClient.deleteUser(id);
      setUsers(users.filter((u) => u.id !== id));
      setFormError('');
    } catch (error: any) {
      console.error('Error al eliminar usuario:', error);
      setFormError(error.message ?? 'Error al eliminar el usuario.');
    }
  };

  const staffUsers = users.filter((u) => !/(paciente|cliente)/i.test(u.rol));

  const filtered = staffUsers.filter(
    (u) =>
      (u.nombre ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const totalActivos = staffUsers.filter((u) => u.activo).length;
  const totalInactivos = staffUsers.filter((u) => !u.activo).length;
  const totalAdmins = staffUsers.filter((u) => u.rol === 'admin' || u.rol === 'ADMINISTRADOR').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="spinner-namay" />
      </div>
    );
  }

  const stats = [
    { label: 'Total Usuarios',    value: users.length,    color: '#1D3557', light: '#EFF6FF' },
    { label: 'Activos',           value: totalActivos,    color: '#16A34A', light: '#F0FDF4' },
    { label: 'Inactivos',         value: totalInactivos,  color: '#DC2626', light: '#FEF2F2' },
    { label: 'Administradores',   value: totalAdmins,     color: '#7C3AED', light: '#EDE9FE' },
  ];

  return (
    <>
    <div className="space-y-6">
      <PageHeader
        eyebrow="Panel · Usuarios"
        title="Gestión de Usuarios"
        subtitle="Administra los usuarios y roles del sistema."
        action={
          <button
            onClick={() => { setForm(emptyUserForm); setFormError(''); setShowNew(true); }}
            className="btn-primary"
          >
            <UserPlusIcon className="h-4 w-4" />
            Nuevo Usuario
          </button>
        }
      />

      {formError && (
        <div className="p-3 rounded-btn text-sm font-medium bg-danger-50 text-danger-600 border border-danger-100">
          {formError}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card-base p-4">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5"
              style={{ backgroundColor: s.light }}
            >
              <ShieldCheckIcon className="h-4 w-4" style={{ color: s.color }} />
            </div>
            <p className="text-xl font-bold text-namay-navy tabular" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="card-base p-4">
        <div className="relative max-w-xs">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email..."
            className="input-search"
          />
        </div>
      </div>

      {/* Table */}
      <div className="card-base overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-namay-cream">
                <th className="table-header">Usuario</th>
                <th className="table-header">Rol</th>
                <th className="table-header">Estado</th>
                <th className="table-header">Último Acceso</th>
                <th className="table-header">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-gray-400">
                    No se encontraron usuarios
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-namay-cream/50 transition-colors">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        {user.foto_perfil ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={user.foto_perfil}
                            alt={user.nombre ?? 'Foto de usuario'}
                            className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 bg-namay-navy">
                            {getInitials(user.nombre ?? '?')}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-namay-navy">{user.nombre ?? 'Sin nombre'}</p>
                          <p className="text-xs text-gray-400">{user.email ?? ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <StatusBadge status={user.rol} kind="role" />
                    </td>
                    <td className="table-cell">
                      <StatusBadge
                        status={user.activo ? 'activo' : 'inactivo'}
                        kind="patient"
                        showDot
                      />
                    </td>
                    <td className="table-cell text-gray-500 text-xs">
                      {user.ultimo_acceso
                        ? new Date(user.ultimo_acceso).toLocaleDateString('es-PE', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setEditUser(user); setEditForm({ nombre: user.nombre, email: user.email, rol: user.rol }); setFormError(''); }}
                          className="p-1.5 rounded-btn hover:bg-info-50 text-namay-steel transition-colors"
                          title="Editar"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-1.5 rounded-btn hover:bg-danger-50 text-danger-500 transition-colors"
                          title="Eliminar"
                        >
                          <TrashIcon className="h-4 w-4" />
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
              Mostrando <span className="font-semibold text-namay-navy">{filtered.length}</span> de {staffUsers.length} usuarios
            </p>
          </div>
        )}
      </div>
    </div>

    {/* ── MODAL: NUEVO USUARIO ── */}
    <Modal
      open={showNew}
      onClose={() => setShowNew(false)}
      title="Nuevo Usuario"
      icon={<UserPlusIcon className="h-5 w-5 text-white" />}
      footer={
        <ModalActions
          onCancel={() => setShowNew(false)}
          onConfirm={() => document.getElementById('new-user-form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))}
          confirmLabel={saving ? 'Creando...' : 'Crear Usuario'}
          loading={saving}
        />
      }
    >
      <form id="new-user-form" onSubmit={handleCreateUser} className="space-y-4">
        {formError && (
          <div className="p-3 rounded-btn text-sm font-medium bg-danger-50 text-danger-600 border border-danger-100">
            {formError}
          </div>
        )}
        <div>
          <label className="label-base">Nombre completo <span className="text-namay-coral">*</span></label>
          <input type="text" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            placeholder="Ej. Dr. Juan Pérez" required className="input-base" />
        </div>
        <div>
          <label className="label-base">Email <span className="text-namay-coral">*</span></label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="usuario@dental.com" required className="input-base" />
        </div>
        <div>
          <label className="label-base">Contraseña <span className="text-namay-coral">*</span></label>
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Mínimo 8 caracteres" required className="input-base" />
        </div>
        <div>
          <label className="label-base">Rol</label>
          <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}
            className="input-base bg-white">
            {[['ADMINISTRADOR','Administrador'],['ODONTOLOGO','Odontólogo'],['RECEPCIONISTA','Recepcionista'],['CAJERO','Cajero'],['PRACTICANTE','Practicante']].map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      </form>
    </Modal>

    {/* ── MODAL: EDITAR USUARIO ── */}
    <Modal
      open={!!editUser}
      onClose={() => setEditUser(null)}
      title="Editar Usuario"
      subtitle={editUser?.email}
      icon={<PencilSquareIcon className="h-5 w-5 text-white" />}
      variant="info"
      footer={
        <ModalActions
          onCancel={() => setEditUser(null)}
          onConfirm={() => document.getElementById('edit-user-form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))}
          confirmLabel={saving ? 'Guardando...' : 'Guardar Cambios'}
          loading={saving}
        />
      }
    >
      <form id="edit-user-form" onSubmit={handleSaveEdit} className="space-y-4">
        {formError && (
          <div className="p-3 rounded-btn text-sm font-medium bg-danger-50 text-danger-600 border border-danger-100">
            {formError}
          </div>
        )}
        <div>
          <label className="label-base">Nombre completo</label>
          <input type="text" value={editForm.nombre ?? ''} onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
            className="input-base" />
        </div>
        <div>
          <label className="label-base">Email</label>
          <input type="email" value={editForm.email ?? ''} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
            className="input-base" />
        </div>
        <div>
          <label className="label-base">Rol</label>
          <select value={editForm.rol ?? ''} onChange={(e) => setEditForm({ ...editForm, rol: e.target.value as any })}
            className="input-base bg-white">
            {[['ADMINISTRADOR','Administrador'],['ODONTOLOGO','Odontólogo'],['RECEPCIONISTA','Recepcionista'],['CAJERO','Cajero'],['PRACTICANTE','Practicante']].map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      </form>
    </Modal>
  </>
  );
}
