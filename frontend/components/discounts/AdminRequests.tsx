'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
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
    return <p className="text-slate-600 text-center py-12">No tienes permiso para ver las solicitudes.</p>;

  if (loading)
    return <div className="text-slate-600 text-center py-12">Cargando solicitudes...</div>;

  const allRequests = requests;
  const pendingRequests = requests.filter((r) => r.estado === 'pendiente');
  const approvedCount = requests.filter((r) => r.estado === 'aprobado').length;
  const rejectedCount = requests.filter((r) => r.estado === 'rechazado').length;

  const porcentajes = requests
    .filter((r) => r.tipo === 'porcentaje' && r.valor)
    .map((r) => parseFloat(r.valor));
  const avgDiscount =
    porcentajes.length > 0
      ? (porcentajes.reduce((a, b) => a + b, 0) / porcentajes.length).toFixed(2)
      : '0';

  return (
    <div className="max-w-6xl mx-auto px-4 pt-4">
      <div className="text-center mb-6">
        <p className="text-sm uppercase tracking-[0.32em] text-slate-400">Descuentos</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">Panel de Descuentos</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-500">
          Supervisa las solicitudes pendientes y administra su estado desde un tablero profesional.
        </p>
      </div>

      {/* TARJETA DE MÉTRICAS - CENTRADA Y ELEGANTE */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-100 shadow-sm p-6 mb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {/* Pendientes */}
          <div>
            <div className="text-3xl md:text-4xl font-semibold text-slate-800">
              {pendingRequests.length}
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-600">Pendientes</div>
            <div className="text-xs text-slate-400">Solicitudes activas</div>
          </div>
          {/* Aprobados */}
          <div>
            <div className="text-3xl md:text-4xl font-semibold text-emerald-600">
              {approvedCount}
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-600">Aprobados</div>
            <div className="text-xs text-slate-400">Este mes</div>
          </div>
          {/* Rechazados */}
          <div>
            <div className="text-3xl md:text-4xl font-semibold text-rose-500">
              {rejectedCount}
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-600">Rechazados</div>
            <div className="text-xs text-slate-400">Este mes</div>
          </div>
          {/* Promedio */}
          <div>
            <div className="text-3xl md:text-4xl font-semibold text-indigo-600">
              {avgDiscount}%
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-600">Descuento promedio</div>
            <div className="text-xs text-slate-400">Este mes</div>
          </div>
        </div>
      </div>

      {/* SECCIÓN DE SOLICITUDES PENDIENTES */}
      <div className="border-t border-slate-200 pt-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Solicitudes</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Revisa y administra solicitudes pendientes, aprobadas y rechazadas
            </p>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition shadow-sm flex items-center justify-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Nueva solicitud
          </button>
        </div>

        {/* Modal: Crear solicitud (azul) */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreateModal(false)} />
            <div className="relative w-full max-w-2xl mx-4">
              <div className="rounded-2xl overflow-hidden shadow-lg">
                <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between">
                  <h3 className="text-white font-semibold">Nueva solicitud de descuento</h3>
                  <button className="text-white/90 hover:text-white" onClick={() => setShowCreateModal(false)}>✕</button>
                </div>
                <div className="bg-white p-6">
                  <CreateDiscountForm onSuccess={() => { setShowCreateModal(false); fetchRequests(); }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {allRequests.length === 0 ? (
          <div className="text-center text-slate-500 py-16 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <svg className="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 4H7a2 2 0 01-2-2V6a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V18a2 2 0 01-2 2z" />
            </svg>
            No hay solicitudes registradas
          </div>
        ) : (
          <div className="space-y-5">
            {allRequests.map((r) => (
              <div
                key={r.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">{r.nombre}</h3>
                      <p className="text-sm text-slate-500 mt-1">{r.descripcion}</p>
                    </div>
                    <span className={`text-xs font-semibold px-3 py-1.5 rounded-full uppercase tracking-wide ${r.estado === 'pendiente' ? 'bg-amber-50 text-amber-700' : r.estado === 'aprobado' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                      {r.estado === 'pendiente' ? 'Pendiente' : r.estado === 'aprobado' ? 'Aprobado' : 'Rechazado'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
                    <div>
                      <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                        Valor del descuento
                      </div>
                      <div className="text-2xl font-bold text-slate-700 mt-1">
                        {r.tipo === 'porcentaje' ? `${r.valor}%` : `S/ ${Number(r.valor).toFixed(2)}`}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                        Fechas
                      </div>
                      <div className="text-base font-medium text-slate-700 mt-1">
                        {r.fecha_inicio} → {r.fecha_fin}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                        Aplicable a
                      </div>
                      <div className="text-base font-medium text-slate-700 mt-1 uppercase">
                        {r.aplica_a}
                      </div>
                    </div>
                  </div>

                  {r.estado === 'pendiente' ? (
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                      <button
                        disabled={actionLoading === r.id}
                        onClick={() => handleAction(r.id, 'rechazado')}
                        className="px-5 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl transition disabled:opacity-50"
                      >
                        Rechazar
                      </button>
                      <button
                        disabled={actionLoading === r.id}
                        onClick={() => handleAction(r.id, 'aprobado')}
                        className="px-5 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition shadow-sm disabled:opacity-50"
                      >
                        Aprobar
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                      <span className="text-sm font-semibold text-slate-500">No se puede cambiar</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}