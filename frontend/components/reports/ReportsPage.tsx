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
} from '@heroicons/react/24/outline';
import PageHeader from '@/components/ui/PageHeader';
import Modal, { ModalActions } from '@/components/ui/Modal';

const reportTypes = [
  { id: 'pacientes',  label: 'Reporte de pacientes',  description: 'Lista y estadísticas de pacientes registrados', icon: UsersIcon },
  { id: 'citas',      label: 'Reporte de citas',      description: 'Historial y estado de citas médicas',            icon: CalendarIcon },
  { id: 'ingresos',   label: 'Reporte de ingresos',   description: 'Ingresos y facturación del período',             icon: CurrencyDollarIcon },
  { id: 'asistencia', label: 'Reporte de asistencia', description: 'Control de asistencia de pacientes y doctores',  icon: ChartBarIcon },
  { id: 'horas',      label: 'Reporte de horas',      description: 'Horas trabajadas por doctor',                    icon: ClockIcon },
  { id: 'financiero', label: 'Reporte financiero',    description: 'Balance general y análisis financiero',          icon: SparklesIcon },
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
    <div className="space-y-8">
      <PageHeader
        eyebrow="Análisis"
        title="Reportes y estadísticas"
        subtitle="Genera y descarga reportes detallados del sistema."
      />

      {/* Report type cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-100">
        {reportTypes.map((rt) => (
          <div key={rt.id} className="bg-white p-6 flex flex-col gap-5 transition-colors hover:bg-namay-cream/30">
            <div className="flex items-start gap-3">
              <rt.icon className="h-5 w-5 text-namay-steel/60 mt-0.5 flex-shrink-0" strokeWidth={1.5} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-namay-navy">{rt.label}</p>
                <p className="text-[11px] text-namay-steel/60 font-medium mt-1 leading-relaxed">{rt.description}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedReport(rt);
                setReportParams({ startDate: '', endDate: '' });
                setDownloadError('');
              }}
              disabled={generating === rt.id}
              className="w-full py-2.5 text-xs font-semibold text-namay-navy border border-namay-navy/20 hover:border-namay-navy hover:bg-namay-navy hover:text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {generating === rt.id ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generando...
                </>
              ) : (
                <>
                  <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                  Generar reporte
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
      icon={selectedReport ? <selectedReport.icon className="h-4 w-4 text-namay-navy" /> : undefined}
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
        <div className="mb-5 p-3 text-sm font-medium text-danger-700 bg-danger-50 border-l-2 border-danger-500">
          {downloadError}
        </div>
      )}
      <p className="eyebrow mb-4">Rango de fechas (opcional)</p>
      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="label-base">Desde</label>
          <input
            type="date"
            value={reportParams.startDate}
            onChange={(e) => setReportParams((p) => ({ ...p, startDate: e.target.value }))}
            className="input-underline"
          />
        </div>
        <div>
          <label className="label-base">Hasta</label>
          <input
            type="date"
            value={reportParams.endDate}
            onChange={(e) => setReportParams((p) => ({ ...p, endDate: e.target.value }))}
            className="input-underline"
          />
        </div>
      </div>
    </Modal>
    </>
  );
}
