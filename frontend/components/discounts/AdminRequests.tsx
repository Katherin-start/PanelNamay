'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PlusIcon, TagIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal from '@/components/ui/Modal';
import CreateDiscountForm from './CreateDiscountForm';

export default function AdminRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getDiscounts();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error cargando solicitudes', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (id: string, accion: 'aprobado' | 'rechazado') => {
    setActionLoading(id);
    try {
      await apiClient.approveDiscount(id, accion);
      await fetchRequests();
    } catch (err: any) {
      alert(err?.message ?? 'Error al procesar la acción');
    } finally {
      setActionLoading(null);
    }
  };

  if (!user) return null;
  if (user.rol !== 'ADMINISTRADOR')
    return (
      <div className="text-center py-20 text-sm text-namay-steel/60 dark:text-gray-400 font-medium">
        No tienes permiso para ver las solicitudes.
      </div>
    );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="spinner-namay" />
      </div>
    );
  }

  const pendingRequests = requests.filter((r) => r.estado === 'pendiente');
  const approvedCount = requests.filter((r) => r.estado === 'aprobado').length;
  const rejectedCount = requests.filter((r) => r.estado === 'rechazado').length;

  const porcentajes = requests
    .filter((r) => r.tipo === 'porcentaje' && r.valor)
    .map((r) => parseFloat(r.valor));
  const avgDiscount = porcentajes.length > 0 ? (porcentajes.reduce((a, b) => a + b, 0) / porcentajes.length).toFixed(2) : '0';

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Administración"
        title="Panel de descuentos"
        subtitle="Supervisa las solicitudes pendientes y administra su estado desde un tablero profesional."
        action={
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            <PlusIcon className="h-4 w-4" />
            Nueva solicitud
          </button>
        }
      />

      {/* Stats — hairline grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-100 dark:bg-gray-700">
        <div className="bg-white dark:bg-gray-800 p-6">
          <div className="flex items-center gap-2">
            <ClockIcon className="h-4 w-4 text-namay-steel/50 dark:text-gray-500" strokeWidth={1.5} />
            <p className="eyebrow">Pendientes</p>
          </div>
          <p className="mt-3 text-3xl font-medium text-namay-navy dark:text-gray-100 tabular">{pendingRequests.length}</p>
          <p className="text-[11px] mt-1.5 text-namay-steel/60 dark:text-gray-400 font-medium">Solicitudes activas</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="h-4 w-4 text-success-600" strokeWidth={1.5} />
            <p className="eyebrow">Aprobados</p>
          </div>
          <p className="mt-3 text-3xl font-medium text-success-600 tabular">{approvedCount}</p>
          <p className="text-[11px] mt-1.5 text-namay-steel/60 dark:text-gray-400 font-medium">Este mes</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6">
          <div className="flex items-center gap-2">
            <XCircleIcon className="h-4 w-4 text-danger-500" strokeWidth={1.5} />
            <p className="eyebrow">Rechazados</p>
          </div>
          <p className="mt-3 text-3xl font-medium text-danger-500 tabular">{rejectedCount}</p>
          <p className="text-[11px] mt-1.5 text-namay-steel/60 dark:text-gray-400 font-medium">Este mes</p>
        </div>
        <div className="bg-namay-navy p-6">
          <p className="text-[10px] font-semibold text-white/40 uppercase tracking-[0.25em]">Descuento promedio</p>
          <p className="mt-3 text-3xl font-medium text-white tabular">{avgDiscount}%</p>
          <p className="text-[11px] mt-1.5 text-white/40 font-medium">Porcentaje medio solicitado</p>
        </div>
      </div>

      {/* Solicitudes */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <p className="eyebrow">Solicitudes</p>
            <h2 className="mt-1 text-lg font-semibold text-namay-navy dark:text-gray-100">Todas las solicitudes</h2>
            <p className="text-sm text-namay-steel/60 dark:text-gray-400 font-medium mt-0.5">
              Revisa y administra solicitudes pendientes, aprobadas y rechazadas
            </p>
          </div>
        </div>

        {requests.length === 0 ? (
          <div className="bg-namay-cream/40 dark:bg-gray-800/40 border border-dashed border-gray-200 dark:border-gray-700 p-10 text-center">
            <TagIcon className="h-10 w-10 mx-auto text-namay-steel/30 dark:text-gray-600 mb-2" strokeWidth={1.5} />
            <p className="text-sm text-namay-steel/60 dark:text-gray-400 font-medium">No hay solicitudes registradas</p>
          </div>
        ) : (
          <div className="space-y-px bg-gray-100 dark:bg-gray-700">
            {requests.map((r) => (
              <div key={r.id} className="bg-white dark:bg-gray-800 p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-namay-navy dark:text-gray-100">{r.nombre}</h3>
                    <p className="text-sm text-namay-steel/70 dark:text-gray-400 font-medium mt-1">{r.descripcion}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <StatusBadge status={r.estado} kind="payment" />
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-px bg-gray-100 dark:bg-gray-700">
                  <div className="bg-white dark:bg-gray-800 px-4 py-3">
                    <p className="eyebrow">Valor del descuento</p>
                    <p className="text-base font-semibold text-namay-navy dark:text-gray-100 mt-1.5 tabular">
                      {r.tipo === 'porcentaje' ? `${r.valor}%` : `S/ ${Number(r.valor).toFixed(2)}`}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 px-4 py-3">
                    <p className="eyebrow">Vigencia</p>
                    <p className="text-base font-semibold text-namay-navy dark:text-gray-100 mt-1.5 tabular">
                      {r.fecha_inicio} → {r.fecha_fin}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 px-4 py-3">
                    <p className="eyebrow">Aplicable a</p>
                    <p className="text-base font-semibold text-namay-navy dark:text-gray-100 mt-1.5 uppercase tracking-wide">
                      {r.aplica_a}
                    </p>
                  </div>
                </div>

                {r.estado === 'pendiente' ? (
                  <div className="flex justify-end gap-3 mt-5 pt-5 border-t border-gray-100 dark:border-gray-700">
                    <button
                      disabled={actionLoading === r.id}
                      onClick={() => handleAction(r.id, 'rechazado')}
                      className="px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-danger-500 border-b border-transparent hover:border-danger-500 transition-colors disabled:opacity-50"
                    >
                      Rechazar
                    </button>
                    <button
                      disabled={actionLoading === r.id}
                      onClick={() => handleAction(r.id, 'aprobado')}
                      className="btn-primary !py-2 !text-xs"
                    >
                      Aprobar
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-end gap-3 mt-5 pt-5 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-namay-steel/40 dark:text-gray-500">No se puede cambiar</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Crear solicitud */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nueva solicitud de descuento"
        icon={<PlusIcon className="h-4 w-4 text-namay-navy dark:text-gray-200" />}
        size="lg"
      >
        <CreateDiscountForm onSuccess={() => { setShowCreateModal(false); fetchRequests(); }} />
      </Modal>
    </div>
  );
}
