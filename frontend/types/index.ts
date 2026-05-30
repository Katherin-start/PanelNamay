// Tipos de datos para el sistema de administración dental

export interface User {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  estado?: 'activo' | 'inactivo';
  activo?: boolean;
  creado_en?: string;
  ultimo_acceso?: string;
  foto_perfil?: string;
}

export interface Patient {
  id: string;
  nombre: string;
  dni?: string;
  email?: string;
  telefono?: string;
  fecha_nacimiento?: string;
  direccion?: string;
  estado: 'activo' | 'inactivo';
  creado_en: string;
}

export interface Appointment {
  id: string;
  paciente_id: string;
  paciente_nombre: string;
  doctor_id: string;
  doctor_nombre: string;
  fecha_hora: string;
  hora: string;
  servicio: string;
  estado: 'pendiente' | 'confirmada' | 'completada' | 'cancelada' | 'programada';
  notas?: string;
}

export interface Payment {
  id: string;
  paciente_id: string;
  paciente_nombre: string;
  monto: number;
  metodo_pago: 'efectivo' | 'tarjeta' | 'transferencia' | 'seguro' | 'yape' | string;
  estado: 'pendiente' | 'completado' | 'pagado' | 'fallido' | 'cancelado' | string;
  fecha: string;
  servicio?: string;
  comprobante?: string;
  estado_validacion?: string;
}

export interface ChatMessage {
  id: string;
  remitente_id: string;
  remitente_nombre?: string;
  destinatario_id?: string;
  mensaje: string;
  contenido?: string;
  tipo?: 'texto' | 'imagen' | 'documento';
  attachment_url?: string;
  attachment_name?: string;
  attachment_mime?: string;
  caption?: string;
  fecha_envio: string;
  created_at?: string;
  leido: boolean;
}

export interface Report {
  id: string;
  nombre: string;
  tipo: 'pacientes' | 'citas' | 'pagos' | 'financiero';
  fecha_generacion: string;
  url_descarga?: string;
}

export interface DashboardMetrics {
  totalPacientes: number;
  citasPendientes: number;
  citasCompletadas: number;
  ingresosTotales: number;
  pacientesNuevos?: number;
  totalCitas?: number;
}

export interface Treatment {
  id: string;
  paciente_id: string;
  odontologo_id: string;
  nombre: string;
  descripcion?: string;
  costo: number;
  estado: 'activo' | 'completado' | 'cancelado';
  fecha_inicio: string;
  fecha_fin?: string;
}

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  fecha: string;
  priority: 'low' | 'medium' | 'high';
  read: boolean;
}

export interface Alert {
  id: string;
  tipo: string;
  titulo: string;
  descripcion?: string;
  fecha_programada: string;
  prioridad: 'urgente' | 'alta' | 'media' | 'baja';
  paciente_id?: string;
  estado: 'activa' | 'completada' | 'cancelada';
}

// Tipos para formularios
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  nombre: string;
  email: string;
  password: string;
  rol: User['rol'];
}

export interface PatientFormData {
  nombre: string;
  dni?: string;
  telefono?: string;
  fecha_nacimiento?: string;
  direccion?: string;
}

export interface AppointmentFormData {
  paciente_id: string;
  doctor_id: string;
  fecha_hora: string;
  servicio: string;
  notas?: string;
}

// Tipos para API responses
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
