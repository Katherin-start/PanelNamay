const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = localStorage.getItem('token');

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const body = await response.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(body.message || body.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth endpoints
  async login(credentials: { email: string; password: string }) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(userData: any) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  async getProfile() {
    return this.request('/auth/profile');
  }

  // Dashboard endpoints
  async getDashboardMetrics() {
    return this.request('/dashboard/metrics');
  }

  async getNotifications() {
    return this.request('/dashboard/notifications');
  }

  async getAppointmentAlerts() {
    return this.request('/dashboard/appointment-alerts');
  }

  async getAttendanceAlerts() {
    return this.request('/dashboard/attendance-alerts');
  }

  // Patients endpoints — backend usa /patients con campos correo/created_at
  private normalizePatient(p: any) {
    return {
      ...p,
      dni:        p.dni        ?? '',
      telefono:   p.telefono   ?? '',
      creado_en:  p.creado_en  ?? p.created_at  ?? '',
      estado:     p.estado     ?? 'activo',
    };
  }

  async getPatients() {
    const res = await this.request('/patients');
    const arr: any[] = Array.isArray(res) ? res : (res?.patients ?? res?.data ?? []);
    return arr.map((p: any) => this.normalizePatient(p));
  }

  async getPatient(id: string) {
    const res = await this.request(`/patients/${id}`);
    return this.normalizePatient(res?.patient ?? res?.data ?? res);
  }

  async createPatient(patient: any) {
    return this.request('/patients', {
      method: 'POST',
      body: JSON.stringify(patient),
    });
  }

  async updatePatient(id: string, patient: any) {
    return this.request(`/patients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(patient),
    });
  }

  async updatePatientState(id: string, state: string) {
    return this.request(`/patients/${id}/state`, {
      method: 'PUT',
      body: JSON.stringify({ estado: state }),
    });
  }

  // Appointments endpoints — backend usa /appointments con fecha+hora separados
  private normalizeAppointment(a: any) {
    return {
      ...a,
      fecha_hora:      a.fecha_hora      ?? (a.fecha && a.hora ? `${a.fecha}T${a.hora}` : a.fecha ?? ''),
      paciente_nombre: a.paciente_nombre ?? a.pacientes?.nombre ?? '',
      doctor_nombre:   a.doctor_nombre   ?? a.usuarios?.nombre   ?? '',
      servicio:        a.servicio        ?? a.descripcion ?? '',
    };
  }

  async getAppointments() {
    const res = await this.request('/appointments');
    const arr: any[] = Array.isArray(res) ? res : (res?.data ?? res?.appointments ?? []);
    return arr.map((a: any) => this.normalizeAppointment(a));
  }

  async createAppointment(appointment: any) {
    return this.request('/appointments', {
      method: 'POST',
      body: JSON.stringify(appointment),
    });
  }

  async updateAppointment(id: string, appointment: any) {
    return this.request(`/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(appointment),
    });
  }

  // Payments endpoints — backend usa /payments con campo metodo en lugar de metodo_pago
  private normalizePayment(p: any) {
    return {
      ...p,
      paciente_nombre: p.paciente_nombre ?? p.pacientes?.nombre ?? p.usuarios?.nombre ?? '',
      metodo_pago:     p.metodo_pago     ?? p.metodo     ?? '',
      fecha:           p.fecha           ?? p.fecha_pago ?? '',
      servicio:        p.servicio        ?? p.descripcion ?? '',
    };
  }

  async getPayments() {
    const res = await this.request('/payments');
    const arr: any[] = Array.isArray(res) ? res : (res?.data ?? res?.payments ?? []);
    return arr.map((p: any) => this.normalizePayment(p));
  }

  async createPayment(payment: any) {
    return this.request('/payments', {
      method: 'POST',
      body: JSON.stringify(payment),
    });
  }

  // Reports endpoints
  async getReports() {
    return this.request('/reports');
  }

  async generateReport(type: string) {
    return this.request('/reports/generate', {
      method: 'POST',
      body: JSON.stringify({ type }),
    });
  }

  async generateIncomeReport(params?: any) {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    return this.request(`/reports/income${queryString}`);
  }

  async generatePatientsReport() {
    return this.request('/reports/patients');
  }

  async generateAppointmentsReport(params?: any) {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    return this.request(`/reports/appointments${queryString}`);
  }

  async generateAttendanceReport(params?: any) {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    return this.request(`/reports/attendance${queryString}`);
  }

  async generateHoursReport(params?: any) {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    return this.request(`/reports/hours${queryString}`);
  }

  async generateTodayAppointmentsReport() {
    return this.request('/reports/appointments/today');
  }

  async downloadReport(type: string, params?: Record<string, string>): Promise<Blob> {
    const endpointMap: Record<string, string> = {
      pacientes: '/reports/patients',
      citas: '/reports/appointments',
      ingresos: '/reports/income',
      asistencia: '/reports/attendance',
      horas: '/reports/hours',
      financiero: '/reports/income',
    };
    const endpoint = endpointMap[type] ?? `/reports/${type}`;
    const queryString =
      params && Object.keys(params).length > 0 ? `?${new URLSearchParams(params)}` : '';
    const url = `${this.baseURL}${endpoint}${queryString}`;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const res = await fetch(url, {
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    });
    if (!res.ok) throw new Error(`Error ${res.status} al generar el reporte`);
    return res.blob();
  }

  // Chat endpoints
  async getChatMessages() {
    return this.request('/chat/messages');
  }

  async sendMessage(message: any) {
    return this.request('/chat/messages', {
      method: 'POST',
      body: JSON.stringify(message),
    });
  }

  async getChatContacts() {
    return this.request('/chat/contacts');
  }

  async getUnreadMessageCount() {
    return this.request('/chat/unread-count');
  }

  // Users endpoints — el backend usa /auth/users para listar, /auth/register para crear
  private rolIdToName(rolId: number): string {
    const map: Record<number, string> = {
      1: 'ADMINISTRADOR',
      2: 'ODONTOLOGO',
      3: 'RECEPCIONISTA',
      4: 'CAJERO',
      5: 'PRACTICANTE',
    };
    return map[rolId] ?? 'PRACTICANTE';
  }

  private rolToId(rol: string): number {
    const map: Record<string, number> = {
      administrador: 1, admin: 1, ADMINISTRADOR: 1,
      odontologo: 2, doctor: 2, ODONTOLOGO: 2,
      recepcionista: 3, RECEPCIONISTA: 3,
      cajero: 4, CAJERO: 4,
      practicante: 5, PRACTICANTE: 5,
    };
    return map[rol] ?? 5;
  }

  private normalizeUser(u: any) {
    return {
      id: u.id,
      nombre: u.nombre ?? '',
      email: u.email ?? u.correo ?? '',
      rol: u.rol ?? u.roles?.nombre ?? this.rolIdToName(u.rol_id) ?? '',
      activo: u.activo ?? (u.estado === 'activo'),
      estado: u.estado ?? (u.activo ? 'activo' : 'inactivo'),
      creado_en: u.creado_en ?? u.created_at ?? '',
      ultimo_acceso: u.ultimo_acceso ?? u.last_sign_in_at ?? undefined,
    };
  }

  async getUsers() {
    const res = await this.request('/auth/users');
    const arr: any[] = Array.isArray(res) ? res : (res?.users ?? res?.data ?? []);
    return arr.map((u: any) => this.normalizeUser(u));
  }

  async getUser(id: string) {
    return this.request(`/auth/profile`);
  }

  async createUser(user: any) {
    // Crear usuario vía auth/register (solo ADMINISTRADOR)
    const res = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email:    user.email,
        password: user.password,
        nombre:   user.nombre,
        rol_id:   this.rolToId(user.rol ?? user.role ?? 'practicante'),
      }),
    });
    const raw = res?.user ?? res?.usuario ?? res;
    return { user: this.normalizeUser(raw) };
  }

  async updateUser(id: string, user: any) {
    // No hay endpoint PUT /users en el backend actual
    return { usuario: user };
  }

  async deleteUser(id: string) {
    // No hay endpoint DELETE /users en el backend actual
    return {};
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;