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
    <div className="min-h-screen flex bg-white">
      {/* Left minimal panel */}
      <div className="hidden lg:flex lg:w-[42%] flex-col justify-between p-16 bg-namay-navy relative overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-namay-steel/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-[24rem] h-[24rem] rounded-full bg-namay-coral/10 blur-3xl" />

        <div className="relative z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logonamay.png" alt="Dental Namay" className="h-10 w-auto object-contain brightness-0 invert" />
        </div>

        <div className="relative z-10 max-w-sm">
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-namay-coral/90 mb-6">
            Odontología Integral
          </p>
          <h1 className="text-4xl font-light leading-[1.15] text-white tracking-tight">
            Cuidado dental con <span className="font-semibold">calidez</span> y precisión.
          </h1>
          <p className="mt-6 text-sm font-light text-white/50 leading-relaxed">
            Accede al panel administrativo para gestionar pacientes, citas y operaciones de la clínica.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-6 text-[11px] uppercase tracking-[0.2em] text-white/30">
          <span>© 2026 Dental Namay</span>
          <span className="w-1 h-1 rounded-full bg-white/20" />
          <span>v1.0</span>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-16 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden mb-12">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logonamay.png" alt="Dental Namay" className="h-9 w-auto object-contain" />
          </div>

          <div className="mb-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-namay-coral mb-3">
              Iniciar sesión
            </p>
            <h2 className="text-3xl font-light text-namay-navy tracking-tight">
              Bienvenido de vuelta
            </h2>
            <p className="mt-2 text-sm text-namay-steel/80 font-light">
              Ingresa tus credenciales para continuar.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-namay-steel mb-2">
                Correo
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="tu@email.com"
                className="w-full px-0 py-2.5 text-[15px] text-namay-navy bg-transparent border-0 border-b border-gray-200 focus:outline-none focus:border-namay-coral focus:ring-0 placeholder:text-gray-300 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-namay-steel">
                  Contraseña
                </label>
                <button
                  type="button"
                  className="text-[11px] font-medium text-namay-steel/60 hover:text-namay-coral transition-colors"
                >
                  ¿Olvidaste?
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
                  className="w-full px-0 py-2.5 pr-10 text-[15px] text-namay-navy bg-transparent border-0 border-b border-gray-200 focus:outline-none focus:border-namay-coral focus:ring-0 placeholder:text-gray-300 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-300 hover:text-namay-steel transition-colors"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-md text-sm bg-danger-50 text-danger-600 border-l-2 border-danger-500 animate-fade-in">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-2 text-sm font-semibold text-white bg-namay-navy rounded-md transition-all duration-200 hover:bg-namay-coral disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                  Verificando...
                </>
              ) : (
                <>
                  Continuar
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <p className="mt-12 text-center text-[11px] uppercase tracking-[0.2em] text-namay-steel/40">
            Acceso seguro · Dental Namay
          </p>
        </div>
      </div>
    </div>
  );
}
