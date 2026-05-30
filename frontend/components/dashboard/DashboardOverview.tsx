'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { DashboardMetrics } from '@/types';
import { useAuth } from '@/context/AuthContext';
import {
  UsersIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  BellAlertIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ExclamationCircleIcon,
  DocumentChartBarIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';

// ─── Shared loading & header ───────────────────────────────────────────────

function PageSpinner() {
  return (
    <div className="flex items-center justify-center min-h-96">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#457B9D] border-t-[#E63946]" />
    </div>
  );
}

function DashHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: '#457B9D' }}>
        Panel · Vista General
      </p>
      <h1 className="text-2xl font-bold mt-0.5" style={{ color: '#1D3557' }}>{title}</h1>
      <p className="text-sm mt-1 text-gray-500">
        {subtitle ?? new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, light, sub }: any) {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold mt-1" style={{ color: '#1D3557' }}>{value}</p>
          {sub && <p className="text-xs mt-1" style={{ color }}>{sub}</p>}
        </div>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: light }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
      </div>
    </div>
  );
}

// ─── ADMINISTRADOR ────────────────────────────────────────────────────────

function AdminDashboard({ metrics, alerts }: { metrics: DashboardMetrics | null; alerts: any[] }) {
  const quickActions = [
    { label: 'Nueva Cita', icon: CalendarIcon, href: '/citas', color: '#1D3557' },
    { label: 'Registrar Paciente', icon: UsersIcon, href: '/pacientes', color: '#457B9D' },
    { label: 'Registrar Pago', icon: CurrencyDollarIcon, href: '/pagos', color: '#16a34a' },
    { label: 'Ver Reportes', icon: ArrowTrendingUpIcon, href: '/reportes', color: '#E63946' },
  ];
  return (
    <div className="space-y-6">
      <DashHeader title="Dashboard Administrativo" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Pacientes" value={metrics?.totalPacientes ?? metrics?.resumen?.totalPacientes ?? 0} icon={UsersIcon} color="#1D3557" light="#EFF6FF" sub="+12.5% del mes pasado" />
        <StatCard label="Citas Pendientes" value={metrics?.citasPendientes ?? 0} icon={CalendarIcon} color="#457B9D" light="#EFF6FF" sub="Programadas para hoy" />
        <StatCard label="Ingresos del Mes" value={`S/ ${(metrics?.ingresosTotales ?? 0).toFixed(2)}`} icon={CurrencyDollarIcon} color="#16a34a" light="#F0FDF4" sub="+8.2% este mes" />
        <StatCard label="Citas Completadas" value={metrics?.citasCompletadas ?? 0} icon={CheckCircleIcon} color="#E63946" light="#FFF5F5" sub="Este mes" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold mb-4" style={{ color: '#1D3557' }}>Acciones Rápidas</h2>
          <div className="space-y-1">
            {quickActions.map((action) => (
              <Link key={action.label} href={action.href} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: action.color + '18' }}>
                  <action.icon className="h-4 w-4" style={{ color: action.color }} />
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
        <AlertsPanel alerts={alerts} />
      </div>
    </div>
  );
}

// ─── ODONTÓLOGO ───────────────────────────────────────────────────────────

function OdontologoDashboard({ metrics, appointments, alerts }: { metrics: DashboardMetrics | null; appointments: any[]; alerts: any[] }) {
  const today = new Date().toDateString();
  const appointmentsWithDate = appointments.map((a) => ({
    ...a,
    fecha_hora: a.fecha_hora ?? (a.fecha ? `${a.fecha}T${a.hora ?? '00:00'}` : undefined),
  }));
  const todayCitas = appointmentsWithDate.filter((a) => a.fecha_hora && new Date(a.fecha_hora).toDateString() === today);
  return (
    <div className="space-y-6">
      <DashHeader title="Panel del Odontólogo" subtitle="Resumen de tu actividad clínica de hoy" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Mis Pacientes" value={metrics?.totalPacientes ?? metrics?.resumen?.totalPacientes ?? 0} icon={UsersIcon} color="#1D3557" light="#EFF6FF" sub="En tratamiento activo" />
        <StatCard label="Citas Hoy" value={todayCitas.length} icon={CalendarIcon} color="#457B9D" light="#EFF6FF" sub="Programadas para hoy" />
        <StatCard label="Citas Completadas" value={metrics?.citasCompletadas ?? 0} icon={CheckCircleIcon} color="#16a34a" light="#F0FDF4" sub="Este mes" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: '#1D3557' }}>Citas de Hoy</h2>
            <Link href="/citas" className="text-xs font-medium" style={{ color: '#457B9D' }}>Ver todas →</Link>
          </div>
          {todayCitas.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No hay citas programadas para hoy</p>
          ) : (
            <div className="space-y-3">
              {todayCitas.slice(0, 5).map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: '#F1F4F9' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: '#1D3557' }}>
                    {a.paciente_nombre?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#1D3557' }}>{a.paciente_nombre}</p>
                    <p className="text-xs text-gray-500 truncate">{a.servicio}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold" style={{ color: '#457B9D' }}>
                      {new Date(a.fecha_hora).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <StatusBadge estado={a.estado} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold mb-4" style={{ color: '#1D3557' }}>Acciones Rápidas</h2>
          <div className="space-y-1">
            {[
              { label: 'Ver Pacientes', icon: UsersIcon, href: '/pacientes', color: '#1D3557' },
              { label: 'Mis Citas', icon: CalendarIcon, href: '/citas', color: '#457B9D' },
              { label: 'Reportes Clínicos', icon: DocumentChartBarIcon, href: '/reportes', color: '#E63946' },
            ].map((a) => (
              <Link key={a.label} href={a.href} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: a.color + '18' }}>
                  <a.icon className="h-4 w-4" style={{ color: a.color }} />
                </div>
                <span className="text-sm font-medium text-gray-700">{a.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <AlertsPanel alerts={alerts} />
    </div>
  );
}

// ─── CAJERO ───────────────────────────────────────────────────────────────

function CajeroDashboard({ metrics, payments, alerts }: { metrics: DashboardMetrics | null; payments: any[]; alerts: any[] }) {
  const today = new Date().toDateString();
  const todayPayments = payments.filter((p) => new Date(p.fecha).toDateString() === today);
  const todayIncome = todayPayments.filter((p) => p.estado === 'completado').reduce((s: number, p: any) => s + (p.monto ?? 0), 0);
  const pending = payments.filter((p) => p.estado === 'pendiente').length;

  return (
    <div className="space-y-6">
      <DashHeader title="Panel de Caja" subtitle="Control de ingresos y pagos del día" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Ingresos Hoy" value={`S/ ${todayIncome.toFixed(2)}`} icon={CurrencyDollarIcon} color="#16a34a" light="#F0FDF4" sub="Pagos completados hoy" />
        <StatCard label="Pagos Realizados" value={todayPayments.filter((p) => p.estado === 'completado').length} icon={CheckCircleIcon} color="#1D3557" light="#EFF6FF" sub="Transacciones del día" />
        <StatCard label="Pagos Pendientes" value={pending} icon={ExclamationCircleIcon} color="#F59E0B" light="#FFFBEB" sub="Por cobrar" />
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold" style={{ color: '#1D3557' }}>Pagos Recientes</h2>
          <Link href="/pagos" className="text-xs font-medium" style={{ color: '#457B9D' }}>Ver todos →</Link>
        </div>
        <div className="divide-y divide-gray-50">
          {payments.slice(0, 6).map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: '#457B9D' }}>
                {p.paciente_nombre?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: '#1D3557' }}>{p.paciente_nombre}</p>
                <p className="text-xs text-gray-500">{p.servicio}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold" style={{ color: '#16a34a' }}>S/ {p.monto?.toFixed(2)}</p>
                <StatusBadge estado={p.estado} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <AlertsPanel alerts={alerts} />
    </div>
  );
}

// ─── RECEPCIONISTA ────────────────────────────────────────────────────────

function RecepcionistaDashboard({ metrics, appointments, alerts }: { metrics: DashboardMetrics | null; appointments: any[]; alerts: any[] }) {
  const today = new Date().toDateString();
  const todayCitas = appointments.filter((a) => new Date(a.fecha_hora).toDateString() === today);
  const pendientes = appointments.filter((a) => a.estado === 'pendiente').length;

  return (
    <div className="space-y-6">
      <DashHeader title="Panel de Recepción" subtitle="Agenda y pacientes del día" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Citas Hoy" value={todayCitas.length} icon={CalendarIcon} color="#457B9D" light="#EFF6FF" sub="Agendadas para hoy" />
        <StatCard label="Pacientes Registrados" value={metrics?.totalPacientes ?? metrics?.resumen?.totalPacientes ?? 0} icon={UsersIcon} color="#1D3557" light="#EFF6FF" sub="Total en el sistema" />
        <StatCard label="Citas Pendientes" value={pendientes} icon={ClockIcon} color="#F59E0B" light="#FFFBEB" sub="Sin confirmar" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: '#1D3557' }}>Agenda de Hoy</h2>
            <Link href="/citas" className="text-xs font-medium" style={{ color: '#457B9D' }}>Ver todas →</Link>
          </div>
          {todayCitas.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No hay citas para hoy</p>
          ) : (
            <div className="space-y-3">
              {todayCitas.slice(0, 6).map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: '#F1F4F9' }}>
                  <ClockIcon className="h-5 w-5 flex-shrink-0" style={{ color: '#457B9D' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#1D3557' }}>{a.paciente_nombre}</p>
                    <p className="text-xs text-gray-500">{a.doctor_nombre} · {a.servicio}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold" style={{ color: '#457B9D' }}>
                      {new Date(a.fecha_hora).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <StatusBadge estado={a.estado} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold mb-4" style={{ color: '#1D3557' }}>Acciones Rápidas</h2>
          <div className="space-y-1">
            {[
              { label: 'Nueva Cita', icon: CalendarIcon, href: '/citas', color: '#E63946' },
              { label: 'Nuevo Paciente', icon: UsersIcon, href: '/pacientes', color: '#1D3557' },
              { label: 'Chat', icon: BellAlertIcon, href: '/chat', color: '#457B9D' },
            ].map((a) => (
              <Link key={a.label} href={a.href} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: a.color + '18' }}>
                  <a.icon className="h-4 w-4" style={{ color: a.color }} />
                </div>
                <span className="text-sm font-medium text-gray-700">{a.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <AlertsPanel alerts={alerts} />
    </div>
  );
}

// ─── PRACTICANTE ──────────────────────────────────────────────────────────

function PracticanteDashboard({ alerts }: { alerts: any[] }) {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  return (
    <div className="space-y-6">
      <DashHeader title="Mi Panel" subtitle={`${greeting} · Seguimiento de asistencia y turnos`} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Horas Esta Semana" value="--" icon={ClockIcon} color="#457B9D" light="#EFF6FF" sub="Registro acumulado" />
        <StatCard label="Días Asistidos" value="--" icon={CheckCircleIcon} color="#16a34a" light="#F0FDF4" sub="Este mes" />
        <StatCard label="Turno Actual" value="Mañana" icon={CalendarIcon} color="#1D3557" light="#F1F4F9" sub={now.toLocaleDateString('es-PE')} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold mb-4" style={{ color: '#1D3557' }}>Mi Horario</h2>
          <div className="space-y-3">
            {[
              { dia: 'Hoy', hora: '08:00 - 13:00', estado: 'Turno mañana' },
              { dia: 'Mañana', hora: '08:00 - 13:00', estado: 'Programado' },
            ].map((t) => (
              <div key={t.dia} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: '#F1F4F9' }}>
                <CalendarIcon className="h-5 w-5 flex-shrink-0" style={{ color: '#457B9D' }} />
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: '#1D3557' }}>{t.dia}</p>
                  <p className="text-xs text-gray-500">{t.hora}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: '#DCFCE7', color: '#16A34A' }}>{t.estado}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold mb-4" style={{ color: '#1D3557' }}>Accesos Rápidos</h2>
          <div className="space-y-1">
            {[
              { label: 'Mis Reportes', icon: DocumentChartBarIcon, href: '/reportes', color: '#1D3557' },
              { label: 'Chat', icon: BellAlertIcon, href: '/chat', color: '#457B9D' },
            ].map((a) => (
              <Link key={a.label} href={a.href} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: a.color + '18' }}>
                  <a.icon className="h-4 w-4" style={{ color: a.color }} />
                </div>
                <span className="text-sm font-medium text-gray-700">{a.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <AlertsPanel alerts={alerts} />
    </div>
  );
}

// ─── Shared alerts panel ─────────────────────────────────────────────────

function AlertsPanel({ alerts }: { alerts: any[] }) {
  const iconMap: any = { urgente: BellAlertIcon, alta: ExclamationCircleIcon };
  const colorMap: any = { urgente: '#E63946', alta: '#F59E0B', media: '#457B9D', baja: '#6B7280' };
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold" style={{ color: '#1D3557' }}>Alertas Activas</h2>
        {alerts.length > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full text-white font-semibold" style={{ backgroundColor: '#E63946' }}>
            {alerts.length}
          </span>
        )}
      </div>
      {alerts.length === 0 ? (
        <div className="py-6 text-center text-sm text-gray-400">Sin alertas activas</div>
      ) : (
        <div className="space-y-3">
          {alerts.slice(0, 4).map((alert: any, i: number) => {
            const color = colorMap[alert.prioridad] ?? '#6B7280';
            const Icon = iconMap[alert.prioridad] ?? ClockIcon;
            return (
              <div key={alert.id ?? i} className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: '#F1F4F9' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + '20' }}>
                  <Icon className="h-4 w-4" style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold capitalize" style={{ color }}>{alert.prioridad} — {alert.tipo}</p>
                  <p className="text-sm text-gray-700 truncate">{alert.titulo}</p>
                  {alert.descripcion && <p className="text-xs text-gray-400 truncate">{alert.descripcion}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Status badge helper ─────────────────────────────────────────────────

function StatusBadge({ estado }: { estado: string }) {
  const cfg: Record<string, { bg: string; text: string; label: string }> = {
    pendiente: { bg: '#FEF9C3', text: '#713F12', label: 'Pendiente' },
    confirmada: { bg: '#DBEAFE', text: '#1E40AF', label: 'Confirmada' },
    completada: { bg: '#DCFCE7', text: '#166534', label: 'Completada' },
    cancelada: { bg: '#FEE2E2', text: '#991B1B', label: 'Cancelada' },
    completado: { bg: '#DCFCE7', text: '#166534', label: 'Completado' },
    fallido: { bg: '#FEE2E2', text: '#991B1B', label: 'Fallido' },
  };
  const c = cfg[estado] ?? { bg: '#F1F4F9', text: '#374151', label: estado };
  return (
    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold mt-0.5" style={{ backgroundColor: c.bg, color: c.text }}>
      {c.label}
    </span>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────

export default function DashboardOverview() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const rol = user?.rol?.toUpperCase() ?? 'PRACTICANTE';

  useEffect(() => {
    const load = async () => {
      try {
        const [m, a] = await Promise.all([
          apiClient.getDashboardMetrics().catch(() => null),
          apiClient.getAppointmentAlerts().catch(() => []),
        ]);
        setMetrics(m?.data ?? m);
        setAlerts(Array.isArray(a) ? a : []);

        // Role-specific data
        if (['ADMINISTRADOR', 'ODONTOLOGO', 'RECEPCIONISTA'].includes(rol)) {
          const citas = await apiClient.getAppointments().catch(() => []);
          setAppointments(Array.isArray(citas) ? citas : []);
        }
        if (['ADMINISTRADOR', 'CAJERO'].includes(rol)) {
          const pagos = await apiClient.getPayments().catch(() => []);
          setPayments(Array.isArray(pagos) ? pagos : []);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [rol]);

  if (loading) return <PageSpinner />;

  if (rol === 'ODONTOLOGO') return <OdontologoDashboard metrics={metrics} appointments={appointments} alerts={alerts} />;
  if (rol === 'CAJERO') return <CajeroDashboard metrics={metrics} payments={payments} alerts={alerts} />;
  if (rol === 'RECEPCIONISTA') return <RecepcionistaDashboard metrics={metrics} appointments={appointments} alerts={alerts} />;
  if (rol === 'PRACTICANTE') return <PracticanteDashboard alerts={alerts} />;
  return <AdminDashboard metrics={metrics} alerts={alerts} />;
}