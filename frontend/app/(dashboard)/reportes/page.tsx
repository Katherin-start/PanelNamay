import { Metadata } from 'next';
import ReportsPage from '@/components/reports/ReportsPage';

export const metadata: Metadata = {
  title: 'Reportes',
  description: 'Reportes del sistema',
};

export default function ReportesPage() {
  return <ReportsPage />;
}