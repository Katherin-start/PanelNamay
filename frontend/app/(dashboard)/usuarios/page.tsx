import { Metadata } from 'next';
import DashboardLayout from '@/components/layout/DashboardLayout';
import UsersPage from '@/components/users/UsersPage';

export const metadata: Metadata = {
  title: 'Usuarios',
  description: 'Gestión de usuarios del sistema',
};

export default function UsuariosPage() {
  return (
    <DashboardLayout>
      <UsersPage />
    </DashboardLayout>
  );
}