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

  return (
    <>
    <div className="space-y-8">
      <PageHeader
        eyebrow="Administración"
        title="Gestión de usuarios"
        subtitle="Administra los usuarios y roles del sistema."
        action={
          <button
            onClick={() => { setForm(emptyUserForm); setFormError(''); setShowNew(true); }}
            className="btn-primary"
          >
            <UserPlusIcon className="h-4 w-4" />
            Nuevo usuario
          </button>
        }
      />

      {formError && (
        <div className="p-3 text-sm font-medium text-danger-700 bg-danger-50 border-l-2 border-danger-500">
          {formError}
        </div>
      )}

      {/* Stats — hairline grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-100 dark:bg-gray-700">
        <div className="bg-white dark:bg-gray-800 p-6">
          <p className="eyebrow">Total usuarios</p>
          <p className="mt-3 text-3xl font-medium text-namay-navy dark:text-gray-100 tabular">{users.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6">
          <p className="eyebrow">Activos</p>
          <p className="mt-3 text-3xl font-medium text-success-600 tabular">{totalActivos}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6">
          <p className="eyebrow">Inactivos</p>
          <p className="mt-3 text-3xl font-medium text-danger-600 tabular">{totalInactivos}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6">
          <p className="eyebrow">Administradores</p>
          <p className="mt-3 text-3xl font-medium text-namay-coral tabular">{totalAdmins}</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-6 py-4">
        <div className="relative max-w-sm">
          <MagnifyingGlassIcon className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 dark:text-gray-600" />
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
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="table-header">Usuario</th>
                <th className="table-header">Rol</th>
                <th className="table-header">Estado</th>
                <th className="table-header">Último acceso</th>
                <th className="table-header text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-14 text-sm text-namay-steel/40 dark:text-gray-500 font-medium">
                    No se encontraron usuarios
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
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
                          <p className="font-semibold text-namay-navy dark:text-gray-100">{user.nombre ?? 'Sin nombre'}</p>
                          <p className="text-[11px] text-namay-steel/60 dark:text-gray-400 font-medium">{user.email ?? ''}</p>
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
                    <td className="table-cell text-[11px] text-namay-steel/60 dark:text-gray-400 font-medium tabular">
                      {user.ultimo_acceso
                        ? new Date(user.ultimo_acceso).toLocaleDateString('es-PE', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => { setEditUser(user); setEditForm({ nombre: user.nombre, email: user.email, rol: user.rol }); setFormError(''); }}
                          className="p-1.5 text-namay-steel/60 dark:text-gray-400 hover:text-namay-coral transition-colors"
                          title="Editar"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-1.5 text-namay-steel/60 dark:text-gray-400 hover:text-danger-500 transition-colors"
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
          <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-700">
            <p className="text-[11px] font-medium text-namay-steel/60 dark:text-gray-400 uppercase tracking-[0.15em] tabular">
              Mostrando <span className="text-namay-navy dark:text-gray-100 font-semibold">{filtered.length}</span> de {staffUsers.length} usuarios
            </p>
          </div>
        )}
      </div>
    </div>

    {/* ── MODAL: NUEVO USUARIO ── */}
    <Modal
      open={showNew}
      onClose={() => setShowNew(false)}
      title="Nuevo usuario"
      icon={<UserPlusIcon className="h-4 w-4 text-namay-navy dark:text-gray-200" />}
      footer={
        <ModalActions
          onCancel={() => setShowNew(false)}
          onConfirm={() => document.getElementById('new-user-form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))}
          confirmLabel={saving ? 'Creando...' : 'Crear usuario'}
          loading={saving}
        />
      }
    >
      <form id="new-user-form" onSubmit={handleCreateUser} className="space-y-5">
        {formError && (
          <div className="p-3 text-sm font-medium text-danger-700 bg-danger-50 border-l-2 border-danger-500">
            {formError}
          </div>
        )}
        <div>
          <label className="label-base">Nombre completo <span className="text-namay-coral">*</span></label>
          <input type="text" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            placeholder="Ej. Dr. Juan Pérez" required className="input-underline" />
        </div>
        <div>
          <label className="label-base">Email <span className="text-namay-coral">*</span></label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="usuario@dental.com" required className="input-underline" />
        </div>
        <div>
          <label className="label-base">Contraseña <span className="text-namay-coral">*</span></label>
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Mínimo 8 caracteres" required className="input-underline" />
        </div>
        <div>
          <label className="label-base">Rol</label>
          <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}
            className="input-underline bg-white dark:bg-gray-800">
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
      title="Editar usuario"
      subtitle={editUser?.email}
      icon={<PencilSquareIcon className="h-4 w-4 text-namay-navy dark:text-gray-200" />}
      variant="info"
      footer={
        <ModalActions
          onCancel={() => setEditUser(null)}
          onConfirm={() => document.getElementById('edit-user-form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))}
          confirmLabel={saving ? 'Guardando...' : 'Guardar cambios'}
          loading={saving}
        />
      }
    >
      <form id="edit-user-form" onSubmit={handleSaveEdit} className="space-y-5">
        {formError && (
          <div className="p-3 text-sm font-medium text-danger-700 bg-danger-50 border-l-2 border-danger-500">
            {formError}
          </div>
        )}
        <div>
          <label className="label-base">Nombre completo</label>
          <input type="text" value={editForm.nombre ?? ''} onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
            className="input-underline" />
        </div>
        <div>
          <label className="label-base">Email</label>
          <input type="email" value={editForm.email ?? ''} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
            className="input-underline" />
        </div>
        <div>
          <label className="label-base">Rol</label>
          <select value={editForm.rol ?? ''} onChange={(e) => setEditForm({ ...editForm, rol: e.target.value as any })}
            className="input-underline bg-white dark:bg-gray-800">
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
