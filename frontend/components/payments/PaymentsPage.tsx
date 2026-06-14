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
  CheckIcon,
  XMarkIcon,
  PhotoIcon,
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
  const [detailLoading, setDetailLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
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
  const canValidatePayments = ['ADMINISTRADOR', 'CAJERO', 'RECEPCIONISTA'].includes(user?.rol ?? '');
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

  const closeDetailModal = () => setSelectedPayment(null);

  const handleValidatePayment = async (status: 'APROBADO' | 'RECHAZADO') => {
    if (!selectedPayment) return;
    setValidating(true);
    try {
      const updated = await apiClient.validatePayment(selectedPayment.id, status);
      setPayments((prev) => prev.map((payment) => (payment.id === updated.id ? updated : payment)));
      setSelectedPayment(updated);
    } catch (err: any) {
      console.error('Error validando pago:', err);
      window.alert(err?.message ?? 'No se pudo actualizar el estado del pago.');
    } finally {
      setValidating(false);
    }
  };

  const handleDeleteProof = async () => {
    if (!selectedPayment) return;
    setValidating(true);
    try {
      const updated = await apiClient.deletePaymentProof(selectedPayment.id);
      setPayments((prev) => prev.map((payment) => (payment.id === updated.id ? updated : payment)));
      setSelectedPayment(updated);
    } catch (err: any) {
      console.error('Error eliminando comprobante:', err);
      window.alert(err?.message ?? 'No se pudo eliminar el comprobante.');
    } finally {
      setValidating(false);
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
    <div className="space-y-8">
      <PageHeader
        eyebrow="Gestión financiera"
        title="Pagos y facturación"
        subtitle="Registra y controla los pagos de los pacientes."
        action={
          <button
            onClick={() => { setPayForm({ monto: '', descripcion: '', metodo: 'efectivo', fecha_pago: '', estado: 'completado', descuento_id: '' }); setFormError(''); setShowNew(true); }}
            className="btn-primary"
          >
            <PlusIcon className="h-4 w-4" />
            Registrar pago
          </button>
        }
      />

      {/* Stats — hairline grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-gray-100">
        <div className="bg-namay-navy p-6">
          <p className="text-[10px] font-semibold text-white/40 uppercase tracking-[0.25em]">Ingresos totales</p>
          <p className="mt-3 text-3xl font-medium text-white tabular">S/ {totalIngresos.toFixed(2)}</p>
          <p className="text-[11px] mt-1.5 text-white/40 font-medium">Pagos completados</p>
        </div>
        <div className="bg-white p-6">
          <p className="eyebrow">Pendiente de cobro</p>
          <p className="mt-3 text-3xl font-medium text-namay-coral tabular">S/ {totalPendiente.toFixed(2)}</p>
          <p className="text-[11px] mt-1.5 text-namay-steel/60 font-medium">
            {payments.filter((p) => p.estado === 'pendiente').length} pagos pendientes
          </p>
        </div>
        <div className="bg-white p-6">
          <p className="eyebrow">Total transacciones</p>
          <p className="mt-3 text-3xl font-medium text-namay-navy tabular">{payments.length}</p>
          <p className="text-[11px] mt-1.5 text-namay-steel/60 font-medium">Este período</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlassIcon className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
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
              <tr>
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
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-14 text-sm text-namay-steel/40 font-medium">
                    No se encontraron pagos
                  </td>
                </tr>
              ) : (
                filtered.map((payment) => (
                  <tr
                    key={payment.id}
                    className="cursor-pointer hover:bg-gray-50/50 transition-colors"
                    onClick={() => setSelectedPayment(payment)}
                  >
                    <td className="table-cell">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-semibold flex-shrink-0 bg-namay-navy">
                          {payment.paciente_nombre?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold text-namay-navy">{payment.paciente_nombre}</span>
                      </div>
                    </td>
                    <td className="table-cell text-sm text-namay-steel font-medium">{payment.servicio}</td>
                    <td className="table-cell">
                      <span className="text-sm font-medium text-namay-steel/80 tabular">S/ {payment.monto.toFixed(2)}</span>
                    </td>
                    <td className="table-cell text-sm text-namay-steel font-medium">
                      {payment.descuento_nombre ? (
                        `${payment.descuento_nombre} (${payment.descuento_tipo === 'porcentaje' ? `-${payment.descuento_valor}%` : `-S/ ${Number(payment.descuento_valor).toFixed(2)}`})`
                      ) : (
                        <span className="text-namay-steel/30">—</span>
                      )}
                    </td>
                    <td className="table-cell text-sm font-semibold text-namay-navy tabular">
                      S/ {(Number(payment.monto_final ?? payment.monto) || 0).toFixed(2)}
                    </td>
                    <td className="table-cell text-sm text-namay-steel font-medium">
                      {methodLabels[payment.metodo_pago] || payment.metodo_pago}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1.5 text-sm text-namay-steel font-medium tabular">
                        <CalendarIcon className="h-3.5 w-3.5 text-namay-steel/40" />
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
          <div className="px-6 py-3 border-t border-gray-100">
            <p className="text-[11px] font-medium text-namay-steel/60 uppercase tracking-[0.15em] tabular">
              Mostrando <span className="text-namay-navy font-semibold">{filtered.length}</span> de {payments.length} pagos
            </p>
          </div>
        )}
      </div>
    </div>

    {/* ── MODAL: REGISTRAR PAGO ── */}
    <Modal
      open={showNew}
      onClose={() => setShowNew(false)}
      title="Registrar pago"
      icon={<CurrencyDollarIcon className="h-4 w-4 text-namay-navy" />}
      size="lg"
      footer={
        <ModalActions
          onCancel={() => setShowNew(false)}
          onConfirm={() => document.getElementById('payment-form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))}
          confirmLabel={saving ? 'Guardando...' : 'Registrar pago'}
          loading={saving}
        />
      }
    >
      <form id="payment-form" onSubmit={handleCreatePayment} className="space-y-5">
        {formError && (
          <div className="p-3 text-sm font-medium text-danger-700 bg-danger-50 border-l-2 border-danger-500">
            {formError}
          </div>
        )}
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="label-base">Monto (S/) <span className="text-namay-coral">*</span></label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={payForm.monto}
              onChange={(e) => setPayForm((p) => ({ ...p, monto: e.target.value }))}
              className="input-underline tabular"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="label-base">Fecha de pago</label>
            <input
              type="date"
              value={payForm.fecha_pago}
              onChange={(e) => setPayForm((p) => ({ ...p, fecha_pago: e.target.value }))}
              className="input-underline"
            />
          </div>
        </div>
        <div>
          <label className="label-base">Descripción / Servicio</label>
          <input
            type="text"
            value={payForm.descripcion}
            onChange={(e) => setPayForm((p) => ({ ...p, descripcion: e.target.value }))}
            className="input-underline"
            placeholder="Ej: Limpieza dental, Ortodoncia..."
          />
        </div>
        {canApplyDiscount && payForm.descuento_id && (
          <div className="p-4 border-l-2 border-info-500 bg-info-50">
            <p className="text-[10px] font-semibold text-info-700 uppercase tracking-[0.2em]">Descuento aplicado</p>
            <p className="text-sm font-medium text-info-700 mt-1.5">
              {selectedDiscount?.nombre} - {selectedDiscount?.tipo === 'porcentaje' ? `-${selectedDiscount?.valor}%` : `-S/ ${selectedDiscount?.valor?.toFixed(2)}`}
            </p>
            <p className="text-[11px] text-info-600 mt-1.5 tabular font-medium">Total después de descuento: S/ {finalAmount.toFixed(2)}</p>
          </div>
        )}
        {canApplyDiscount && (
          <div>
            <label className="label-base">Descuento autorizado</label>
            <select
              value={payForm.descuento_id}
              onChange={(e) => setPayForm((p) => ({ ...p, descuento_id: e.target.value }))}
              className="input-underline bg-white"
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
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="label-base">Método de pago</label>
            <select
              value={payForm.metodo}
              onChange={(e) => setPayForm((p) => ({ ...p, metodo: e.target.value }))}
              className="input-underline bg-white"
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
              className="input-underline bg-white"
            >
              <option value="completado">Completado</option>
              <option value="pendiente">Pendiente</option>
              <option value="fallido">Fallido</option>
            </select>
          </div>
        </div>
      </form>
    </Modal>

    {selectedPayment && (
      <Modal
        open={!!selectedPayment}
        onClose={closeDetailModal}
        title={`Pago #${selectedPayment.id}`}
        icon={<CurrencyDollarIcon className="h-4 w-4 text-namay-navy" />}
        size="lg"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-gray-100 p-4 bg-slate-50">
              <p className="text-[11px] font-semibold text-namay-steel uppercase tracking-[0.25em]">Paciente</p>
              <p className="mt-2 text-sm font-semibold text-namay-navy">{selectedPayment.paciente_nombre}</p>
              <p className="mt-1 text-sm text-namay-steel">{selectedPayment.servicio || 'Pago registrado'}</p>
            </div>
            <div className="rounded-2xl border border-gray-100 p-4 bg-slate-50">
              <p className="text-[11px] font-semibold text-namay-steel uppercase tracking-[0.25em]">Monto total</p>
              <p className="mt-2 text-2xl font-semibold text-namay-navy">S/ {(Number(selectedPayment.monto_final ?? selectedPayment.monto) || 0).toFixed(2)}</p>
              <p className="mt-1 text-sm text-namay-steel">Método: {methodLabels[selectedPayment.metodo_pago] || selectedPayment.metodo_pago}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-gray-100 p-4 bg-white">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-namay-steel">Estado</p>
              <StatusBadge status={selectedPayment.estado} kind="payment" />
            </div>
            <div className="rounded-2xl border border-gray-100 p-4 bg-white">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-namay-steel">Validación</p>
              <p className="mt-2 text-sm font-semibold text-namay-navy">{selectedPayment.estado_validacion || 'Sin validación'}</p>
            </div>
            <div className="rounded-2xl border border-gray-100 p-4 bg-white">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-namay-steel">Fecha</p>
              <p className="mt-2 text-sm font-semibold text-namay-navy">{new Date(selectedPayment.fecha).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-slate-50 p-4">
            <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-namay-navy">
              <PhotoIcon className="h-4 w-4" />
              <span>Comprobante de pago</span>
            </div>
            {selectedPayment.comprobante ? (
              <a
                href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/payments/${selectedPayment.id}/proof`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/payments/${selectedPayment.id}/proof`}
                  alt="Comprobante de pago"
                  className="w-full max-h-96 object-contain rounded-2xl border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                />
              </a>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-12 text-center text-sm text-namay-steel">
                No se encontró ninguna captura de comprobante.
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => window.open(apiClient.getPaymentReceiptUrl(selectedPayment.id), '_blank')}
                className="btn-secondary"
              >
                Emitir boleta
              </button>
              <button
                type="button"
                onClick={() => window.open(apiClient.getPaymentInvoiceUrl(selectedPayment.id), '_blank')}
                className="btn-secondary"
              >
                Emitir factura
              </button>
            </div>

            {selectedPayment.comprobante && canValidatePayments && (
              <button
                type="button"
                onClick={handleDeleteProof}
                className="btn-secondary text-danger-700 border-danger-200 hover:bg-danger-50"
                disabled={validating}
              >
                {validating ? 'Eliminando...' : 'Eliminar comprobante'}
              </button>
            )}
          </div>

          {(canValidatePayments && selectedPayment.estado === 'pendiente') && (
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => handleValidatePayment('RECHAZADO')}
                className="btn-secondary w-full sm:w-auto"
                disabled={validating}
              >
                {validating ? 'Actualizando...' : 'Rechazar pago'}
              </button>
              <button
                type="button"
                onClick={() => handleValidatePayment('APROBADO')}
                className="btn-primary w-full sm:w-auto"
                disabled={validating}
              >
                {validating ? 'Actualizando...' : 'Confirmar pago'}
              </button>
            </div>
          )}
        </div>
      </Modal>
    )}
    </>
  );
}
