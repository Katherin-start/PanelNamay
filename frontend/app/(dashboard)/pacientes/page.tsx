import { Metadata } from 'next';
import PatientsPage from '@/components/patients/PatientsPage';

export const metadata: Metadata = {
  title: 'Pacientes',
  description: 'Gestión de pacientes',
};

export default function PacientesPage() {
  return <PatientsPage />;
}