import { Metadata } from 'next';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PatientsPage from '@/components/patients/PatientsPage';

export const metadata: Metadata = {
  title: 'Pacientes',
  description: 'Gestión de pacientes del sistema',
};

export default function PacientesPage() {
  return (
    <DashboardLayout>
      <PatientsPage />
    </DashboardLayout>
  );
}