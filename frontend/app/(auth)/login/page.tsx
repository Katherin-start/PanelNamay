import { Metadata } from 'next';
import LoginForm from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Iniciar Sesión — Dental Namay',
  description: 'Accede al panel de administración de Dental Namay',
};

export default function LoginPage() {
  return <LoginForm />;
}