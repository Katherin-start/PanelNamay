'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Payment } from '@/types';
import { apiClient } from '@/lib/api';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const data = await apiClient.getPayments();
        setPayments(data);
      } catch (error) {
        console.error('Error al cargar pagos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pagos</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestión de pagos y facturación
          </p>
        </div>
        {/* Aquí puedes agregar un botón para registrar nuevo pago */}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {payments.map((payment) => (
          <Card key={payment.id}>
            <CardHeader>
              <CardTitle className="text-lg">
                {payment.paciente_nombre}
              </CardTitle>
              <CardDescription>
                {new Date(payment.fecha).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600">
                <p>Monto: S/ {payment.monto.toFixed(2)}</p>
                <p>Método: {payment.metodo_pago}</p>
                <p>Estado: <span className={`font-medium ${
                  payment.estado === 'completado' ? 'text-green-600' :
                  payment.estado === 'pendiente' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {payment.estado}
                </span></p>
                <p>Servicio: {payment.servicio}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}