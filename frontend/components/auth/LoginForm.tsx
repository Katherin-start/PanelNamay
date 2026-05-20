'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { setUser } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.login({ email, password });
      if (response?.token) {
        localStorage.setItem('token', response.token);
      }
      if (response?.user) setUser(response.user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F1F4F9' }}>
      {/* Left decorative panel */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden"
        style={{ backgroundColor: '#1D3557' }}
      >
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-10" style={{ backgroundColor: '#457B9D' }} />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full opacity-10" style={{ backgroundColor: '#E63946' }} />
        <div className="relative z-10 text-center max-w-sm">
          {/* Logo */}
          <div className="flex items-center justify-center mb-10">
            <div className="bg-white rounded-2xl px-6 py-4 shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logonamay.png" alt="Dental Namay" className="h-14 w-auto object-contain" />
            </div>
          </div>
          <p className="text-lg font-light text-white/70 tracking-widest mb-2">ODONTOLOGÍA INTEGRAL</p>
          <p className="text-sm text-white/40 mb-12">Sistema de gestión para el panel administrativo de la clínica dental</p>
          <div className="space-y-4 text-left">
            {[
              'Gestión completa de pacientes',
              'Control de citas y agendamiento',
              'Facturación y pagos integrados',
              'Reportes y estadísticas en tiempo real',
            ].map((text) => (
              <div key={text} className="flex items-center gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E63946' }}>
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                <span className="text-sm text-white/60">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: login form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center justify-center mb-8 lg:hidden">
            <div className="bg-white rounded-xl px-4 py-2.5 shadow-sm border border-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logonamay.png" alt="Dental Namay" className="h-14 w-auto object-contain" />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold" style={{ color: '#1D3557' }}>Bienvenido</h2>
              <p className="text-sm mt-1" style={{ color: '#457B9D' }}>Ingresa tus credenciales para acceder al panel</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1.5" style={{ color: '#1D3557' }}>
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="tu@email.com"
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#457B9D] focus:bg-white transition-all"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-1.5" style={{ color: '#1D3557' }}>
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 pr-10 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#457B9D] focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ backgroundColor: '#FEF2F2', color: '#E63946' }}>
                  <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 text-sm font-semibold text-white rounded-lg transition-opacity hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#1D3557' }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Iniciando sesión...
                  </span>
                ) : 'Iniciar Sesión'}
              </button>
            </form>
          </div>

          <p className="text-center text-xs mt-6" style={{ color: '#457B9D' }}>
            © 2026 Dental Namay · Odontología Integral
          </p>
        </div>
      </div>
    </div>
  );
}