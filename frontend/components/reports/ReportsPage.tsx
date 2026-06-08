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
import PageHeader from '@/components/ui/PageHeader';
import Modal, { ModalActions } from '@/components/ui/Modal';

const reportTypes = [
  { id: 'pacientes',  label: 'Reporte de Pacientes', description: 'Lista y estadísticas de pacientes registrados', icon: UsersIcon,          color: '#1D3557', light: '#EFF6FF' },
  { id: 'citas',      label: 'Reporte de Citas',     description: 'Historial y estado de citas médicas',            icon: CalendarIcon,       color: '#457B9D', light: '#EFF6FF' },
  { id: 'ingresos',   label: 'Reporte de Ingresos',  description: 'Ingresos y facturación del período',             icon: CurrencyDollarIcon, color: '#16A34A', light: '#F0FDF4' },
  { id: 'asistencia', label: 'Reporte de Asistencia', description: 'Control de asistencia de pacientes y doctores',  icon: ChartBarIcon,       color: '#E63946', light: '#FEF2F2' },
  { id: 'horas',      label: 'Reporte de Horas',     description: 'Horas trabajadas por doctor',                    icon: ClockIcon,          color: '#7C3AED', light: '#EDE9FE' },
  { id: 'financiero', label: 'Reporte Financiero',   description: 'Balance general y análisis financiero',          icon: SparklesIcon,       color: '#D97706', light: '#FFFBEB' },
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
      <PageHeader
        eyebrow="Panel · Reportes"
        title="Reportes y Estadísticas"
        subtitle="Genera y descarga reportes detallados del sistema."
      />

      {/* Report type cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportTypes.map((rt) => (
          <div
            key={rt.id}
            className="card-base p-5 flex flex-col gap-4 transition-all duration-200 hover:shadow-card-lg hover:-translate-y-0.5"
          >
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: rt.light }}
              >
                <rt.icon className="h-5 w-5" style={{ color: rt.color }} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-namay-navy">{rt.label}</p>
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
              className="w-full py-2 text-sm font-semibold text-white rounded-btn transition-all duration-150 hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 shadow-card"
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
    <Modal
      open={!!selectedReport}
      onClose={() => setSelectedReport(null)}
      title={selectedReport?.label ?? ''}
      subtitle={selectedReport?.description}
      icon={selectedReport ? <selectedReport.icon className="h-5 w-5 text-white" /> : undefined}
      size="md"
      footer={
        <ModalActions
          onCancel={() => setSelectedReport(null)}
          onConfirm={handleDownload}
          confirmLabel={generating ? 'Generando...' : 'Descargar PDF'}
          cancelLabel="Cancelar"
          loading={!!generating}
        />
      }
    >
      {downloadError && (
        <div className="mb-4 p-3 rounded-btn text-sm font-medium bg-danger-50 text-danger-600 border border-danger-100">
          {downloadError}
        </div>
      )}
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.1em] mb-3">
        Rango de fechas (opcional)
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-base">Desde</label>
          <input
            type="date"
            value={reportParams.startDate}
            onChange={(e) => setReportParams((p) => ({ ...p, startDate: e.target.value }))}
            className="input-base"
          />
        </div>
        <div>
          <label className="label-base">Hasta</label>
          <input
            type="date"
            value={reportParams.endDate}
            onChange={(e) => setReportParams((p) => ({ ...p, endDate: e.target.value }))}
            className="input-base"
          />
        </div>
      </div>
    </Modal>
    </>
  );
}
