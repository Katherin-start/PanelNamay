'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Payment } from '@/types';
import { apiClient } from '@/lib/api';
import {
  CurrencyDollarIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal, { ModalActions } from '@/components/ui/Modal';

const methodLabels: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  seguro: 'Seguro',
  yape: 'Yape',
};

export default function PaymentsPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [payForm, setPayForm] = useState({ monto: '', descripcion: '', metodo: 'efectivo', fecha_pago: '', estado: 'completado', descuento_id: '' });

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

  useEffect(() => {
    const fetchDiscounts = async () => {
      try {
        const data = await apiClient.getDiscounts();
        setDiscounts(Array.isArray(data) ? data : []);
      } catch (error) {
        console.warn('No se pudieron cargar los descuentos:', error);
      }
    };
    fetchDiscounts();
  }, []);

  const filtered = payments.filter(
    (p) =>
      p.paciente_nombre?.toLowerCase().includes(search.toLowerCase()) ||
      p.servicio?.toLowerCase().includes(search.toLowerCase()) ||
      p.metodo_pago?.toLowerCase().includes(search.toLowerCase()),
  );

  const canApplyDiscount = ['ADMINISTRADOR', 'CAJERO'].includes(user?.rol ?? '');
  const selectedDiscount = discounts.find((d) => d.id === payForm.descuento_id);
  const baseAmount = Number(payForm.monto) || 0;
  const discountAmount = selectedDiscount
    ? selectedDiscount.tipo === 'porcentaje'
      ? Math.min(baseAmount * (selectedDiscount.valor / 100), baseAmount)
      : Math.min(Number(selectedDiscount.valor) || 0, baseAmount)
    : 0;
  const finalAmount = Number((baseAmount - discountAmount).toFixed(2));

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payForm.monto) { setFormError('El monto es obligatorio.'); return; }
    setSaving(true);
    setFormError('');
    try {
      await apiClient.createPayment({
        ...payForm,
        monto: parseFloat(payForm.monto),
        monto_final: finalAmount,
      });
      const fresh = await apiClient.getPayments();
      setPayments(Array.isArray(fresh) ? fresh : []);
      setShowNew(false);
      setPayForm({ monto: '', descripcion: '', metodo: 'efectivo', fecha_pago: '', estado: 'completado', descuento_id: '' });
    } catch (err: any) {
      setFormError(err.message ?? 'Error al registrar el pago.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="spinner-namay" />
      </div>
    );
  }

  const totalIngresos = payments
    .filter((p) => ['completado', 'pagado'].includes((p.estado || '').toLowerCase()))
    .reduce((acc, p) => acc + (Number(p.monto_final ?? p.monto) || 0), 0);
  const totalPendiente = payments
    .filter((p) => p.estado === 'pendiente')
    .reduce((acc, p) => acc + (Number(p.monto_final ?? p.monto) || 0), 0);

  return (
    <>
    <div className="space-y-6">
      <PageHeader
        eyebrow="Panel · Gestión de Pagos"
        title="Pagos y Facturación"
        subtitle="Registra y controla los pagos de los pacientes."
        action={
          <button
            onClick={() => { setPayForm({ monto: '', descripcion: '', metodo: 'efectivo', fecha_pago: '', estado: 'completado', descuento_id: '' }); setFormError(''); setShowNew(true); }}
            className="btn-primary"
          >
            <PlusIcon className="h-4 w-4" />
            Registrar Pago
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-card p-5 text-white bg-gradient-to-br from-namay-navy to-namay-steel shadow-card-md">
          <p className="text-[11px] font-semibold text-white/70 uppercase tracking-[0.1em]">Ingresos Totales</p>
          <p className="text-3xl font-bold mt-2 tabular">S/ {totalIngresos.toFixed(2)}</p>
          <p className="text-xs text-white/60 mt-1">Pagos completados</p>
        </div>
        <div className="card-base p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: '#F59E0B' }}>
            Pendiente de Cobro
          </p>
          <p className="text-3xl font-bold mt-2 text-namay-navy tabular">
            S/ {totalPendiente.toFixed(2)}
          </p>
          <p className="text-xs mt-1 text-gray-400">
            {payments.filter((p) => p.estado === 'pendiente').length} pagos pendientes
          </p>
        </div>
        <div className="card-base p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-namay-steel">
            Total Transacciones
          </p>
          <p className="text-3xl font-bold mt-2 text-namay-navy tabular">
            {payments.length}
          </p>
          <p className="text-xs mt-1 text-gray-400">Este período</p>
        </div>
      </div>

      {/* Table */}
      <div className="card-base overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar paciente o servicio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-search"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-namay-cream">
                <th className="table-header">Paciente</th>
                <th className="table-header">Servicio</th>
                <th className="table-header">Monto</th>
                <th className="table-header">Descuento</th>
                <th className="table-header">Total</th>
                <th className="table-header">Método</th>
                <th className="table-header">Fecha</th>
                <th className="table-header">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400 text-sm">
                    No se encontraron pagos
                  </td>
                </tr>
              ) : (
                filtered.map((payment) => (
                  <tr key={payment.id} className="hover:bg-namay-cream/50 transition-colors">
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold bg-namay-navy">
                          {payment.paciente_nombre?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-namay-navy">{payment.paciente_nombre}</span>
                      </div>
                    </td>
                    <td className="table-cell text-sm text-gray-600">{payment.servicio}</td>
                    <td className="table-cell">
                      <span className="text-sm font-bold text-namay-navy tabular">S/ {payment.monto.toFixed(2)}</span>
                    </td>
                    <td className="table-cell text-sm text-gray-600">
                      {payment.descuento_nombre ? (
                        `${payment.descuento_nombre} (${payment.descuento_tipo === 'porcentaje' ? `-${payment.descuento_valor}%` : `-S/ ${Number(payment.descuento_valor).toFixed(2)}`})`
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="table-cell text-sm font-semibold text-namay-navy tabular">
                      S/ {(Number(payment.monto_final ?? payment.monto) || 0).toFixed(2)}
                    </td>
                    <td className="table-cell text-sm text-gray-600">
                      {methodLabels[payment.metodo_pago] || payment.metodo_pago}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <CalendarIcon className="h-3.5 w-3.5 text-gray-400" />
                        {new Date(payment.fecha).toLocaleDateString('es-PE', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </div>
                    </td>
                    <td className="table-cell">
                      <StatusBadge status={payment.estado} kind="payment" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Mostrando <span className="font-semibold text-namay-navy">{filtered.length}</span> de {payments.length} pagos
            </p>
          </div>
        )}
      </div>
    </div>

    {/* ── MODAL: REGISTRAR PAGO ── */}
    <Modal
      open={showNew}
      onClose={() => setShowNew(false)}
      title="Registrar Pago"
      icon={<CurrencyDollarIcon className="h-5 w-5 text-white" />}
      size="lg"
      footer={
        <ModalActions
          onCancel={() => setShowNew(false)}
          onConfirm={() => document.getElementById('payment-form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))}
          confirmLabel={saving ? 'Guardando...' : 'Registrar Pago'}
          loading={saving}
        />
      }
    >
      <form id="payment-form" onSubmit={handleCreatePayment} className="space-y-4">
        {formError && (
          <div className="p-3 rounded-btn text-sm font-medium bg-danger-50 text-danger-600 border border-danger-100">
            {formError}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-base">Monto (S/) <span className="text-namay-coral">*</span></label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={payForm.monto}
              onChange={(e) => setPayForm((p) => ({ ...p, monto: e.target.value }))}
              className="input-base tabular"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="label-base">Fecha de Pago</label>
            <input
              type="date"
              value={payForm.fecha_pago}
              onChange={(e) => setPayForm((p) => ({ ...p, fecha_pago: e.target.value }))}
              className="input-base"
            />
          </div>
        </div>
        <div>
          <label className="label-base">Descripción / Servicio</label>
          <input
            type="text"
            value={payForm.descripcion}
            onChange={(e) => setPayForm((p) => ({ ...p, descripcion: e.target.value }))}
            className="input-base"
            placeholder="Ej: Limpieza dental, Ortodoncia..."
          />
        </div>
        {canApplyDiscount && payForm.descuento_id && (
          <div className="rounded-btn border border-info-100 bg-info-50 p-4">
            <p className="text-xs font-semibold text-info-700">Descuento aplicado</p>
            <p className="text-sm text-info-600 mt-1">
              {selectedDiscount?.nombre} - {selectedDiscount?.tipo === 'porcentaje' ? `-${selectedDiscount?.valor}%` : `-S/ ${selectedDiscount?.valor?.toFixed(2)}`}
            </p>
            <p className="text-xs text-info-600 mt-1 tabular">Total después de descuento: S/ {finalAmount.toFixed(2)}</p>
          </div>
        )}
        {canApplyDiscount && (
          <div>
            <label className="label-base">Descuento autorizado</label>
            <select
              value={payForm.descuento_id}
              onChange={(e) => setPayForm((p) => ({ ...p, descuento_id: e.target.value }))}
              className="input-base bg-white"
            >
              <option value="">Sin descuento</option>
              {discounts.map((discount) => (
                <option key={discount.id} value={discount.id}>
                  {discount.nombre} - {discount.tipo === 'porcentaje' ? `${discount.valor}%` : `S/ ${discount.valor.toFixed(2)}`} ({discount.fecha_inicio} → {discount.fecha_fin})
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-base">Método de Pago</label>
            <select
              value={payForm.metodo}
              onChange={(e) => setPayForm((p) => ({ ...p, metodo: e.target.value }))}
              className="input-base bg-white"
            >
              <option value="efectivo">Efectivo</option>
              <option value="yape">Yape</option>
              <option value="transferencia">Transferencia</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="seguro">Seguro</option>
            </select>
          </div>
          <div>
            <label className="label-base">Estado</label>
            <select
              value={payForm.estado}
              onChange={(e) => setPayForm((p) => ({ ...p, estado: e.target.value }))}
              className="input-base bg-white"
            >
              <option value="completado">Completado</option>
              <option value="pendiente">Pendiente</option>
              <option value="fallido">Fallido</option>
            </select>
          </div>
        </div>
      </form>
    </Modal>
    </>
  );
}
