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
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="flex flex-col items-center gap-5 animate-fade-in">
          <div className="w-12 h-12 rounded-hair flex items-center justify-center bg-namay-navy">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C9.5 2 7.5 3.5 6.5 5.5C5.5 7 5 8.5 5 10C5 14 7 16.5 8.5 18.5C9.5 20 10 21 10 22H14C14 21 14.5 20 15.5 18.5C17 16.5 19 14 19 10C19 8.5 18.5 7 17.5 5.5C16.5 3.5 14.5 2 12 2Z" />
            </svg>
          </div>
          <div className="spinner-namay" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-namay-steel/60">Cargando</p>
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
    <div className="min-h-screen flex bg-white">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden bg-namay-navy/40 animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto bg-namay-navy ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logonamay.png"
            alt="Dental Namay"
            className="h-12 w-auto object-contain brightness-0 invert"
          />
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white/40 hover:text-white p-1 transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-3.5 border-b border-white/10">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.2em]"
            style={{ backgroundColor: roleCfg.bg, color: roleCfg.text }}
          >
            <ShieldCheckIcon className="h-3 w-3" />
            {roleCfg.label}
          </span>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm transition-colors duration-200 ${
                  isActive
                    ? 'text-namay-coral border-l-2 border-namay-coral pl-[10px]'
                    : 'text-white/50 hover:text-white border-l-2 border-transparent pl-[10px]'
                }`}
              >
                <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
                <span className="font-light">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-white/10 space-y-1">
          <button
            onClick={() => { setShowProfile(true); setSidebarOpen(false); }}
            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors text-left"
          >
            {user.foto_perfil ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.foto_perfil}
                alt={user.nombre}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0 border border-white/20">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-light truncate">{user.nombre}</p>
              <p className="text-[10px] truncate text-white/40">{user.email}</p>
            </div>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-xs text-white/40 hover:text-white transition-colors"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4" />
            <span className="font-light">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 lg:px-8 py-3.5 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1.5 text-namay-navy"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
          <div className="lg:hidden flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logonamay.png" alt="Dental Namay" className="h-8 w-auto object-contain" />
          </div>

          <div className="flex-1 max-w-sm hidden sm:block">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
              <input
                type="text"
                placeholder="Buscar..."
                className="input-search"
              />
            </div>
          </div>

          <div className="flex items-center gap-1 ml-auto">
            <div ref={notifRef} className="relative">
              <button
                onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); }}
                className="relative p-2 text-namay-navy/70 hover:text-namay-navy transition-colors"
              >
                <BellIcon className="h-[18px] w-[18px]" />
                {unreadNotifs > 0 && (
                  <span className="absolute top-1 right-1 min-w-[14px] h-3.5 px-1 rounded-full text-white text-[9px] font-semibold flex items-center justify-center bg-namay-coral">
                    {unreadNotifs > 9 ? '9+' : unreadNotifs}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 top-11 w-80 bg-white border border-gray-100 z-50 overflow-hidden animate-fade-in">
                  <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-namay-steel/70">Notificaciones</p>
                    {unreadNotifs > 0 && (
                      <span className="badge-base bg-danger-100 text-danger-700">
                        {unreadNotifs} nuevas
                      </span>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="py-10 text-center text-[11px] uppercase tracking-[0.2em] text-gray-300">Sin notificaciones</div>
                    ) : (
                      notifications.slice(0, 8).map((n, i) => (
                        <div
                          key={n.id ?? i}
                          className={`px-5 py-3.5 border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${!n.read ? 'bg-info-50/30' : ''}`}
                        >
                          <p className="text-sm font-medium text-namay-navy">{n.title ?? n.titulo}</p>
                          <p className="text-xs text-namay-steel/70 mt-1 leading-relaxed">{n.message ?? n.descripcion}</p>
                          <p className="text-[10px] text-gray-300 mt-1.5 tabular">
                            {n.fecha ? new Date(n.fecha).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div ref={profileRef} className="relative">
              <button
                onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); }}
                className="flex items-center gap-2.5 pl-3 ml-1 border-l border-gray-100 hover:opacity-80 transition-opacity"
              >
                {user.foto_perfil ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.foto_perfil}
                    alt={user.nombre}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-medium bg-namay-navy">
                    {initials}
                  </div>
                )}
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-medium leading-tight text-namay-navy">
                    {user.nombre?.split(' ')[0]}
                  </p>
                  <p className="text-[10px] leading-tight text-namay-steel/60">{roleCfg.label}</p>
                </div>
              </button>

              {showProfile && (
                <div className="absolute right-0 top-11 w-72 bg-white border border-gray-100 z-50 overflow-hidden animate-fade-in">
                  <div className="px-5 py-5 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        {user.foto_perfil ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={user.foto_perfil}
                            alt={user.nombre}
                            className="w-11 h-11 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full flex items-center justify-center text-white text-base font-medium bg-namay-navy">
                            {initials}
                          </div>
                        )}
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingPhoto}
                          className="absolute bottom-0 right-0 p-1 bg-white border border-gray-100 hover:border-namay-coral disabled:opacity-50 transition-colors"
                          title="Cambiar foto de perfil"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" style={{ color: '#1D3557' }}>
                            <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
                          </svg>
                        </button>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-namay-navy font-medium text-sm truncate">{user.nombre}</p>
                        <p className="text-[11px] text-namay-steel/70 truncate mt-0.5">{user.email}</p>
                        <span
                          className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-[0.2em]"
                          style={{ backgroundColor: roleCfg.bg, color: roleCfg.text }}
                        >
                          <ShieldCheckIcon className="h-2.5 w-2.5" />
                          {roleCfg.label}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="px-5 py-3 space-y-2.5 border-b border-gray-100">
                    <div className="flex items-center gap-2.5 text-xs text-namay-steel/70">
                      <UserCircleIcon className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{user.nombre}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-namay-steel/70">
                      <EnvelopeIcon className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </div>
                    {user.id && (
                      <div className="flex items-center gap-2.5 text-xs text-namay-steel/70">
                        <ShieldCheckIcon className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="tabular">ID: {user.id}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-2 space-y-0.5">
                    <button className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-namay-navy hover:bg-gray-50 transition-colors">
                      <KeyIcon className="h-3.5 w-3.5 text-namay-steel/60" />
                      <span className="font-light">Cambiar contraseña</span>
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-namay-coral hover:bg-danger-50 transition-colors"
                    >
                      <ArrowRightOnRectangleIcon className="h-3.5 w-3.5" />
                      <span className="font-light">Cerrar sesión</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 lg:px-8 py-6 lg:py-8">
          {children}
        </main>
      </div>

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
