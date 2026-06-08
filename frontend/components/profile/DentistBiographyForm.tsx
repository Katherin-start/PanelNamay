'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import apiClient from '@/lib/api';
import {
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

interface DentistBiographyFormProps {
  onSuccess?: () => void;
}

export default function DentistBiographyForm({ onSuccess }: DentistBiographyFormProps) {
  const { user } = useAuth();
  const [biografia, setBiografia] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [charCount, setCharCount] = useState(0);
  const MAX_CHARS = 1000;

  useEffect(() => {
    const loadBiography = async () => {
      try {
        const profile = await apiClient.getProfile();
        if (profile?.user?.biografia) {
          setBiografia(profile.user.biografia);
          setCharCount(profile.user.biografia.length);
        }
      } catch (err) {
        console.error('Error cargando biografía:', err);
      }
    };

    if (user?.rol === 'ODONTOLOGO') {
      loadBiography();
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!biografia.trim()) {
        throw new Error('La biografía no puede estar vacía');
      }

      await apiClient.updateBiography(biografia);
      setSuccess('Biografía actualizada exitosamente');

      if (onSuccess) {
        onSuccess();
      }

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message ?? 'Error al actualizar la biografía');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    if (text.length <= MAX_CHARS) {
      setBiografia(text);
      setCharCount(text.length);
    }
  };

  if (user?.rol !== 'ODONTOLOGO') {
    return null;
  }

  const progress = Math.min(100, (charCount / MAX_CHARS) * 100);
  const progressColor = progress > 90 ? 'bg-danger-500' : progress > 70 ? 'bg-warning-500' : 'bg-namay-coral';

  return (
    <div className="card-base p-6 max-w-2xl">
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="flex-shrink-0 w-9 h-9 rounded-btn bg-namay-coral/10 flex items-center justify-center">
            <DocumentTextIcon className="h-4 w-4 text-namay-coral" />
          </span>
          <h2 className="text-2xl font-bold text-namay-navy">
            Mi Biografía Profesional
          </h2>
        </div>
        <p className="text-sm text-namay-steel ml-11">
          Comparte información sobre ti que los pacientes podrán ver en la aplicación móvil
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="biografia" className="label-base">
            Biografía
          </label>
          <textarea
            id="biografia"
            value={biografia}
            onChange={handleChange}
            placeholder="Cuéntanos sobre tu experiencia, especialidades, y lo que te hace un gran odontólogo..."
            className="input-base resize-vertical leading-relaxed"
            rows={6}
            disabled={loading}
          />
          <div className="mt-2 flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-full ${progressColor}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-namay-steel tabular font-medium">
              {charCount}/{MAX_CHARS}
            </span>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-btn bg-danger-50 border border-danger-100 text-danger-700 text-sm animate-fade-in">
            <ExclamationCircleIcon className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3 rounded-btn bg-success-50 border border-success-100 text-success-700 text-sm animate-fade-in">
            <CheckCircleIcon className="h-4 w-4 flex-shrink-0" />
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !biografia.trim()}
          className="btn-primary w-full"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              Guardando...
            </>
          ) : (
            'Guardar Biografía'
          )}
        </button>
      </form>
    </div>
  );
}
