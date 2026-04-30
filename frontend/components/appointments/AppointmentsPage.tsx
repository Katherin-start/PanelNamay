'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Appointment } from '@/types';
import { apiClient } from '@/lib/api';

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const data = await apiClient.getAppointments();
        setAppointments(data);
      } catch (error) {
        console.error('Error al cargar citas:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
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
          <h1 className="text-2xl font-bold text-gray-900">Citas</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestión de citas médicas
          </p>
        </div>
        {/* Aquí puedes agregar un botón para crear nueva cita */}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {appointments.map((appointment) => (
          <Card key={appointment.id}>
            <CardHeader>
              <CardTitle className="text-lg">
                {appointment.paciente_nombre}
              </CardTitle>
              <CardDescription>
                {new Date(appointment.fecha_hora).toLocaleDateString()} • {appointment.hora}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600">
                <p>Estado: <span className={`font-medium ${
                  appointment.estado === 'confirmada' ? 'text-green-600' :
                  appointment.estado === 'pendiente' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {appointment.estado}
                </span></p>
                <p>Servicio: {appointment.servicio}</p>
                <p>Doctor: {appointment.doctor_nombre}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}