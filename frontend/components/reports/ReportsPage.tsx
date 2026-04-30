'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Report } from '@/types';
import { apiClient } from '@/lib/api';
import { DocumentIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const data = await apiClient.getReports();
        setReports(data);
      } catch (error) {
        console.error('Error al cargar reportes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const handleGenerateReport = async (type: string) => {
    try {
      await apiClient.generateReport(type);
      // Recargar reportes después de generar uno nuevo
      const data = await apiClient.getReports();
      setReports(data);
    } catch (error) {
      console.error('Error al generar reporte:', error);
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
          <p className="mt-1 text-sm text-gray-500">
            Generación y descarga de reportes del sistema
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Reporte de Pacientes</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => handleGenerateReport('pacientes')}
              className="w-full"
            >
              Generar
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Reporte de Citas</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => handleGenerateReport('citas')}
              className="w-full"
            >
              Generar
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Reporte de Pagos</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => handleGenerateReport('pagos')}
              className="w-full"
            >
              Generar
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Reporte Financiero</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => handleGenerateReport('financiero')}
              className="w-full"
            >
              Generar
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-medium text-gray-900">Reportes Generados</h2>
        <div className="grid grid-cols-1 gap-4">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center space-x-3">
                  <DocumentIcon className="h-6 w-6 text-gray-400" />
                  <div>
                    <CardTitle className="text-base">{report.nombre}</CardTitle>
                    <CardDescription>
                      Generado el {new Date(report.fecha_generacion).toLocaleDateString()}
                    </CardDescription>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                  Descargar
                </Button>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}