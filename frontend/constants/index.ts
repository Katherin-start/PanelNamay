// Constantes de la aplicación

export const ROLES = {
  ADMINISTRADOR: 'ADMINISTRADOR',
  ODONTOLOGO: 'ODONTOLOGO',
  RECEPCIONISTA: 'RECEPCIONISTA',
  PRACTICANTE: 'PRACTICANTE',
  CAJERO: 'CAJERO',
} as const;

export const APPOINTMENT_STATUS = {
  PROGRAMADA: 'programada',
  CONFIRMADA: 'confirmada',
  COMPLETADA: 'completada',
  CANCELADA: 'cancelada',
} as const;

export const PAYMENT_STATUS = {
  PENDIENTE: 'pendiente',
  COMPLETADO: 'completado',
  CANCELADO: 'cancelado',
} as const;

export const PATIENT_STATUS = {
  ACTIVO: 'activo',
  INACTIVO: 'inactivo',
} as const;

export const TREATMENT_STATUS = {
  ACTIVO: 'activo',
  COMPLETADO: 'completado',
  CANCELADO: 'cancelado',
} as const;

export const ALERT_TYPES = {
  SEGUIMIENTO: 'seguimiento',
  CONTROL: 'control',
  RECORDATORIO: 'recordatorio',
  URGENTE: 'urgente',
} as const;

export const PRIORITY_LEVELS = {
  BAJA: 'baja',
  MEDIA: 'media',
  ALTA: 'alta',
  URGENTE: 'urgente',
} as const;

// Rutas de la aplicación
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  PACIENTES: '/pacientes',
  CITAS: '/citas',
  PAGOS: '/pagos',
  REPORTES: '/reportes',
  CHAT: '/chat',
  USUARIOS: '/usuarios',
} as const;

// Configuración de API
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    PROFILE: '/auth/profile',
  },
  DASHBOARD: {
    METRICS: '/dashboard/metrics',
    NOTIFICATIONS: '/dashboard/notifications',
    ALERTS: '/dashboard/appointment-alerts',
    ATTENDANCE: '/dashboard/attendance-alerts',
  },
  PACIENTES: '/pacientes',
  CITAS: '/citas',
  PAGOS: '/pagos',
  REPORTES: {
    INCOME: '/reports/income',
    PATIENTS: '/reports/patients',
    APPOINTMENTS: '/reports/appointments',
    ATTENDANCE: '/reports/attendance',
    HOURS: '/reports/hours',
    TODAY: '/reports/appointments/today',
  },
  CHAT: '/chat',
  USUARIOS: '/usuarios',
} as const;