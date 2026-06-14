'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';
import {
  CheckCircleIcon,
  XCircleIcon,
  PhotoIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal, { ModalActions } from '@/components/ui/Modal';

interface Payment {
  id: number;
  monto: number;
  metodo_pago: string;
  comprobante: string;
  fecha: string;
  estado_validacion: string;
  usuarios_paciente?: { nombre: string; apellido: string; correo: string };
  paciente_nombre?: string;
  citas?: any;
  id_cita?: number;
}

export default function PendingPaymentProofsPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchPendingPayments = async () => {
      try {
        const data = await apiClient.getPendingValidationPayments();
        setPayments(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error al cargar comprobantes pendientes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingPayments();
  }, []);

  const handleSelectPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    setImagePreviewUrl(payment.comprobante || null);
    setShowModal(true);
  };

  const handleValidatePayment = async (status: 'APROBADO' | 'RECHAZADO') => {
    if (!selectedPayment) return;

    setValidating(true);
    try {
      const updated = await apiClient.validatePayment(String(selectedPayment.id), status);
      setPayments((prev) => prev.filter((p) => p.id !== selectedPayment.id));
      setShowModal(false);
      setSelectedPayment(null);
      setImagePreviewUrl(null);
    } catch (error: any) {
      console.error('Error validando comprobante:', error);
      alert(error.message || 'No se pudo validar el comprobante');
    } finally {
      setValidating(false);
    }
  };

  // Role check: solo CAJERO y RECEPCIONISTA
  if (user && !['CAJERO', 'RECEPCIONISTA'].includes(user.rol ?? '')) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Validación"
          title="Comprobantes de pago"
          subtitle="No tienes permiso para acceder a esta sección."
        />
        <div className="bg-namay-coral/10 border border-namay-coral/30 rounded-lg p-6 text-center">
          <p className="text-namay-coral font-medium">Acceso denegado</p>
          <p className="text-sm text-namay-steel/60 mt-1">Solo CAJERO y RECEPCIONISTA pueden validar comprobantes.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="spinner-namay" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        <PageHeader
          eyebrow="Validación"
          title="Comprobantes de pago pendientes"
          subtitle={`${payments.length} comprobante${payments.length !== 1 ? 's' : ''} por revisar`}
        />

        {payments.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-lg p-12 text-center">
            <PhotoIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-lg font-medium text-namay-navy mb-1">No hay comprobantes pendientes</p>
            <p className="text-sm text-namay-steel/60">Todos los comprobantes han sido validados</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleSelectPayment(payment)}
              >
                {/* Image Preview */}
                <div className="relative bg-gray-100 aspect-video overflow-hidden">
                  {payment.comprobante ? (
                    <img
                      src={payment.comprobante}
                      alt="Comprobante"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '';
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <PhotoIcon className="h-8 w-8 text-gray-300" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-namay-coral text-white px-2 py-1 rounded text-[11px] font-semibold">
                    POR CONFIRMAR
                  </div>
                </div>

                {/* Payment Details */}
                <div className="p-4 space-y-3">
                  <div>
                    <p className="text-[11px] text-namay-steel/60 font-medium uppercase tracking-[0.25em]">Paciente</p>
                    <p className="text-sm font-semibold text-namay-navy mt-1">
                      {payment.usuarios_paciente?.nombre} {payment.usuarios_paciente?.apellido}
                    </p>
                    <p className="text-[11px] text-namay-steel/60">{payment.usuarios_paciente?.correo}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-namay-steel/60 font-medium uppercase tracking-[0.25em]">Monto</p>
                      <p className="text-sm font-bold text-namay-navy tabular">S/ {payment.monto.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-namay-steel/60 font-medium uppercase tracking-[0.25em]">Método</p>
                      <p className="text-sm font-semibold text-namay-steel">{payment.metodo_pago}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-namay-steel/60 font-medium uppercase tracking-[0.25em]">Fecha</p>
                      <p className="text-sm font-semibold text-namay-steel">{payment.fecha}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-[10px] text-namay-steel/60 font-medium uppercase tracking-[0.25em] mb-2">Acción</p>
                    <p className="text-[11px] text-namay-coral font-semibold">Haz clic para validar →</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Validation Modal */}
      {showModal && selectedPayment && (
        <Modal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedPayment(null);
            setImagePreviewUrl(null);
          }}
          title="Validar comprobante de pago"
          size="lg"
        >
          <div className="space-y-6">
            {/* Image Preview */}
            {imagePreviewUrl && (
              <div className="bg-gray-100 rounded-lg overflow-hidden max-h-96">
                <img src={imagePreviewUrl} alt="Comprobante" className="w-full h-auto object-contain" />
              </div>
            )}

            {/* Payment Details */}
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-namay-steel/60 uppercase tracking-[0.25em]">Paciente</p>
                <p className="text-sm font-semibold text-namay-navy mt-2">
                  {selectedPayment.usuarios_paciente?.nombre} {selectedPayment.usuarios_paciente?.apellido}
                </p>
                <p className="text-xs text-namay-steel/60 mt-1">{selectedPayment.usuarios_paciente?.correo}</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs font-semibold text-namay-steel/60 uppercase tracking-[0.25em]">Monto</p>
                  <p className="text-xl font-bold text-namay-navy mt-2 tabular">S/ {selectedPayment.monto.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-namay-steel/60 uppercase tracking-[0.25em]">Método</p>
                  <p className="text-sm font-semibold text-namay-steel mt-2">{selectedPayment.metodo_pago}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-namay-steel/60 uppercase tracking-[0.25em]">Fecha</p>
                  <p className="text-sm font-semibold text-namay-steel mt-2">{selectedPayment.fecha}</p>
                </div>
              </div>

              {selectedPayment.citas && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                  <p className="text-xs font-semibold text-blue-900 uppercase tracking-[0.25em] mb-2">Cita asociada</p>
                  <p className="text-sm text-blue-800">
                    {selectedPayment.citas.hora} - {selectedPayment.citas.usuarios_paciente?.nombre || 'N/A'}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <ModalActions>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedPayment(null);
                  setImagePreviewUrl(null);
                }}
                disabled={validating}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleValidatePayment('RECHAZADO')}
                disabled={validating}
                className="btn-danger"
              >
                <XCircleIcon className="h-4 w-4" />
                Rechazar
              </button>
              <button
                onClick={() => handleValidatePayment('APROBADO')}
                disabled={validating}
                className="btn-primary"
              >
                <CheckCircleIcon className="h-4 w-4" />
                Aprobar
              </button>
            </ModalActions>
          </div>
        </Modal>
      )}
    </>
  );
}
