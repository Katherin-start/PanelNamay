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
    <div className="min-h-screen flex bg-namay-cream">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden bg-namay-navy">
        {/* Decorative blurred circles */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-namay-steel/15 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-namay-coral/20 blur-3xl" />
        <div className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full bg-namay-steel/10 blur-2xl" />

        <div className="relative z-10 text-center max-w-sm">
          {/* Logo */}
          <div className="flex items-center justify-center mb-10 animate-fade-in">
            <div className="bg-white rounded-2xl px-6 py-4 shadow-card-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logonamay.png" alt="Dental Namay" className="h-14 w-auto object-contain" />
            </div>
          </div>

          <p className="text-lg font-light text-white/70 tracking-[0.25em] mb-2">
            ODONTOLOGÍA INTEGRAL
          </p>
          <p className="text-sm text-white/40 mb-12">
            Sistema de gestión para el panel administrativo de la clínica dental
          </p>

          <div className="space-y-4 text-left">
            {[
              'Gestión completa de pacientes',
              'Control de citas y agendamiento',
              'Facturación y pagos integrados',
              'Reportes y estadísticas en tiempo real',
            ].map((text, i) => (
              <div
                key={text}
                className="flex items-center gap-3 animate-fade-in"
                style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'backwards' }}
              >
                <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-namay-coral shadow-coral">
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2 6l3 3 5-5"
                      stroke="white"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="text-sm text-white/70">{text}</span>
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
            <div className="bg-white rounded-xl px-4 py-2.5 shadow-card border border-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logonamay.png" alt="Dental Namay" className="h-14 w-auto object-contain" />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-8 animate-fade-in">
            <div className="mb-7">
              <h2 className="text-2xl font-bold tracking-tight text-namay-navy">Bienvenido</h2>
              <p className="text-sm mt-1.5 text-namay-steel">
                Ingresa tus credenciales para acceder al panel
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold mb-1.5 text-namay-navy">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="tu@email.com"
                  className="input-base"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="block text-sm font-semibold text-namay-navy">
                    Contraseña
                  </label>
                  <button
                    type="button"
                    className="text-xs font-medium text-namay-steel hover:text-namay-coral transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="input-base pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-namay-steel transition-colors"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
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
                <div className="flex items-center gap-2 p-3 rounded-btn text-sm bg-danger-50 text-danger-600 border border-danger-100">
                  <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Iniciando sesión...
                  </span>
                ) : (
                  'Iniciar Sesión'
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-xs mt-6 text-namay-steel">
            © 2026 Dental Namay · Odontología Integral
          </p>
        </div>
      </div>
    </div>
  );
}
