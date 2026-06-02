'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

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
  if (loading) return <div className="text-slate-600">Cargando tus solicitudes...</div>;

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Tus solicitudes</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">Mis solicitudes de descuento</h3>
            <p className="mt-1 text-sm text-slate-500">Revisa el estado de las solicitudes enviadas y el historial de creación.</p>
          </div>
          <div className="inline-flex items-center rounded-3xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
              <path d="M5 12L10 17L20 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {requests.length} solicitudes
          </div>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">No tienes solicitudes registradas todavía.</div>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => (
            <div key={r.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
              <div className="p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 6H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <path d="M4 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <path d="M4 18H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-slate-900">{r.nombre}</div>
                      <div className="mt-1 text-sm text-slate-500">{r.descripcion}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-start gap-1 text-right text-sm text-slate-500 sm:items-end">
                    <span>{r.estado?.toUpperCase()}</span>
                    <span>{r.creado_en ? new Date(r.creado_en || r.solicitado_en).toLocaleDateString() : ''}</span>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-600">Valor: {r.tipo === 'porcentaje' ? `${r.valor}%` : `S/ ${Number(r.valor).toFixed(2)}`}</div>
                  <div className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-600">Fechas: {r.fecha_inicio} → {r.fecha_fin}</div>
                  <div className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-600">Aplicable a: {r.aplica_a}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
