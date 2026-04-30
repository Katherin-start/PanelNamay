import { Metadata } from 'next';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ReportsPage from '@/components/reports/ReportsPage';

export const metadata: Metadata = {
  title: 'Reportes',
  description: 'Generación de reportes y estadísticas',
};

export default function ReportesPage() {
  return (
    <DashboardLayout>
      <ReportsPage />
    </DashboardLayout>
  );
}