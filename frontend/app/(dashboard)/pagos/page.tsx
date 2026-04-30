import { Metadata } from 'next';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PaymentsPage from '@/components/payments/PaymentsPage';

export const metadata: Metadata = {
  title: 'Pagos',
  description: 'Gestión de pagos y facturación',
};

export default function PagosPage() {
  return (
    <DashboardLayout>
      <PaymentsPage />
    </DashboardLayout>
  );
}