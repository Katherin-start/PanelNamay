'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { TagIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import StatusBadge from '@/components/ui/StatusBadge';

export default function MyRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    try {
      const response: any = await apiClient.getDiscounts();
      const arr: any[] = Array.isArray(response) ? response : (response?.discounts ?? response?.data ?? []);
      const mine = arr.filter((d) => d.creado_por === user?.id);
      setRequests(mine);
    } catch (e) {
      console.error('Error cargando mis solicitudes', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user) fetch(); }, [user]);

  if (!user) return null;
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="spinner-namay" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-5 border-b border-gray-100">
        <div>
          <p className="eyebrow">Solicitudes</p>
          <h3 className="mt-2 text-xl font-semibold text-namay-navy">Mis solicitudes de descuento</h3>
          <p className="mt-1 text-sm text-namay-steel/60 font-medium">Revisa el estado de las solicitudes enviadas y el historial de creación.</p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] bg-success-50 text-success-700 rounded-full">
          <CheckCircleIcon className="h-3.5 w-3.5" />
          {requests.length} solicitudes
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="bg-namay-cream/40 border border-dashed border-gray-200 p-10 text-center">
          <TagIcon className="h-10 w-10 mx-auto text-namay-steel/30 mb-2" strokeWidth={1.5} />
          <p className="text-sm text-namay-steel/60 font-medium">No tienes solicitudes registradas todavía.</p>
        </div>
      ) : (
        <div className="space-y-px bg-gray-100">
          {requests.map((r) => (
            <div key={r.id} className="bg-white p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <TagIcon className="h-5 w-5 text-namay-steel/60 mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold text-namay-navy">{r.nombre}</p>
                    <p className="text-sm text-namay-steel/70 font-medium mt-0.5">{r.descripcion}</p>
                  </div>
                </div>
                <div className="flex flex-col items-start gap-1 sm:items-end flex-shrink-0">
                  {r.estado && <StatusBadge status={r.estado} kind="payment" />}
                  <span className="text-[11px] text-namay-steel/60 font-medium tabular">
                    {r.creado_en ? new Date(r.creado_en || r.solicitado_en).toLocaleDateString('es-PE') : ''}
                  </span>
                </div>
              </div>

              <div className="mt-5 grid gap-px sm:grid-cols-3 bg-gray-100">
                <div className="bg-white px-3 py-2.5">
                  <p className="eyebrow">Valor</p>
                  <p className="text-sm font-semibold text-namay-navy mt-1 tabular">
                    {r.tipo === 'porcentaje' ? `${r.valor}%` : `S/ ${Number(r.valor).toFixed(2)}`}
                  </p>
                </div>
                <div className="bg-white px-3 py-2.5">
                  <p className="eyebrow">Vigencia</p>
                  <p className="text-sm font-semibold text-namay-navy mt-1 tabular">
                    {r.fecha_inicio} → {r.fecha_fin}
                  </p>
                </div>
                <div className="bg-white px-3 py-2.5">
                  <p className="eyebrow">Aplica a</p>
                  <p className="text-sm font-semibold text-namay-navy mt-1 uppercase tracking-wide">
                    {r.aplica_a}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
