import { Metadata } from 'next';
import PendingPaymentProofsPage from '@/components/payments/PendingPaymentProofsPage';

export const metadata: Metadata = {
  title: 'Comprobantes de pago',
  description: 'Validación de comprobantes de pago',
};

export default function ComprobantesPage() {
  return <PendingPaymentProofsPage />;
}
