'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';
import {
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  PencilSquareIcon,
  StarIcon,
} from '@heroicons/react/24/outline';

export default function DentistBiographyPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [biografia, setBiografia] = useState('');
  const [biografiaGuardada, setBiografiaGuardada] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviews, setReviews] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const MAX_CHARS = 1000;

  // Check access: Only dentists (ODONTOLOGO)
  useEffect(() => {
    if (!isLoading && user?.rol !== 'ODONTOLOGO') {
      router.push('/dashboard');
    }
  }, [isLoading, user, router]);

  // Load biography and reviews on mount
  useEffect(() => {
    const loadBiography = async () => {
      try {
        const profile = await apiClient.getProfile();
        if (profile?.user?.biografia) {
          setBiografia(profile.user.biografia);
          setBiografiaGuardada(profile.user.biografia);
        }
      } catch (err) {
        console.error('Error cargando biografía:', err);
        setError('Error al cargar tu biografía');
      } finally {
        setLoading(false);
      }
    };

    const loadReviews = async () => {
      try {
        const reviewsResponse = await apiClient.getMyReviews();
        setReviews(reviewsResponse?.reviews || []);
      } catch (err) {
        console.error('Error cargando reseñas:', err);
      } finally {
        setReviewsLoading(false);
      }
    };

    if (user?.rol === 'ODONTOLOGO') {
      loadBiography();
      loadReviews();
    }
  }, [user?.rol]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      if (!biografia.trim()) {
        throw new Error('La biografía no puede estar vacía');
      }

      if (biografia.length > MAX_CHARS) {
        throw new Error(`La biografía no puede exceder ${MAX_CHARS} caracteres`);
      }

      await apiClient.updateBiography(biografia);
      setBiografiaGuardada(biografia);
      setIsEditing(false);
      setSuccess('✅ Biografía actualizada exitosamente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al guardar la biografía');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setBiografia(biografiaGuardada);
    setIsEditing(false);
    setError('');
  };

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#457B9D] border-t-[#E63946] mx-auto mb-3" />
          <p className="text-sm" style={{ color: '#457B9D' }}>Cargando...</p>
        </div>
      </div>
    );
  }

  // Redirect if not a dentist
  if (user?.rol !== 'ODONTOLOGO') {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: '#457B9D' }}>
          Panel · Mi Perfil
        </p>
        <h1 className="text-3xl font-bold mt-1" style={{ color: '#1D3557' }}>
          Mi Biografía Profesional
        </h1>
        <p className="text-sm mt-2 text-gray-600">
          Cuéntales a tus pacientes sobre tu experiencia, especialidades y filosofía profesional.
        </p>
      </div>

      {/* Modo Visualización (Biografía Guardada) */}
      {!isEditing && biografiaGuardada && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold mb-3" style={{ color: '#1D3557' }}>
              <CheckCircleIcon className="h-5 w-5" style={{ color: '#16A34A' }} />
              Biografía Guardada
            </p>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-base leading-relaxed text-gray-700 whitespace-pre-wrap">
                {biografiaGuardada}
              </p>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {biografiaGuardada.length} / {MAX_CHARS} caracteres
            </p>
          </div>

          {/* Buttons - Modo Visualización */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => {
                setBiografia(biografiaGuardada);
                setIsEditing(true);
              }}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-white font-semibold transition-all hover:shadow-md"
              style={{ backgroundColor: '#457B9D' }}
            >
              <PencilSquareIcon className="h-5 w-5" />
              Actualizar Biografía
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-2.5 rounded-lg border border-gray-200 font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Volver
            </button>
          </div>
        </div>
      )}

      {/* Reseñas de pacientes */}
      {!isEditing && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold" style={{ color: '#1D3557' }}>
              Reseñas de pacientes
            </p>
            <p className="text-sm text-gray-500">
              {reviews.length} reseña{reviews.length === 1 ? '' : 's'}
            </p>
          </div>

          {reviewsLoading ? (
            <p className="text-sm text-gray-600">Cargando reseñas...</p>
          ) : reviews.length === 0 ? (
            <p className="text-sm text-gray-600">No hay reseñas aún. Las reseñas de pacientes aparecerán aquí cuando se publiquen desde la app móvil.</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-1 text-yellow-500">
                      {Array.from({ length: Math.max(0, Number(review.rating) || 0) }).map((_, index) => (
                        <StarIcon key={index} className="h-4 w-4" />
                      ))}
                      <span className="text-sm font-semibold text-gray-700">{review.rating}/5</span>
                    </div>
                    <span className="text-xs text-gray-500">{review.creado_en ? new Date(review.creado_en).toLocaleDateString('es-PE') : ''}</span>
                  </div>
                  <p className="text-sm text-gray-800 mt-3">
                    {review.comentario || 'Sin comentario'}
                  </p>
                  <p className="text-xs text-gray-500 mt-3">
                    Paciente: {review.pacientes?.nombre || 'Anónimo'} {review.pacientes?.apellido || ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modo Edición o Sin Biografía */}
      {(isEditing || !biografiaGuardada) && (
        <form onSubmit={handleSubmit} className={`bg-white rounded-xl border shadow-sm p-6 space-y-6 ${isEditing ? 'border-[#457B9D]' : 'border-gray-100'}`}>
          {/* Textarea */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold mb-3" style={{ color: '#1D3557' }}>
              <DocumentTextIcon className="h-5 w-5" style={{ color: '#457B9D' }} />
              {isEditing ? 'Editar Biografía' : 'Mi Biografía Profesional'}
            </label>
            <textarea
              value={biografia}
              onChange={(e) => setBiografia(e.target.value.slice(0, MAX_CHARS))}
              placeholder="Cuéntale a tus pacientes sobre tu experiencia, especialidades, certificaciones, y filosofía profesional..."
              className="w-full h-56 p-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#457B9D] focus:border-transparent resize-none text-base"
            />
            <div className="mt-2 flex items-center justify-between text-sm">
              <p className="text-gray-600">
                <span className="font-semibold">{biografia.length}</span>
                <span className="text-gray-400"> / {MAX_CHARS} caracteres</span>
              </p>
              {biografia.length > 900 && (
                <div className="flex items-center gap-1" style={{ color: '#E63946' }}>
                  <ExclamationCircleIcon className="h-4 w-4" />
                  Casi al límite
                </div>
              )}
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="p-4 rounded-lg flex items-start gap-3" style={{ backgroundColor: '#FEE2E2' }}>
              <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: '#E63946' }} />
              <p className="text-sm" style={{ color: '#E63946' }}>
                {error}
              </p>
            </div>
          )}

          {success && (
            <div className="p-4 rounded-lg flex items-start gap-3" style={{ backgroundColor: '#DCFCE7' }}>
              <CheckCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: '#16A34A' }} />
              <p className="text-sm" style={{ color: '#16A34A' }}>
                {success}
              </p>
            </div>
          )}

          {/* Buttons - Modo Edición */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-lg text-white font-semibold transition-all disabled:opacity-50"
              style={{ backgroundColor: '#457B9D' }}
            >
              {saving ? 'Guardando...' : 'Guardar Biografía'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2.5 rounded-lg border border-gray-200 font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {biografiaGuardada ? 'Cancelar' : 'Volver'}
            </button>
          </div>
        </form>
      )}

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
        <p className="text-sm font-semibold" style={{ color: '#1E40AF' }}>
          💡 Consejo profesional
        </p>
        <p className="text-sm text-gray-700">
          Tu biografía será visible para los pacientes en la app móvil cuando busquen información sobre ti. 
          Asegúrate de incluir tu experiencia, especialidades principales y lo que te hace único como profesional.
        </p>
      </div>
    </div>
  );
}
