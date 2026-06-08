'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/api';
import { ExclamationCircleIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

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
      <div className="flex items-center justify-center p-6">
        <div className="spinner-namay" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-btn bg-danger-50 border border-danger-100 text-danger-700 text-sm">
        <ExclamationCircleIcon className="h-4 w-4 flex-shrink-0" />
        {error}
      </div>
    );
  }

  if (!dentist) {
    return null;
  }

  const fullName = `Dr/Dra. ${dentist.nombre} ${dentist.apellido ?? ''}`.trim();
  const initials = `${dentist.nombre?.charAt(0) ?? ''}${dentist.apellido?.charAt(0) ?? ''}`.toUpperCase();

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-namay-cream/40 border border-namay-steel/10 rounded-card">
        {dentist.foto_perfil ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dentist.foto_perfil}
            alt={dentist.nombre}
            className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow-card"
          />
        ) : (
          <div className="avatar-initials w-11 h-11 bg-gradient-to-br from-namay-navy to-namay-steel">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-namay-navy truncate">
            {fullName}
          </p>
          <p className="text-xs text-namay-steel line-clamp-1">
            {dentist.biografia || 'Sin biografía'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-base p-6 hover:shadow-card-md transition-shadow">
      <div className="flex gap-4 mb-5">
        {dentist.foto_perfil ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dentist.foto_perfil}
            alt={dentist.nombre}
            className="w-20 h-20 rounded-full object-cover ring-2 ring-white shadow-card-md"
          />
        ) : (
          <div className="avatar-initials w-20 h-20 bg-gradient-to-br from-namay-navy to-namay-steel text-lg">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-2xl font-bold text-namay-navy truncate">
            {fullName}
          </h3>
          <p className="text-sm text-namay-steel mt-1">Odontólogo/a</p>
        </div>
      </div>

      {dentist.biografia && (
        <div className="pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <DocumentTextIcon className="h-4 w-4 text-namay-steel" />
            <h4 className="font-semibold text-namay-navy text-sm">Acerca de</h4>
          </div>
          <p className="text-namay-navy leading-relaxed whitespace-pre-wrap text-sm">
            {dentist.biografia}
          </p>
        </div>
      )}
    </div>
  );
}
