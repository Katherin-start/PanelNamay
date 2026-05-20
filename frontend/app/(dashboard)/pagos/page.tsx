import { Metadata } from 'next';
import PaymentsPage from '@/components/payments/PaymentsPage';

export const metadata: Metadata = {
  title: 'Pagos',
  description: 'Gestión de pagos',
};

export default function PagosPage() {
  return <PaymentsPage />;
}