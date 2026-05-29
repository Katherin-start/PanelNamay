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
  XMarkIcon,
} from '@heroicons/react/24/outline';

const roleConfig: Record<string, { bg: string; text: string; label: string }> = {
  admin: { bg: '#FEE2E2', text: '#991B1B', label: 'Admin' },
  doctor: { bg: '#DBEAFE', text: '#1E40AF', label: 'Doctor' },
  odontologo: { bg: '#DBEAFE', text: '#1E40AF', label: 'Odontólogo' },
  recepcionista: { bg: '#DCFCE7', text: '#166534', label: 'Recepcionista' },
  cajero: { bg: '#EDE9FE', text: '#5B21B6', label: 'Cajero' },
  practicante: { bg: '#FEF9C3', text: '#713F12', label: 'Practicante' },
};

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
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
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
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#457B9D] border-t-[#E63946]" />
      </div>
    );
  }

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: '#457B9D' }}>
            Panel · Usuarios
          </p>
          <h1 className="text-2xl font-bold mt-0.5" style={{ color: '#1D3557' }}>
            Gestión de Usuarios
          </h1>
          <p className="text-sm mt-1 text-gray-500">Administra los usuarios y roles del sistema.</p>
        </div>
        <button
          onClick={() => { setForm(emptyUserForm); setFormError(''); setShowNew(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg"
          style={{ backgroundColor: '#E63946' }}
        >
          <UserPlusIcon className="h-4 w-4" />
          Nuevo Usuario
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Usuarios', value: users.length, color: '#1D3557', light: '#EFF6FF' },
          { label: 'Activos', value: totalActivos, color: '#16A34A', light: '#F0FDF4' },
          { label: 'Inactivos', value: totalInactivos, color: '#DC2626', light: '#FEF2F2' },
          { label: 'Administradores', value: totalAdmins, color: '#7C3AED', light: '#EDE9FE' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
              style={{ backgroundColor: s.light }}
            >
              <ShieldCheckIcon className="h-4 w-4" style={{ color: s.color }} />
            </div>
            <p className="text-xl font-bold" style={{ color: s.color }}>
              {s.value}
            </p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="relative max-w-xs">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#457B9D]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: '#F1F4F9' }}>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Usuario</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Rol</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Último Acceso</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Acciones</th>
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
                filtered.map((user) => {
                  const rc = roleConfig[user.rol] ?? { bg: '#F1F4F9', text: '#374151', label: user.rol };
                  return (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                            style={{ backgroundColor: '#1D3557' }}
                          >
                            {(user.nombre ?? '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium" style={{ color: '#1D3557' }}>
                              {user.nombre ?? 'Sin nombre'}
                            </p>
                            <p className="text-xs text-gray-400">{user.email ?? ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: rc.bg, color: rc.text }}
                        >
                          <ShieldCheckIcon className="h-3 w-3" />
                          {rc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={
                            user.activo
                              ? { backgroundColor: '#DCFCE7', color: '#16A34A' }
                              : { backgroundColor: '#FEE2E2', color: '#DC2626' }
                          }
                        >
                          <div
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: user.activo ? '#16A34A' : '#DC2626' }}
                          />
                          {user.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {user.ultimo_acceso
                          ? new Date(user.ultimo_acceso).toLocaleDateString('es-PE', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setEditUser(user); setEditForm({ nombre: user.nombre, email: user.email, rol: user.rol }); setFormError(''); }}
                            className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors" title="Editar">
                            <PencilSquareIcon className="h-4 w-4" style={{ color: '#457B9D' }} />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Eliminar">
                            <TrashIcon className="h-4 w-4 text-red-400" />
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
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Mostrando {filtered.length} de {staffUsers.length} usuarios</span>
          </div>
        )}
      </div>
    </div>

    {/* ── MODAL: NUEVO USUARIO ── */}
    {showNew && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(29,53,87,0.55)' }}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#E63946' }}>
                <UserPlusIcon className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-lg font-bold" style={{ color: '#1D3557' }}>Nuevo Usuario</h2>
            </div>
            <button onClick={() => setShowNew(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <XMarkIcon className="h-5 w-5 text-gray-400" />
            </button>
          </div>
          <form onSubmit={handleCreateUser} className="px-6 py-5 space-y-4">
            {formError && <div className="p-3 rounded-lg text-sm font-medium text-red-700" style={{ backgroundColor: '#FEE2E2' }}>{formError}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Nombre completo <span className="text-red-500">*</span></label>
                <input type="text" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej. Dr. Juan Pérez" required
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#457B9D]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Email <span className="text-red-500">*</span></label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="usuario@dental.com" required
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#457B9D]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Contraseña <span className="text-red-500">*</span></label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Mínimo 8 caracteres" required
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#457B9D]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Rol</label>
                <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#457B9D] bg-white">
                  {[['ADMINISTRADOR','Administrador'],['ODONTOLOGO','Odontólogo'],['RECEPCIONISTA','Recepcionista'],['CAJERO','Cajero'],['PRACTICANTE','Practicante']].map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
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
                {saving ? 'Creando...' : 'Crear Usuario'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* ── MODAL: EDITAR USUARIO ── */}
    {editUser && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(29,53,87,0.55)' }}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#457B9D' }}>
                <PencilSquareIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold" style={{ color: '#1D3557' }}>Editar Usuario</h2>
                <p className="text-xs text-gray-400">{editUser.email}</p>
              </div>
            </div>
            <button onClick={() => setEditUser(null)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <XMarkIcon className="h-5 w-5 text-gray-400" />
            </button>
          </div>
          <form onSubmit={handleSaveEdit} className="px-6 py-5 space-y-4">
            {formError && <div className="p-3 rounded-lg text-sm font-medium text-red-700" style={{ backgroundColor: '#FEE2E2' }}>{formError}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Nombre completo</label>
                <input type="text" value={editForm.nombre ?? ''} onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#457B9D]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Email</label>
                <input type="email" value={editForm.email ?? ''} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#457B9D]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Rol</label>
                <select value={editForm.rol ?? ''} onChange={(e) => setEditForm({ ...editForm, rol: e.target.value as any })}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#457B9D] bg-white">
                  {[['ADMINISTRADOR','Administrador'],['ODONTOLOGO','Odontólogo'],['RECEPCIONISTA','Recepcionista'],['CAJERO','Cajero'],['PRACTICANTE','Practicante']].map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setEditUser(null)}
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