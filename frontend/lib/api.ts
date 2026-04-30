const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

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
      const error = await response.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(error.message || `HTTP ${response.status}`);
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

  // Patients endpoints
  async getPatients() {
    return this.request('/pacientes');
  }

  async updatePatientState(id: string, state: string) {
    return this.request(`/pacientes/${id}/state`, {
      method: 'PUT',
      body: JSON.stringify({ estado: state }),
    });
  }

  // Appointments endpoints
  async getAppointments() {
    return this.request('/citas');
  }

  async createAppointment(appointment: any) {
    return this.request('/citas', {
      method: 'POST',
      body: JSON.stringify(appointment),
    });
  }

  async updateAppointment(id: string, appointment: any) {
    return this.request(`/citas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(appointment),
    });
  }

  // Payments endpoints
  async getPayments() {
    return this.request('/pagos');
  }

  async createPayment(payment: any) {
    return this.request('/pagos', {
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

  // Users endpoints
  async getUsers() {
    return this.request('/users');
  }

  async getUser(id: string) {
    return this.request(`/users/${id}`);
  }

  async createUser(user: any) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  }

  async updateUser(id: string, user: any) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(user),
    });
  }

  async deleteUser(id: string) {
    return this.request(`/users/${id}`, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;