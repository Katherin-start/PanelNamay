const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const isJwtExpired = (token: string) => {
  try {
    const payload = token.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(atob(base64).split('').map((c) => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`).join(''));
    const parsed = JSON.parse(json);
    return typeof parsed.exp === 'number' && Date.now() / 1000 > parsed.exp;
  } catch {
    return false;
  }
};

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private getToken() {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem('token');
    if (!token) return null;
    if (isJwtExpired(token)) {
      console.warn('[API] JWT expirado, limpiando credenciales');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return null;
    }
    return token;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getToken();
    const isFormData = options.body instanceof FormData;

    const config: RequestInit = {
      ...options,
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...options.headers,
      },
    };

    // Debug: mostrar token y headers usados en la petición (temporal)
    try {
      // Solo en entorno cliente
      if (typeof window !== 'undefined') {
        console.debug('[API] request', { url, token: token ? `${token.slice(0, 8)}...` : null, headers: config.headers });
      }
    } catch (e) {}

    let response: Response;
    try {
      response = await fetch(url, config);
    } catch (err) {
      console.error('[API] Network error fetching', url, err);
      throw err;
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      let body: any = {};
      try {
        body = text ? JSON.parse(text) : { message: 'Error desconocido' };
      } catch (e) {
        body = { message: text || 'Error desconocido' };
      }

      if (response.status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        console.warn('[API] 401 recibido, auth limpia y se requiere login');
      }

      console.error('[API] Response error', { url, status: response.status, body, headers: config.headers });
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

  async getMyReviews() {
    return this.request('/auth/profile/reviews');
  }

  // 📝 Biografía del odontólogo
  async updateBiography(biografia: string) {
    return this.request('/auth/profile/biography', {
      method: 'PUT',
      body: JSON.stringify({ biografia }),
    });
  }

  // 🦷 Perfil del odontólogo (para pacientes)
  async getDentistProfile(dentistId: string) {
    return this.request(`/auth/dentists/${dentistId}`);
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

  private splitDateTime(value?: string) {
    if (!value) return {};
    const [fecha, rawHora] = value.split('T');
    const hora = rawHora?.slice(0, 5);
    return { fecha, hora };
  }

  // Patients endpoints — backend usa /patients con campos correo/created_at
  private normalizePatient(p: any) {
    return {
      ...p,
      dni:        p.dni        ?? '',
      email:      p.email      ?? p.correo ?? '',
      telefono:   p.telefono   ?? '',
      direccion:  p.direccion  ?? '',
      creado_en:  p.creado_en  ?? p.created_at  ?? '',
      estado:     p.estado     ?? 'activo',
      foto_perfil: p.foto_perfil ?? null,
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
    const res = await this.request('/patients', {
      method: 'POST',
      body: JSON.stringify({
        nombre: patient.nombre,
        dni: patient.dni,
        telefono: patient.telefono,
        fecha_nacimiento: patient.fecha_nacimiento,
        direccion: patient.direccion,
      }),
    });
    return this.normalizePatient(res?.patient ?? res?.data ?? res);
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

  async deletePatient(id: string) {
    return this.request(`/patients/${id}`, {
      method: 'DELETE',
    });
  }

  // Appointments endpoints — backend usa /appointments con fecha+hora separados
  private normalizeAppointment(a: any) {
    return {
      ...a,
      paciente_id:      a.paciente_id      ?? a.id_paciente ?? '',
      doctor_id:        a.doctor_id        ?? a.id_odontologo ?? '',
      fecha_hora:      a.fecha_hora      ?? (a.fecha && a.hora ? `${a.fecha}T${a.hora}` : a.fecha ?? ''),
      paciente_nombre: a.paciente_nombre ?? a.pacientes?.nombre ?? '',
      doctor_nombre:   a.doctor_nombre   ?? a.usuarios?.nombre   ?? '',
      servicio:        a.servicio        ?? a.descripcion ?? 'Consulta dental',
    };
  }

  async getAppointments() {
    const res = await this.request('/appointments');
    const arr: any[] = Array.isArray(res) ? res : (res?.data ?? res?.appointments ?? []);
    return arr.map((a: any) => this.normalizeAppointment(a));
  }

  async createAppointment(appointment: any) {
    const res = await this.request('/appointments', {
      method: 'POST',
      body: JSON.stringify({
        id_paciente: appointment.id_paciente ?? appointment.paciente_id,
        id_odontologo: appointment.id_odontologo ?? appointment.odontologo_id ?? appointment.doctor_id,
        estado: appointment.estado,
        ...this.splitDateTime(appointment.fecha_hora),
      }),
    });
    return this.normalizeAppointment(res?.data ?? res?.appointment ?? res);
  }

  async updateAppointment(id: string, appointment: any) {
    const res = await this.request(`/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        id_paciente: appointment.id_paciente ?? appointment.paciente_id,
        id_odontologo: appointment.id_odontologo ?? appointment.odontologo_id ?? appointment.doctor_id,
        estado: appointment.estado,
        ...this.splitDateTime(appointment.fecha_hora),
      }),
    });
    return this.normalizeAppointment(res?.data ?? res?.appointment ?? res);
  }

  // Payments endpoints — backend usa /payments con campo metodo en lugar de metodo_pago
  private normalizePayment(p: any) {
    return {
      ...p,
      paciente_id:     p.paciente_id     ?? p.id_paciente ?? '',
      paciente_nombre: p.paciente_nombre ?? p.pacientes?.nombre ?? p.usuarios?.nombre ?? '',
      metodo_pago:     p.metodo_pago     ?? p.metodo     ?? '',
      fecha:           p.fecha           ?? p.fecha_pago ?? '',
      monto:           Number(p.monto) || 0,
      servicio:        p.servicio        ?? p.descripcion ?? 'Pago registrado',
      descripcion:     p.descripcion ?? p.servicio ?? '',
      descuento_id:    p.descuento_id ?? p.discount_id ?? null,
      descuento_nombre:p.descuento_nombre ?? p.discount_name ?? '',
      descuento_tipo:  p.descuento_tipo ?? p.discount_tipo ?? '',
      descuento_valor: Number(p.descuento_valor) || Number(p.discount_value) || 0,
      monto_descuento: Number(p.monto_descuento) || Number(p.discount_amount) || 0,
      monto_final:     Number(p.monto_final) || Number(p.total) || Number(p.monto) || 0,
    };
  }

  async getPayments() {
    const res = await this.request('/payments');
    const arr: any[] = Array.isArray(res) ? res : (res?.data ?? res?.payments ?? []);
    return arr.map((p: any) => this.normalizePayment(p));
  }

  async createPayment(payment: any) {
    const res = await this.request('/payments', {
      method: 'POST',
      body: JSON.stringify({
        monto: payment.monto,
        metodo_pago: payment.metodo_pago ?? payment.metodo,
        estado: payment.estado,
        fecha: payment.fecha ?? payment.fecha_pago,
        descuento_id: payment.descuento_id,
        servicio: payment.servicio,
        descripcion: payment.descripcion,
      }),
    });
    return this.normalizePayment(res?.payment ?? res?.data ?? res);
  }

  // Reports endpoints
  async getDiscounts() {
    const res = await this.request('/discounts');
    const arr: any[] = Array.isArray(res) ? res : (res?.data ?? res?.discounts ?? []);
    return arr.map((d: any) => ({
      id: d.id,
      nombre: d.nombre,
      descripcion: d.descripcion,
      tipo: d.tipo,
      valor: Number(d.valor) || 0,
      fecha_inicio: d.fecha_inicio,
      fecha_fin: d.fecha_fin,
      aplica_a: d.aplica_a,
      estado: d.estado,
      activo: d.activo,
      creado_por: d.creado_por ?? d.created_by ?? null,
      creado_en: d.creado_en ?? d.solicitado_en ?? d.created_at ?? null,
      aprobado_por: d.aprobado_por ?? null,
      aprobado_en: d.aprobado_en ?? null,
      visible: d.visible ?? false,
    }));
  }

  async createDiscount(payload: any) {
    const res = await this.request('/discounts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res?.discount ?? res?.data ?? res;
  }

  async approveDiscount(id: string, accion: 'aprobado' | 'rechazado') {
    const res = await this.request(`/discounts/${id}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ accion }),
    });
    return res?.discount ?? res?.data ?? res;
  }

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

  private normalizeChatMessage(m: any) {
    return {
      ...m,
      mensaje: m.mensaje ?? m.contenido ?? '',
      contenido: m.contenido ?? m.mensaje ?? '',
      fecha_envio: m.fecha_envio ?? m.created_at ?? '',
    };
  }

  // Chat endpoints
  async getChatMessages(userId: string) {
    if (!userId) return [];
    const res = await this.request(`/chat/messages/${userId}`);
    const arr: any[] = Array.isArray(res) ? res : (res?.messages ?? res?.data ?? []);
    return arr.map((m) => this.normalizeChatMessage(m));
  }

  async sendMessage(message: any) {
    const res = await this.request('/chat/messages', {
      method: 'POST',
      body: JSON.stringify({
        destinatario_id: message.destinatario_id,
        contenido: message.contenido ?? message.mensaje ?? message.message,
        tipo: message.tipo ?? 'texto',
      }),
    });
    return this.normalizeChatMessage(res?.message ?? res?.data ?? res);
  }

  async sendChatAttachment(message: any) {
    const form = new FormData();
    form.append('destinatario_id', message.destinatario_id);
    if (message.caption) {
      form.append('caption', message.caption);
    }
    form.append('file', message.file);

    const res = await this.request('/chat/upload', {
      method: 'POST',
      body: form,
    });

    return this.normalizeChatMessage(res?.message ?? res?.data ?? res);
  }

  async getChatContacts() {
    return this.request('/chat/contacts');
  }

  async getUnreadMessageCount() {
    return this.request('/chat/unread-count');
  }

  async markChatMessagesAsRead(otherUserId: string) {
    return this.request('/chat/messages/mark-as-read', {
      method: 'POST',
      body: JSON.stringify({ otherUserId }),
    });
  }

  // 🗑️ Eliminar mensaje completamente
  async deleteMessage(messageId: string) {
    return this.request('/chat/messages/delete', {
      method: 'POST',
      body: JSON.stringify({ messageId }),
    });
  }

  // 🗑️ Vaciar chat
  async clearChat(otherUserId: string) {
    return this.request('/chat/clear', {
      method: 'POST',
      body: JSON.stringify({ otherUserId }),
    });
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
      dni: u.dni ?? '',
      telefono: u.telefono ?? u.phone ?? '',
      foto_perfil: u.foto_perfil ?? u.foto ?? u.photo ?? u.profile_photo ?? null,
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
    const res = await this.request(`/auth/users/${id}`, {
      method: 'DELETE',
    });
    return res;
  }

  // Profile photo endpoints
  async uploadProfilePhoto(file: File) {
    console.log('📸 Preparando carga de foto:', { fileName: file.name, size: file.size, type: file.type });
    
    const formData = new FormData();
    formData.append('foto', file);
    
    try {
      const res = await this.request('/auth/profile/photo', {
        method: 'PUT',
        body: formData,
      });
      console.log('✅ Foto cargada exitosamente:', res);
      return res;
    } catch (error: any) {
      console.error('❌ Error al cargar foto:', error);
      throw error;
    }
  }

  // Setup endpoints
  async initializeStorage() {
    try {
      return await this.request('/setup/initialize-storage', {
        method: 'POST',
      });
    } catch (error) {
      console.warn('Error al inicializar storage:', error);
      // No fallar, solo avisar
      return { code: 'INIT_ATTEMPTED', message: 'Inicialización completada' };
    }
  }

  async getHealthCheck() {
    try {
      return await this.request('/setup/health');
    } catch (error) {
      console.warn('Error al verificar salud del sistema:', error);
      return { code: 'HEALTH_ERROR', error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;
