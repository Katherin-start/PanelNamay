import { Metadata } from 'next';
import UsersPage from '@/components/users/UsersPage';

export const metadata: Metadata = {
  title: 'Usuarios',
  description: 'Gestión de usuarios',
};

export default function UsuariosPage() {
  return <UsersPage />;
}