import { Metadata } from 'next';
import AppointmentsPage from '@/components/appointments/AppointmentsPage';

export const metadata: Metadata = {
  title: 'Citas',
  description: 'Gestión de citas médicas',
};

export default function CitasPage() {
  return <AppointmentsPage />;
}