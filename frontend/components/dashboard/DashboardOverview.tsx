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
} from '@heroicons/react/24/outline';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';

function PageSpinner() {
  return (
    <div className="flex items-center justify-center min-h-96">
      <div className="spinner-namay" />
    </div>
  );
}

function StatCard({ label, value, icon: Icon, sub, accent }: any) {
  return (
    <div className="card-stat">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="eyebrow">{label}</p>
          <p className={`mt-3 text-2xl font-light tabular ${accent ? 'text-namay-coral' : 'text-namay-navy'}`}>
            {value}
          </p>
          {sub && <p className="text-[11px] mt-1.5 text-namay-steel/60 font-light">{sub}</p>}
        </div>
        <div className="w-9 h-9 flex items-center justify-center flex-shrink-0 text-namay-steel/50">
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
}

function StatCardDark({ label, value, sub, icon: Icon }: any) {
  return (
    <div className="card-stat bg-namay-navy border-namay-navy">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold text-white/40 uppercase tracking-[0.25em]">{label}</p>
          <p className="mt-3 text-2xl font-light text-white tabular">{value}</p>
          {sub && <p className="text-[11px] mt-1.5 text-white/40 font-light">{sub}</p>}
        </div>
        <div className="w-9 h-9 flex items-center justify-center flex-shrink-0 text-white/50">
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
}

function AdminDashboard({ metrics, alerts }: { metrics: DashboardMetrics | null; alerts: any[] }) {
  const quickActions = [
    { label: 'Nueva Cita',         icon: CalendarIcon,       href: '/citas' },
    { label: 'Registrar Paciente', icon: UsersIcon,          href: '/pacientes' },
    { label: 'Registrar Pago',     icon: CurrencyDollarIcon, href: '/pagos' },
    { label: 'Ver Reportes',       icon: ArrowTrendingUpIcon, href: '/reportes' },
  ];
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Vista general" title="Dashboard administrativo" />
      <div className="grid grid-cols-1 gap-px bg-gray-100 sm:grid-cols-2 xl:grid-cols-4">
        <div className="bg-white p-6">
          <p className="eyebrow">Total pacientes</p>
          <p className="mt-3 text-2xl font-light text-namay-navy tabular">{metrics?.totalPacientes ?? (metrics as any)?.resumen?.totalPacientes ?? 0}</p>
          <p className="text-[11px] mt-1.5 text-namay-steel/60 font-light">+12.5% del mes pasado</p>
        </div>
        <div className="bg-white p-6">
          <p className="eyebrow">Citas pendientes</p>
          <p className="mt-3 text-2xl font-light text-namay-navy tabular">{metrics?.citasPendientes ?? 0}</p>
          <p className="text-[11px] mt-1.5 text-namay-steel/60 font-light">Programadas para hoy</p>
        </div>
        <div className="bg-white p-6">
          <p className="eyebrow">Ingresos del mes</p>
          <p className="mt-3 text-2xl font-light text-namay-navy tabular">S/ {(metrics?.ingresosTotales ?? 0).toFixed(2)}</p>
          <p className="text-[11px] mt-1.5 text-namay-steel/60 font-light">+8.2% este mes</p>
        </div>
        <div className="bg-white p-6">
          <p className="eyebrow">Citas completadas</p>
          <p className="mt-3 text-2xl font-light text-namay-coral tabular">{metrics?.citasCompletadas ?? 0}</p>
          <p className="text-[11px] mt-1.5 text-namay-steel/60 font-light">Este mes</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-gray-100">
        <div className="bg-white p-6">
          <p className="eyebrow mb-5">Acciones rápidas</p>
          <div className="space-y-0.5">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="flex items-center gap-3 px-2 py-2.5 -mx-2 hover:bg-gray-50 transition-colors group"
              >
                <action.icon className="h-[18px] w-[18px] text-namay-steel/60 group-hover:text-namay-coral transition-colors" strokeWidth={1.5} />
                <span className="text-sm font-light text-namay-navy">{action.label}</span>
                <span className="ml-auto text-namay-steel/30 group-hover:text-namay-coral transition-colors">→</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="lg:col-span-2 bg-white p-6">
          <AlertsPanel alerts={alerts} />
        </div>
      </div>
    </div>
  );
}

function OdontologoDashboard({ metrics, appointments, alerts }: { metrics: DashboardMetrics | null; appointments: any[]; alerts: any[] }) {
  const today = new Date().toDateString();
  const appointmentsWithDate = appointments.map((a) => ({
    ...a,
    fecha_hora: a.fecha_hora ?? (a.fecha ? `${a.fecha}T${a.hora ?? '00:00'}` : undefined),
  }));
  const todayCitas = appointmentsWithDate.filter((a) => a.fecha_hora && new Date(a.fecha_hora).toDateString() === today);
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Vista general"
        title="Panel del odontólogo"
        subtitle="Resumen de tu actividad clínica de hoy"
      />
      <div className="grid grid-cols-1 gap-px bg-gray-100 sm:grid-cols-3">
        <div className="bg-white p-6">
          <p className="eyebrow">Mis pacientes</p>
          <p className="mt-3 text-2xl font-light text-namay-navy tabular">{metrics?.totalPacientes ?? (metrics as any)?.resumen?.totalPacientes ?? 0}</p>
          <p className="text-[11px] mt-1.5 text-namay-steel/60 font-light">En tratamiento activo</p>
        </div>
        <div className="bg-white p-6">
          <p className="eyebrow">Citas hoy</p>
          <p className="mt-3 text-2xl font-light text-namay-navy tabular">{todayCitas.length}</p>
          <p className="text-[11px] mt-1.5 text-namay-steel/60 font-light">Programadas para hoy</p>
        </div>
        <div className="bg-white p-6">
          <p className="eyebrow">Citas completadas</p>
          <p className="mt-3 text-2xl font-light text-namay-coral tabular">{metrics?.citasCompletadas ?? 0}</p>
          <p className="text-[11px] mt-1.5 text-namay-steel/60 font-light">Este mes</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-gray-100">
        <div className="lg:col-span-2 bg-white p-6">
          <div className="flex items-center justify-between mb-5">
            <p className="eyebrow">Citas de hoy</p>
            <Link href="/citas" className="text-[10px] font-semibold uppercase tracking-[0.2em] text-namay-steel/60 hover:text-namay-coral transition-colors">Ver todas →</Link>
          </div>
          {todayCitas.length === 0 ? (
            <p className="text-sm text-namay-steel/40 text-center py-10 font-light">No hay citas programadas para hoy</p>
          ) : (
            <div className="space-y-0.5">
              {todayCitas.slice(0, 5).map((a) => (
                <div key={a.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-namay-navy text-xs font-medium flex-shrink-0 border border-gray-100">
                    {a.paciente_nombre?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-namay-navy truncate">{a.paciente_nombre}</p>
                    <p className="text-xs text-namay-steel/60 font-light truncate">{a.servicio}</p>
                  </div>
                  <div className="text-right flex-shrink-0 space-y-1">
                    <p className="text-xs font-medium text-namay-steel tabular">
                      {new Date(a.fecha_hora).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <StatusBadge status={a.estado} kind="appointment" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white p-6">
          <p className="eyebrow mb-5">Acciones rápidas</p>
          <div className="space-y-0.5">
            {[
              { label: 'Ver pacientes',     icon: UsersIcon,            href: '/pacientes' },
              { label: 'Mis citas',         icon: CalendarIcon,         href: '/citas' },
              { label: 'Reportes clínicos', icon: DocumentChartBarIcon, href: '/reportes' },
            ].map((a) => (
              <Link key={a.label} href={a.href} className="flex items-center gap-3 px-2 py-2.5 -mx-2 hover:bg-gray-50 transition-colors group">
                <a.icon className="h-[18px] w-[18px] text-namay-steel/60 group-hover:text-namay-coral transition-colors" strokeWidth={1.5} />
                <span className="text-sm font-light text-namay-navy">{a.label}</span>
                <span className="ml-auto text-namay-steel/30 group-hover:text-namay-coral transition-colors">→</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <AlertsPanel alerts={alerts} />
    </div>
  );
}

function CajeroDashboard({ metrics, payments, alerts }: { metrics: DashboardMetrics | null; payments: any[]; alerts: any[] }) {
  const today = new Date().toDateString();
  const todayPayments = payments.filter((p) => new Date(p.fecha).toDateString() === today);
  const todayIncome = todayPayments.filter((p) => p.estado === 'completado').reduce((s: number, p: any) => s + (p.monto ?? 0), 0);
  const pending = payments.filter((p) => p.estado === 'pendiente').length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Vista general"
        title="Panel de caja"
        subtitle="Control de ingresos y pagos del día"
      />
      <div className="grid grid-cols-1 gap-px bg-gray-100 sm:grid-cols-3">
        <div className="bg-namay-navy p-6">
          <p className="text-[10px] font-semibold text-white/40 uppercase tracking-[0.25em]">Ingresos hoy</p>
          <p className="mt-3 text-2xl font-light text-white tabular">S/ {todayIncome.toFixed(2)}</p>
          <p className="text-[11px] mt-1.5 text-white/40 font-light">Pagos completados hoy</p>
        </div>
        <div className="bg-white p-6">
          <p className="eyebrow">Pagos realizados</p>
          <p className="mt-3 text-2xl font-light text-namay-navy tabular">{todayPayments.filter((p) => p.estado === 'completado').length}</p>
          <p className="text-[11px] mt-1.5 text-namay-steel/60 font-light">Transacciones del día</p>
        </div>
        <div className="bg-white p-6">
          <p className="eyebrow">Pagos pendientes</p>
          <p className="mt-3 text-2xl font-light text-namay-coral tabular">{pending}</p>
          <p className="text-[11px] mt-1.5 text-namay-steel/60 font-light">Por cobrar</p>
        </div>
      </div>
      <div className="bg-white border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="eyebrow">Pagos recientes</p>
          <Link href="/pagos" className="text-[10px] font-semibold uppercase tracking-[0.2em] text-namay-steel/60 hover:text-namay-coral transition-colors">Ver todos →</Link>
        </div>
        <div>
          {payments.length === 0 ? (
            <p className="text-sm text-namay-steel/40 text-center py-10 font-light">Sin pagos registrados</p>
          ) : (
            payments.slice(0, 6).map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-6 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-namay-navy text-xs font-medium flex-shrink-0 border border-gray-100">
                  {p.paciente_nombre?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-namay-navy truncate">{p.paciente_nombre}</p>
                  <p className="text-xs text-namay-steel/60 font-light">{p.servicio}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium text-namay-navy tabular">S/ {p.monto?.toFixed(2)}</p>
                  <StatusBadge status={p.estado} kind="payment" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <AlertsPanel alerts={alerts} />
    </div>
  );
}

function RecepcionistaDashboard({ metrics, appointments, alerts }: { metrics: DashboardMetrics | null; appointments: any[]; alerts: any[] }) {
  const today = new Date().toDateString();
  const todayCitas = appointments.filter((a) => new Date(a.fecha_hora).toDateString() === today);
  const pendientes = appointments.filter((a) => a.estado === 'pendiente').length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Vista general"
        title="Panel de recepción"
        subtitle="Agenda y pacientes del día"
      />
      <div className="grid grid-cols-1 gap-px bg-gray-100 sm:grid-cols-3">
        <div className="bg-white p-6">
          <p className="eyebrow">Citas hoy</p>
          <p className="mt-3 text-2xl font-light text-namay-navy tabular">{todayCitas.length}</p>
          <p className="text-[11px] mt-1.5 text-namay-steel/60 font-light">Agendadas para hoy</p>
        </div>
        <div className="bg-white p-6">
          <p className="eyebrow">Pacientes registrados</p>
          <p className="mt-3 text-2xl font-light text-namay-navy tabular">{metrics?.totalPacientes ?? (metrics as any)?.resumen?.totalPacientes ?? 0}</p>
          <p className="text-[11px] mt-1.5 text-namay-steel/60 font-light">Total en el sistema</p>
        </div>
        <div className="bg-white p-6">
          <p className="eyebrow">Citas pendientes</p>
          <p className="mt-3 text-2xl font-light text-namay-coral tabular">{pendientes}</p>
          <p className="text-[11px] mt-1.5 text-namay-steel/60 font-light">Sin confirmar</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-gray-100">
        <div className="lg:col-span-2 bg-white p-6">
          <div className="flex items-center justify-between mb-5">
            <p className="eyebrow">Agenda de hoy</p>
            <Link href="/citas" className="text-[10px] font-semibold uppercase tracking-[0.2em] text-namay-steel/60 hover:text-namay-coral transition-colors">Ver todas →</Link>
          </div>
          {todayCitas.length === 0 ? (
            <p className="text-sm text-namay-steel/40 text-center py-10 font-light">No hay citas para hoy</p>
          ) : (
            <div className="space-y-0.5">
              {todayCitas.slice(0, 6).map((a) => (
                <div key={a.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                  <ClockIcon className="h-4 w-4 flex-shrink-0 text-namay-steel/50" strokeWidth={1.5} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-namay-navy truncate">{a.paciente_nombre}</p>
                    <p className="text-xs text-namay-steel/60 font-light">{a.doctor_nombre} · {a.servicio}</p>
                  </div>
                  <div className="text-right flex-shrink-0 space-y-1">
                    <p className="text-xs font-medium text-namay-steel tabular">
                      {new Date(a.fecha_hora).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <StatusBadge status={a.estado} kind="appointment" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white p-6">
          <p className="eyebrow mb-5">Acciones rápidas</p>
          <div className="space-y-0.5">
            {[
              { label: 'Nueva cita',     icon: CalendarIcon,  href: '/citas' },
              { label: 'Nuevo paciente', icon: UsersIcon,     href: '/pacientes' },
              { label: 'Chat',           icon: BellAlertIcon, href: '/chat' },
            ].map((a) => (
              <Link key={a.label} href={a.href} className="flex items-center gap-3 px-2 py-2.5 -mx-2 hover:bg-gray-50 transition-colors group">
                <a.icon className="h-[18px] w-[18px] text-namay-steel/60 group-hover:text-namay-coral transition-colors" strokeWidth={1.5} />
                <span className="text-sm font-light text-namay-navy">{a.label}</span>
                <span className="ml-auto text-namay-steel/30 group-hover:text-namay-coral transition-colors">→</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <AlertsPanel alerts={alerts} />
    </div>
  );
}

function PracticanteDashboard({ alerts }: { alerts: any[] }) {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Vista general"
        title="Mi panel"
        subtitle={`${greeting} · Seguimiento de asistencia y turnos`}
      />
      <div className="grid grid-cols-1 gap-px bg-gray-100 sm:grid-cols-3">
        <div className="bg-white p-6">
          <p className="eyebrow">Horas esta semana</p>
          <p className="mt-3 text-2xl font-light text-namay-navy tabular">--</p>
          <p className="text-[11px] mt-1.5 text-namay-steel/60 font-light">Registro acumulado</p>
        </div>
        <div className="bg-white p-6">
          <p className="eyebrow">Días asistidos</p>
          <p className="mt-3 text-2xl font-light text-namay-coral tabular">--</p>
          <p className="text-[11px] mt-1.5 text-namay-steel/60 font-light">Este mes</p>
        </div>
        <div className="bg-white p-6">
          <p className="eyebrow">Turno actual</p>
          <p className="mt-3 text-2xl font-light text-namay-navy">Mañana</p>
          <p className="text-[11px] mt-1.5 text-namay-steel/60 font-light tabular">{now.toLocaleDateString('es-PE')}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-gray-100">
        <div className="bg-white p-6">
          <p className="eyebrow mb-5">Mi horario</p>
          <div className="space-y-0.5">
            {[
              { dia: 'Hoy',    hora: '08:00 - 13:00', estado: 'Turno mañana' },
              { dia: 'Mañana', hora: '08:00 - 13:00', estado: 'Programado' },
            ].map((t) => (
              <div key={t.dia} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                <CalendarIcon className="h-4 w-4 flex-shrink-0 text-namay-steel/50" strokeWidth={1.5} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-namay-navy">{t.dia}</p>
                  <p className="text-xs text-namay-steel/60 font-light tabular">{t.hora}</p>
                </div>
                <span className="badge-base bg-success-50 text-success-700">{t.estado}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white p-6">
          <p className="eyebrow mb-5">Accesos rápidos</p>
          <div className="space-y-0.5">
            {[
              { label: 'Mis reportes', icon: DocumentChartBarIcon, href: '/reportes' },
              { label: 'Chat',         icon: BellAlertIcon,        href: '/chat' },
            ].map((a) => (
              <Link key={a.label} href={a.href} className="flex items-center gap-3 px-2 py-2.5 -mx-2 hover:bg-gray-50 transition-colors group">
                <a.icon className="h-[18px] w-[18px] text-namay-steel/60 group-hover:text-namay-coral transition-colors" strokeWidth={1.5} />
                <span className="text-sm font-light text-namay-navy">{a.label}</span>
                <span className="ml-auto text-namay-steel/30 group-hover:text-namay-coral transition-colors">→</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <AlertsPanel alerts={alerts} />
    </div>
  );
}

function AlertsPanel({ alerts }: { alerts: any[] }) {
  return (
    <div className="bg-white border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-5">
        <p className="eyebrow">Alertas activas</p>
        {alerts.length > 0 && (
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-namay-coral">{alerts.length}</span>
        )}
      </div>
      {alerts.length === 0 ? (
        <p className="text-sm text-namay-steel/40 text-center py-6 font-light">Sin alertas activas</p>
      ) : (
        <div className="space-y-0.5">
          {alerts.slice(0, 4).map((alert: any, i: number) => (
            <div key={alert.id ?? i} className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
              <BellAlertIcon className="h-4 w-4 text-namay-coral mt-0.5" strokeWidth={1.5} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-namay-coral">{alert.prioridad} · {alert.tipo}</p>
                <p className="text-sm font-light text-namay-navy">{alert.titulo}</p>
                {alert.descripcion && <p className="text-xs text-namay-steel/60 font-light mt-0.5">{alert.descripcion}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
