'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Patient } from '@/types';
import { apiClient } from '@/lib/api';

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const data = await apiClient.getPatients();
        setPatients(data);
      } catch (error) {
        console.error('Error al cargar pacientes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
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
          <h1 className="text-2xl font-bold text-gray-900">Pacientes</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestión de pacientes del sistema
          </p>
        </div>
        {/* Aquí puedes agregar un botón para crear nuevo paciente */}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {patients.map((patient) => (
          <Card key={patient.id}>
            <CardHeader>
              <CardTitle className="text-lg">{patient.nombre}</CardTitle>
              <CardDescription>
                {patient.email} • {patient.telefono}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600">
                <p>Estado: <span className={`font-medium ${patient.estado === 'activo' ? 'text-green-600' : 'text-red-600'}`}>
                  {patient.estado}
                </span></p>
                <p>Registrado: {new Date(patient.creado_en).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}