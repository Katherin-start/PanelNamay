'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  UsersIcon,
  CalendarIcon,
  CreditCardIcon,
  DocumentChartBarIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  ArrowRightOnRectangleIcon,
  BellIcon,
  MagnifyingGlassIcon,
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  EnvelopeIcon,
  KeyIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';
import { ROLE_CONFIG } from '@/components/ui/StatusBadge';
import { getInitials } from '@/lib/utils';

const allNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, roles: ['ADMINISTRADOR', 'ODONTOLOGO', 'RECEPCIONISTA', 'CAJERO', 'PRACTICANTE'] },
  { name: 'Pacientes', href: '/pacientes', icon: UsersIcon, roles: ['ADMINISTRADOR', 'ODONTOLOGO', 'RECEPCIONISTA'] },
  { name: 'Citas', href: '/citas', icon: CalendarIcon, roles: ['ADMINISTRADOR', 'ODONTOLOGO', 'RECEPCIONISTA'] },
  { name: 'Pagos', href: '/pagos', icon: CreditCardIcon, roles: ['ADMINISTRADOR', 'CAJERO'] },
  { name: 'Descuentos', href: '/descuentos', icon: DocumentChartBarIcon, roles: ['ADMINISTRADOR', 'RECEPCIONISTA'] },
  { name: 'Reportes', href: '/reportes', icon: DocumentChartBarIcon, roles: ['ADMINISTRADOR', 'ODONTOLOGO', 'CAJERO', 'RECEPCIONISTA', 'PRACTICANTE'] },
  { name: 'Chat', href: '/chat', icon: ChatBubbleLeftRightIcon, roles: ['ADMINISTRADOR', 'ODONTOLOGO', 'RECEPCIONISTA', 'CAJERO', 'PRACTICANTE'] },
  { name: 'Mi Biografía', href: '/mi-biografia', icon: DocumentTextIcon, roles: ['ODONTOLOGO'] },
  { name: 'Usuarios', href: '/usuarios', icon: UserGroupIcon, roles: ['ADMINISTRADOR'] },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, setUser, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      router.push('/login');
      return;
    }
    if (!user) {
      apiClient.getProfile()
        .then((profile) => setUser(profile.profile ?? profile.user ?? profile))
        .catch(() => { setUser(null); router.push('/login'); });
    }
  }, [isLoading, user, router, setUser]);

  useEffect(() => {
    if (user) {
      apiClient.getNotifications().then((res) => {
        const arr = Array.isArray(res) ? res : (res?.data ?? res?.notifications ?? []);
        setNotifications(arr);
      }).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    try { await apiClient.logout(); } catch {}
    setUser(null);
    router.push('/login');
  };

  const handleProfilePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no puede exceder 5MB');
      return;
    }
    setUploadingPhoto(true);
    try {
      const res = await apiClient.uploadProfilePhoto(file);
      const fotoUrl = res?.foto_perfil;
      if (fotoUrl && user) {
        setUser({ ...user, foto_perfil: fotoUrl });
        alert('Foto de perfil actualizada exitosamente');
      } else {
        alert('Error: No se recibió URL de la foto');
      }
    } catch (error: any) {
      const errorMessage = error.message ?? error?.response?.data?.message ?? 'Error al subir la foto de perfil';
      alert(`Error: ${errorMessage}`);
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-namay-cream">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-coral bg-namay-coral">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C9.5 2 7.5 3.5 6.5 5.5C5.5 7 5 8.5 5 10C5 14 7 16.5 8.5 18.5C9.5 20 10 21 10 22H14C14 21 14.5 20 15.5 18.5C17 16.5 19 14 19 10C19 8.5 18.5 7 17.5 5.5C16.5 3.5 14.5 2 12 2Z" />
            </svg>
          </div>
          <div className="spinner-namay" />
          <p className="text-sm font-medium text-namay-steel">Cargando...</p>
        </div>
      </div>
    );
  }

  const rol = user.rol?.toUpperCase() ?? 'PRACTICANTE';
  const navigation = allNavigation.filter((n) => n.roles.includes(rol));
  const roleCfg = ROLE_CONFIG[rol] ?? ROLE_CONFIG.PRACTICANTE;
  const unreadNotifs = notifications.filter((n) => !n.read).length;
  const initials = getInitials(user.nombre ?? '?');

  return (
    <div className="min-h-screen flex bg-namay-cream">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden bg-namay-navy/55 backdrop-blur-[1px] animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto bg-namay-navy ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          <div className="flex-1 flex items-center">
            <div className="bg-white rounded-xl px-3 py-2 flex items-center justify-center shadow-card-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logonamay.png"
                alt="Dental Namay"
                className="h-10 w-auto object-contain"
              />
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white/60 hover:text-white p-1.5 ml-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Role badge */}
        <div className="px-4 py-3 border-b border-white/10">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide"
            style={{ backgroundColor: roleCfg.bg, color: roleCfg.text }}
          >
            <ShieldCheckIcon className="h-3 w-3" />
            {roleCfg.label}
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-btn text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-namay-coral text-white shadow-coral'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User info + logout */}
        <div className="px-3 py-4 border-t border-white/10">
          <button
            onClick={() => { setShowProfile(true); setSidebarOpen(false); }}
            className="w-full flex items-center gap-3 px-3 py-2 mb-1 rounded-btn hover:bg-white/10 transition-colors text-left"
          >
            {user.foto_perfil ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.foto_perfil}
                alt={user.nombre}
                className="w-9 h-9 rounded-full object-cover flex-shrink-0 ring-2 ring-white/20"
              />
            ) : (
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 bg-namay-coral"
              >
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user.nombre}</p>
              <p className="text-xs truncate text-white/50">{user.email}</p>
            </div>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-btn text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 lg:px-6 py-3 flex items-center gap-3">
          {/* Mobile: hamburger + logo */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-btn hover:bg-gray-100 transition-colors flex-shrink-0"
          >
            <Bars3Icon className="h-5 w-5 text-namay-navy" />
          </button>
          <div className="flex items-center gap-2 lg:hidden flex-shrink-0">
            <div className="bg-white rounded-lg px-2 py-1 shadow-card border border-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logonamay.png" alt="Dental Namay" className="h-7 w-auto object-contain" />
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md hidden sm:block">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar pacientes, historial o archivos..."
                className="input-search"
              />
            </div>
          </div>

          <div className="flex items-center gap-1 ml-auto">
            {/* Notifications */}
            <div ref={notifRef} className="relative">
              <button
                onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); }}
                className="relative p-2 rounded-btn hover:bg-gray-100 transition-colors"
              >
                <BellIcon className="h-5 w-5 text-namay-navy" />
                {unreadNotifs > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full text-white text-[10px] font-bold flex items-center justify-center bg-namay-coral shadow-coral">
                    {unreadNotifs > 9 ? '9+' : unreadNotifs}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 top-12 w-80 bg-white rounded-card shadow-modal border border-gray-100 z-50 overflow-hidden animate-fade-in">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-namay-cream">
                    <p className="text-sm font-semibold text-namay-navy">Notificaciones</p>
                    {unreadNotifs > 0 && (
                      <span className="badge-base bg-danger-100 text-danger-600">
                        {unreadNotifs} nuevas
                      </span>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-xs text-gray-400">Sin notificaciones</div>
                    ) : (
                      notifications.slice(0, 8).map((n, i) => (
                        <div
                          key={n.id ?? i}
                          className={`px-4 py-3 border-b border-gray-50 hover:bg-namay-cream/60 transition-colors ${!n.read ? 'bg-info-50/40' : ''}`}
                        >
                          <p className="text-xs font-semibold text-namay-navy">{n.title ?? n.titulo}</p>
                          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message ?? n.descripcion}</p>
                          <p className="text-[10px] text-gray-400 mt-1">
                            {n.fecha ? new Date(n.fecha).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile button */}
            <div ref={profileRef} className="relative">
              <button
                onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); }}
                className="flex items-center gap-2 pl-2 ml-1 border-l border-gray-200 hover:bg-gray-50 rounded-btn px-2 py-1.5 transition-colors"
              >
                {user.foto_perfil ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.foto_perfil}
                    alt={user.nombre}
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-white"
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold bg-namay-navy"
                  >
                    {initials}
                  </div>
                )}
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-semibold leading-tight text-namay-navy">
                    {user.nombre?.split(' ')[0]}
                  </p>
                  <p className="text-[10px] leading-tight text-namay-steel">{roleCfg.label}</p>
                </div>
              </button>

              {/* Profile dropdown */}
              {showProfile && (
                <div className="absolute right-0 top-12 w-72 bg-white rounded-card shadow-modal border border-gray-100 z-50 overflow-hidden animate-fade-in">
                  {/* Header */}
                  <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-br from-namay-navy to-namay-steel">
                    <div className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        {user.foto_perfil ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={user.foto_perfil}
                            alt={user.nombre}
                            className="w-12 h-12 rounded-full object-cover ring-2 ring-white/30"
                          />
                        ) : (
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold ring-2 ring-white/30 bg-namay-coral"
                          >
                            {initials}
                          </div>
                        )}
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingPhoto}
                          className="absolute bottom-0 right-0 p-1.5 bg-white rounded-full shadow-card-md hover:bg-gray-50 disabled:opacity-50 transition-all"
                          title="Cambiar foto de perfil"
                        >
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" style={{ color: '#1D3557' }}>
                            <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
                          </svg>
                        </button>
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-semibold text-sm truncate">{user.nombre}</p>
                        <p className="text-white/60 text-xs truncate">{user.email}</p>
                        <span
                          className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
                          style={{ backgroundColor: roleCfg.bg, color: roleCfg.text }}
                        >
                          <ShieldCheckIcon className="h-2.5 w-2.5" />
                          {roleCfg.label}
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Info */}
                  <div className="px-5 py-3 space-y-2.5 border-b border-gray-100">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <UserCircleIcon className="h-4 w-4 flex-shrink-0 text-namay-steel" />
                      <span className="truncate">{user.nombre}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <EnvelopeIcon className="h-4 w-4 flex-shrink-0 text-namay-steel" />
                      <span className="truncate">{user.email}</span>
                    </div>
                    {user.id && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <ShieldCheckIcon className="h-4 w-4 flex-shrink-0 text-namay-steel" />
                        <span className="tabular">ID: {user.id}</span>
                      </div>
                    )}
                  </div>
                  {/* Actions */}
                  <div className="p-3 space-y-1">
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 rounded-btn hover:bg-namay-cream transition-colors">
                      <KeyIcon className="h-4 w-4 text-namay-steel" />
                      Cambiar contraseña
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-btn hover:bg-danger-50 transition-colors text-namay-coral"
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4" />
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>

      {/* Hidden file input for profile photo */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleProfilePhotoChange}
        className="hidden"
      />
    </div>
  );
}
