'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api';
import {
  ArrowDownTrayIcon,
  UsersIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ClockIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const reportTypes = [
  { id: 'pacientes', label: 'Reporte de Pacientes', description: 'Lista y estadísticas de pacientes registrados', icon: UsersIcon, color: '#1D3557', light: '#EFF6FF' },
  { id: 'citas', label: 'Reporte de Citas', description: 'Historial y estado de citas médicas', icon: CalendarIcon, color: '#457B9D', light: '#EFF6FF' },
  { id: 'ingresos', label: 'Reporte de Ingresos', description: 'Ingresos y facturación del período', icon: CurrencyDollarIcon, color: '#16A34A', light: '#F0FDF4' },
  { id: 'asistencia', label: 'Reporte de Asistencia', description: 'Control de asistencia de pacientes y doctores', icon: ChartBarIcon, color: '#E63946', light: '#FFF5F5' },
  { id: 'horas', label: 'Reporte de Horas', description: 'Horas trabajadas por doctor', icon: ClockIcon, color: '#7C3AED', light: '#EDE9FE' },
  { id: 'financiero', label: 'Reporte Financiero', description: 'Balance general y análisis financiero', icon: SparklesIcon, color: '#D97706', light: '#FFFBEB' },
];

export default function ReportsPage() {
  const [generating, setGenerating] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<(typeof reportTypes)[0] | null>(null);
  const [reportParams, setReportParams] = useState({ startDate: '', endDate: '' });
  const [downloadError, setDownloadError] = useState('');

  const handleDownload = async () => {
    if (!selectedReport) return;
    setGenerating(selectedReport.id);
    setDownloadError('');
    try {
      const params: Record<string, string> = {};
      if (reportParams.startDate) params.startDate = reportParams.startDate;
      if (reportParams.endDate) params.endDate = reportParams.endDate;
      const blob = await apiClient.downloadReport(selectedReport.id, params);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      setSelectedReport(null);
      setReportParams({ startDate: '', endDate: '' });
    } catch (err: any) {
      setDownloadError(err.message ?? 'No se pudo generar el reporte.');
    } finally {
      setGenerating(null);
    }
  };

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: '#457B9D' }}>
          Panel · Reportes
        </p>
        <h1 className="text-2xl font-bold mt-0.5" style={{ color: '#1D3557' }}>
          Reportes y Estadísticas
        </h1>
        <p className="text-sm mt-1 text-gray-500">Genera y descarga reportes detallados del sistema.</p>
      </div>

      {/* Report type cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportTypes.map((rt) => (
          <div
            key={rt.id}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4"
          >
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: rt.light }}
              >
                <rt.icon className="h-5 w-5" style={{ color: rt.color }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#1D3557' }}>
                  {rt.label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{rt.description}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedReport(rt);
                setReportParams({ startDate: '', endDate: '' });
                setDownloadError('');
              }}
              disabled={generating === rt.id}
              className="w-full py-2 text-sm font-semibold text-white rounded-lg transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ backgroundColor: rt.color }}
            >
              {generating === rt.id ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generando...
                </>
              ) : (
                <>
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  Generar Reporte
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>

    {/* ── MODAL: GENERAR REPORTE ── */}
    {selectedReport && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(29,53,87,0.55)' }}
        onClick={(e) => { if (e.target === e.currentTarget) setSelectedReport(null); }}
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: selectedReport.light }}
              >
                <selectedReport.icon className="h-5 w-5" style={{ color: selectedReport.color }} />
              </div>
              <h2 className="text-base font-bold" style={{ color: '#1D3557' }}>
                {selectedReport.label}
              </h2>
            </div>
            <button
              onClick={() => setSelectedReport(null)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="px-6 py-5 space-y-4">
            <p className="text-sm text-gray-500">{selectedReport.description}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Rango de fechas (opcional)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
                <input
                  type="date"
                  value={reportParams.startDate}
                  onChange={(e) => setReportParams((p) => ({ ...p, startDate: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#457B9D]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
                <input
                  type="date"
                  value={reportParams.endDate}
                  onChange={(e) => setReportParams((p) => ({ ...p, endDate: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#457B9D]"
                />
              </div>
            </div>
            {downloadError && (
              <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{downloadError}</p>
            )}
          </div>
          <div className="flex gap-3 px-6 pb-6">
            <button
              onClick={() => setSelectedReport(null)}
              className="flex-1 py-2.5 text-sm font-medium border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleDownload}
              disabled={!!generating}
              className="flex-1 py-2.5 text-sm font-semibold text-white rounded-xl transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ backgroundColor: selectedReport.color }}
            >
              {generating ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generando...
                </>
              ) : (
                <>
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  Descargar PDF
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}