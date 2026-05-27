'use client';

import { useEffect, useState } from 'react';
import { Payment } from '@/types';
import { apiClient } from '@/lib/api';
import {
  CurrencyDollarIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const statusConfig: Record<string, { bg: string; text: string; label: string; Icon: any }> = {
  completado: { bg: '#DCFCE7', text: '#16A34A', label: 'COMPLETADO', Icon: CheckCircleIcon },
  pagado: { bg: '#DCFCE7', text: '#16A34A', label: 'PAGADO', Icon: CheckCircleIcon },
  pendiente: { bg: '#FEF9C3', text: '#92400E', label: 'PENDIENTE', Icon: ExclamationCircleIcon },
  fallido: { bg: '#FEE2E2', text: '#DC2626', label: 'FALLIDO', Icon: XCircleIcon },
  cancelado: { bg: '#F3F4F6', text: '#6B7280', label: 'CANCELADO', Icon: XCircleIcon },
};

const methodLabels: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  seguro: 'Seguro',
  yape: 'Yape',
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [payForm, setPayForm] = useState({ monto: '', descripcion: '', metodo: 'efectivo', fecha_pago: '', estado: 'completado' });

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const data = await apiClient.getPayments();
        setPayments(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error al cargar pagos:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, []);

  const filtered = payments.filter(
    (p) =>
      p.paciente_nombre?.toLowerCase().includes(search.toLowerCase()) ||
      p.servicio?.toLowerCase().includes(search.toLowerCase()) ||
      p.metodo_pago?.toLowerCase().includes(search.toLowerCase()),
  );

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payForm.monto) { setFormError('El monto es obligatorio.'); return; }
    setSaving(true);
    setFormError('');
    try {
      await apiClient.createPayment({ ...payForm, monto: parseFloat(payForm.monto) });
      const fresh = await apiClient.getPayments();
      setPayments(Array.isArray(fresh) ? fresh : []);
      setShowNew(false);
      setPayForm({ monto: '', descripcion: '', metodo: 'efectivo', fecha_pago: '', estado: 'completado' });
    } catch (err: any) {
      setFormError(err.message ?? 'Error al registrar el pago.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#457B9D] border-t-[#E63946]" />
      </div>
    );
  }

  const totalIngresos = payments
    .filter((p) => ['completado', 'pagado'].includes((p.estado || '').toLowerCase()))
    .reduce((acc, p) => acc + (Number(p.monto) || 0), 0);
  const totalPendiente = payments
    .filter((p) => p.estado === 'pendiente')
    .reduce((acc, p) => acc + (Number(p.monto) || 0), 0);

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: '#457B9D' }}>
            Panel · Gestión de Pagos
          </p>
          <h1 className="text-2xl font-bold mt-0.5" style={{ color: '#1D3557' }}>
            Pagos y Facturación
          </h1>
          <p className="text-sm mt-1 text-gray-500">Registra y controla los pagos de los pacientes.</p>
        </div>
        <button
          onClick={() => { setPayForm({ monto: '', descripcion: '', metodo: 'efectivo', fecha_pago: '', estado: 'completado' }); setFormError(''); setShowNew(true); }}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-lg transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#1D3557' }}
        >
          <PlusIcon className="h-4 w-4" />
          Registrar Pago
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl p-5 text-white" style={{ backgroundColor: '#1D3557' }}>
          <p className="text-xs font-medium text-white/70 uppercase tracking-wide">Ingresos Totales</p>
          <p className="text-3xl font-bold mt-2">S/ {totalIngresos.toFixed(2)}</p>
          <p className="text-xs text-white/60 mt-1">Pagos completados</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: '#F59E0B' }}>
            Pendiente de Cobro
          </p>
          <p className="text-3xl font-bold mt-2" style={{ color: '#1D3557' }}>
            S/ {totalPendiente.toFixed(2)}
          </p>
          <p className="text-xs mt-1 text-gray-400">
            {payments.filter((p) => p.estado === 'pendiente').length} pagos pendientes
          </p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: '#457B9D' }}>
            Total Transacciones
          </p>
          <p className="text-3xl font-bold mt-2" style={{ color: '#1D3557' }}>
            {payments.length}
          </p>
          <p className="text-xs mt-1 text-gray-400">Este período</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar paciente o servicio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#457B9D]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: '#F1F4F9' }}>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Paciente</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Servicio</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Monto</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Método</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                    No se encontraron pagos
                  </td>
                </tr>
              ) : (
                filtered.map((payment) => {
                  const s = statusConfig[payment.estado] || statusConfig.pendiente;
                  const StatusIcon = s.Icon;
                  return (
                    <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                            style={{ backgroundColor: '#1D3557' }}
                          >
                            {payment.paciente_nombre?.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium" style={{ color: '#1D3557' }}>
                            {payment.paciente_nombre}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{payment.servicio}</td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-bold" style={{ color: '#1D3557' }}>
                          S/ {payment.monto.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {methodLabels[payment.metodo_pago] || payment.metodo_pago}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <CalendarIcon className="h-3.5 w-3.5 text-gray-400" />
                          {new Date(payment.fecha).toLocaleDateString('es-PE', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full"
                          style={{ backgroundColor: s.bg, color: s.text }}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {s.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Mostrando {filtered.length} de {payments.length} pagos
          </p>
          <div className="flex items-center gap-1">
            {['‹', '1', '2', '3', '›'].map((p, i) => (
              <button
                key={i}
                className={`w-7 h-7 text-xs rounded flex items-center justify-center transition-colors ${
                  p === '1' ? 'text-white' : 'text-gray-500 hover:bg-gray-100'
                }`}
                style={p === '1' ? { backgroundColor: '#1D3557' } : {}}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>

    {/* ── MODAL: REGISTRAR PAGO ── */}
    {showNew && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(29,53,87,0.55)' }}
        onClick={(e) => { if (e.target === e.currentTarget) setShowNew(false); }}
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-bold" style={{ color: '#1D3557' }}>Registrar Pago</h2>
            <button
              onClick={() => setShowNew(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleCreatePayment}>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Monto (S/) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={payForm.monto}
                    onChange={(e) => setPayForm((p) => ({ ...p, monto: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#457B9D]"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Fecha de Pago</label>
                  <input
                    type="date"
                    value={payForm.fecha_pago}
                    onChange={(e) => setPayForm((p) => ({ ...p, fecha_pago: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#457B9D]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Descripción / Servicio</label>
                <input
                  type="text"
                  value={payForm.descripcion}
                  onChange={(e) => setPayForm((p) => ({ ...p, descripcion: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#457B9D]"
                  placeholder="Ej: Limpieza dental, Ortodoncia..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Método de Pago</label>
                  <select
                    value={payForm.metodo}
                    onChange={(e) => setPayForm((p) => ({ ...p, metodo: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#457B9D] bg-white"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="yape">Yape</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="seguro">Seguro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Estado</label>
                  <select
                    value={payForm.estado}
                    onChange={(e) => setPayForm((p) => ({ ...p, estado: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#457B9D] bg-white"
                  >
                    <option value="completado">Completado</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="fallido">Fallido</option>
                  </select>
                </div>
              </div>
              {formError && (
                <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>
              )}
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button
                type="button"
                onClick={() => setShowNew(false)}
                className="flex-1 py-2.5 text-sm font-medium border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 text-sm font-semibold text-white rounded-xl transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: '#1D3557' }}
              >
                {saving ? 'Guardando...' : 'Registrar Pago'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  );
}
