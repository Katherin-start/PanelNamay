'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/api';

interface DentistProfileCardProps {
  dentistId: string;
  compact?: boolean;
}

interface DentistInfo {
  id: string;
  nombre: string;
  apellido?: string;
  biografia: string;
  foto_perfil?: string;
}

export default function DentistProfileCard({ dentistId, compact = false }: DentistProfileCardProps) {
  const [dentist, setDentist] = useState<DentistInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDentistProfile = async () => {
      try {
        setLoading(true);
        const response = await apiClient.getDentistProfile(dentistId);
        if (response?.dentist) {
          setDentist(response.dentist);
        }
      } catch (err: any) {
        console.error('Error cargando perfil del odontólogo:', err);
        setError(err.message ?? 'Error al cargar el perfil');
      } finally {
        setLoading(false);
      }
    };

    if (dentistId) {
      loadDentistProfile();
    }
  }, [dentistId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
        ⚠️ {error}
      </div>
    );
  }

  if (!dentist) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        {dentist.foto_perfil && (
          <img
            src={dentist.foto_perfil}
            alt={dentist.nombre}
            className="w-12 h-12 rounded-full object-cover"
          />
        )}
        <div>
          <p className="font-semibold text-gray-800">
            Dr/Dra. {dentist.nombre} {dentist.apellido || ''}
          </p>
          <p className="text-xs text-gray-600 line-clamp-1">
            {dentist.biografia || 'Sin biografía'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex gap-4 mb-4">
        {dentist.foto_perfil && (
          <img
            src={dentist.foto_perfil}
            alt={dentist.nombre}
            className="w-20 h-20 rounded-full object-cover"
          />
        )}
        <div>
          <h3 className="text-2xl font-bold text-gray-800">
            Dr/Dra. {dentist.nombre} {dentist.apellido || ''}
          </h3>
          <p className="text-sm text-gray-500">Odontólogo/a</p>
        </div>
      </div>

      {dentist.biografia && (
        <div className="border-t pt-4">
          <h4 className="font-semibold text-gray-800 mb-2">Acerca de</h4>
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
            {dentist.biografia}
          </p>
        </div>
      )}
    </div>
  );
}
