'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import apiClient from '@/lib/api';

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

  // Cargar biografía actual
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

      // Limpiar mensaje de éxito después de 3 segundos
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

  // Solo mostrar para odontólogos
  if (user?.rol !== 'ODONTOLOGO') {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl">
      <h2 className="text-2xl font-bold mb-2" style={{ color: '#1D3557' }}>
        Mi Biografía Profesional
      </h2>
      <p className="text-gray-600 text-sm mb-4">
        Comparte información sobre ti que los pacientes podrán ver en la aplicación móvil
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="biografia" className="block text-sm font-medium text-gray-700 mb-2">
            Biografía
          </label>
          <textarea
            id="biografia"
            value={biografia}
            onChange={handleChange}
            placeholder="Cuéntanos sobre tu experiencia, especialidades, y lo que te hace un gran odontólogo..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
            rows={6}
            disabled={loading}
          />
          <div className="text-right text-sm text-gray-500 mt-1">
            {charCount}/{MAX_CHARS} caracteres
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
            ✅ {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !biografia.trim()}
          className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
        >
          {loading ? 'Guardando...' : 'Guardar Biografía'}
        </button>
      </form>
    </div>
  );
}
