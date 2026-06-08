'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal from '@/components/ui/Modal';
import {
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  PencilSquareIcon,
  StarIcon,
  UserCircleIcon,
  LightBulbIcon,
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

  useEffect(() => {
    if (!isLoading && user?.rol !== 'ODONTOLOGO') {
      router.push('/dashboard');
    }
  }, [isLoading, user, router]);

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
      setSuccess('Biografía actualizada exitosamente');
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
        <div className="spinner-namay" />
      </div>
    );
  }

  if (user?.rol !== 'ODONTOLOGO') {
    return null;
  }

  const ratingPromedio = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Mi Perfil"
        title="Biografía Profesional"
        subtitle="Cuéntales a tus pacientes sobre tu experiencia, especialidades y filosofía profesional"
        icon={<UserCircleIcon className="h-6 w-6" />}
      />

      {/* Stat row: biografia estado + rating promedio */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-base p-5">
          <p className="text-[10px] font-semibold text-namay-steel uppercase tracking-[0.1em]">Estado</p>
          <div className="mt-2 flex items-center gap-2">
            {biografiaGuardada ? (
              <>
                <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
                <p className="text-sm font-semibold text-namay-navy">Publicada</p>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-warning-500" />
                <p className="text-sm font-semibold text-namay-navy">Sin publicar</p>
              </>
            )}
          </div>
        </div>
        <div className="card-base p-5">
          <p className="text-[10px] font-semibold text-namay-steel uppercase tracking-[0.1em]">Reseñas</p>
          <p className="mt-2 text-2xl font-bold text-namay-navy tabular">{reviews.length}</p>
        </div>
        <div className="card-base p-5 bg-gradient-to-br from-namay-navy to-namay-steel">
          <p className="text-[10px] font-semibold text-white/60 uppercase tracking-[0.1em]">Rating promedio</p>
          <div className="mt-2 flex items-baseline gap-1.5">
            <p className="text-2xl font-bold text-white tabular">
              {ratingPromedio ?? '—'}
            </p>
            {ratingPromedio && <StarIcon className="h-4 w-4 text-namay-coral" />}
          </div>
        </div>
      </div>

      {/* Mensaje de éxito flotante */}
      {success && (
        <div className="flex items-center gap-2 p-3 rounded-btn text-sm bg-success-50 text-success-700 border border-success-100 animate-fade-in">
          <CheckCircleIcon className="h-4 w-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Modo Visualización */}
      {!isEditing && biografiaGuardada && (
        <div className="card-base p-6 space-y-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold mb-3 text-namay-navy">
              <CheckCircleIcon className="h-5 w-5 text-success-500" />
              Biografía publicada
            </p>
            <div className="bg-namay-cream/40 rounded-card p-5 border border-namay-steel/10">
              <p className="text-base leading-relaxed text-namay-navy whitespace-pre-wrap">
                {biografiaGuardada}
              </p>
            </div>
            <p className="text-xs text-namay-steel mt-2 tabular">
              {biografiaGuardada.length} / {MAX_CHARS} caracteres
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => {
                setBiografia(biografiaGuardada);
                setIsEditing(true);
              }}
              className="btn-primary"
            >
              <PencilSquareIcon className="h-4 w-4" />
              Actualizar Biografía
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="btn-cancel"
            >
              Volver
            </button>
          </div>
        </div>
      )}

      {/* Reseñas de pacientes */}
      {!isEditing && (
        <div className="card-base p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-namay-navy">
              Reseñas de pacientes
            </p>
            <StatusBadge variant="info">
              {reviews.length} reseña{reviews.length === 1 ? '' : 's'}
            </StatusBadge>
          </div>

          {reviewsLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="spinner-namay" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-8 text-namay-steel text-sm">
              <StarIcon className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              No hay reseñas aún. Las reseñas de pacientes aparecerán aquí cuando se publiquen desde la app móvil.
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div key={review.id} className="rounded-card border border-gray-100 p-4 hover:border-namay-steel/30 hover:shadow-card transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-1.5 text-namay-coral">
                      {Array.from({ length: Math.max(0, Number(review.rating) || 0) }).map((_, index) => (
                        <StarIcon key={index} className="h-4 w-4 fill-current" />
                      ))}
                      <span className="text-sm font-bold text-namay-navy ml-1 tabular">{review.rating}/5</span>
                    </div>
                    <span className="text-xs text-namay-steel tabular">
                      {review.creado_en ? new Date(review.creado_en).toLocaleDateString('es-PE') : ''}
                    </span>
                  </div>
                  <p className="text-sm text-namay-navy mt-3 leading-relaxed">
                    {review.comentario || 'Sin comentario'}
                  </p>
                  <p className="text-xs text-namay-steel mt-3 pt-3 border-t border-gray-100">
                    Paciente: <span className="font-semibold text-namay-navy">{review.pacientes?.nombre || 'Anónimo'} {review.pacientes?.apellido || ''}</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modo Edición */}
      {(isEditing || !biografiaGuardada) && (
        <form onSubmit={handleSubmit} className={`card-base p-6 space-y-6 ${isEditing ? 'ring-2 ring-namay-coral/30' : ''}`}>
          <div>
            <label className="flex items-center gap-2 label-base">
              <DocumentTextIcon className="h-4 w-4" />
              {isEditing ? 'Editar Biografía' : 'Mi Biografía Profesional'}
            </label>
            <textarea
              value={biografia}
              onChange={(e) => setBiografia(e.target.value.slice(0, MAX_CHARS))}
              placeholder="Cuéntale a tus pacientes sobre tu experiencia, especialidades, certificaciones, y filosofía profesional..."
              className="input-base h-56 resize-none text-base leading-relaxed"
            />
            <div className="mt-2 flex items-center justify-between text-sm">
              <p className="text-namay-steel">
                <span className="font-bold text-namay-navy tabular">{biografia.length}</span>
                <span className="text-gray-400"> / {MAX_CHARS} caracteres</span>
              </p>
              {biografia.length > 900 && (
                <StatusBadge variant="warning">
                  <ExclamationCircleIcon className="h-3 w-3" />
                  Casi al límite
                </StatusBadge>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-3 p-4 rounded-btn bg-danger-50 text-danger-700 border border-danger-100 animate-fade-in">
              <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Guardando...
                </>
              ) : (
                'Guardar Biografía'
              )}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="btn-cancel"
            >
              {biografiaGuardada ? 'Cancelar' : 'Volver'}
            </button>
          </div>
        </form>
      )}

      {/* Info box */}
      <div className="flex gap-3 p-4 rounded-card bg-info-50 border border-info-100">
        <div className="flex-shrink-0 w-9 h-9 rounded-btn bg-info-100 flex items-center justify-center">
          <LightBulbIcon className="h-4 w-4 text-info-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-info-700">Consejo profesional</p>
          <p className="text-sm text-namay-navy mt-1 leading-relaxed">
            Tu biografía será visible para los pacientes en la app móvil cuando busquen información sobre ti.
            Asegúrate de incluir tu experiencia, especialidades principales y lo que te hace único como profesional.
          </p>
        </div>
      </div>
    </div>
  );
}
