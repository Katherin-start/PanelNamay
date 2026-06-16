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
  DocumentTextIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';
import PageHeader from '@/components/ui/PageHeader';
import Modal, { ModalActions } from '@/components/ui/Modal';

const reportTypes = [
  { id: 'pacientes',  label: 'Reporte de pacientes',  description: 'Lista y estadísticas de pacientes registrados', icon: UsersIcon },
  { id: 'citas',      label: 'Reporte de citas',      description: 'Historial y estado de citas médicas',            icon: CalendarIcon },
  { id: 'ingresos',   label: 'Reporte de ingresos',   description: 'Ingresos y facturación del período',             icon: CurrencyDollarIcon },
  { id: 'asistencia', label: 'Reporte de asistencia', description: 'Control de asistencia de practicantes',          icon: ChartBarIcon },
  { id: 'horas',      label: 'Reporte de horas',      description: 'Horas acumuladas por practicante',               icon: ClockIcon },
  { id: 'financiero', label: 'Reporte financiero',    description: 'Balance general y análisis financiero',          icon: SparklesIcon },
];

type Format = 'pdf' | 'csv';

export default function ReportsPage() {
  const [generating, setGenerating] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<(typeof reportTypes)[0] | null>(null);
  const [reportParams, setReportParams] = useState({ startDate: '', endDate: '' });
  const [format, setFormat] = useState<Format>('pdf');
  const [downloadError, setDownloadError] = useState('');

  const handleDownload = async () => {
    if (!selectedReport) return;
    setGenerating(selectedReport.id);
    setDownloadError('');
    try {
      const params: Record<string, string> = { format };
      if (reportParams.startDate) params.startDate = reportParams.startDate;
      if (reportParams.endDate) params.endDate = reportParams.endDate;

      const { blob, filename } = await apiClient.downloadReport(selectedReport.id, params);

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-100 dark:bg-gray-700">
        {reportTypes.map((rt) => (
          <div
            key={rt.id}
            className="bg-white dark:bg-gray-800 p-6 flex flex-col gap-5 transition-colors hover:bg-namay-cream/30 dark:hover:bg-gray-750"
          >
            <div className="flex items-start gap-3">
              <rt.icon className="h-5 w-5 text-namay-steel/60 mt-0.5 flex-shrink-0" strokeWidth={1.5} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-namay-navy dark:text-gray-100">{rt.label}</p>
                <p className="text-[11px] text-namay-steel/60 dark:text-gray-400 font-medium mt-1 leading-relaxed">
                  {rt.description}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedReport(rt);
                setReportParams({ startDate: '', endDate: '' });
                setFormat('pdf');
                setDownloadError('');
              }}
              disabled={generating === rt.id}
              className="w-full py-2.5 text-xs font-semibold text-namay-navy dark:text-gray-200 border border-namay-navy/20 dark:border-gray-600 hover:border-namay-navy dark:hover:border-gray-400 hover:bg-namay-navy dark:hover:bg-gray-700 hover:text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
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
          confirmLabel={generating ? 'Generando...' : `Descargar ${format.toUpperCase()}`}
          cancelLabel="Cancelar"
          loading={!!generating}
        />
      }
    >
      {downloadError && (
        <div className="mb-5 p-3 text-sm font-medium text-red-700 bg-red-50 border-l-2 border-red-500 dark:bg-red-900/20 dark:text-red-300 dark:border-red-600">
          {downloadError}
        </div>
      )}

      {/* Format selector */}
      <p className="eyebrow mb-3">Formato de descarga</p>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          type="button"
          onClick={() => setFormat('pdf')}
          className={`flex items-center gap-3 p-3.5 border rounded-lg text-left transition-colors ${
            format === 'pdf'
              ? 'border-namay-navy bg-namay-navy/5 dark:bg-namay-navy/20 dark:border-namay-steel'
              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
          }`}
        >
          <DocumentTextIcon className={`h-5 w-5 flex-shrink-0 ${format === 'pdf' ? 'text-namay-navy dark:text-namay-steel' : 'text-gray-400'}`} strokeWidth={1.5} />
          <div>
            <p className={`text-xs font-semibold ${format === 'pdf' ? 'text-namay-navy dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>PDF</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">Con diseño y colores</p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setFormat('csv')}
          className={`flex items-center gap-3 p-3.5 border rounded-lg text-left transition-colors ${
            format === 'csv'
              ? 'border-namay-navy bg-namay-navy/5 dark:bg-namay-navy/20 dark:border-namay-steel'
              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
          }`}
        >
          <TableCellsIcon className={`h-5 w-5 flex-shrink-0 ${format === 'csv' ? 'text-namay-navy dark:text-namay-steel' : 'text-gray-400'}`} strokeWidth={1.5} />
          <div>
            <p className={`text-xs font-semibold ${format === 'csv' ? 'text-namay-navy dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>CSV / Excel</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">Para abrir en Excel</p>
          </div>
        </button>
      </div>

      {/* Date range */}
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
