import { redirect } from 'next/navigation';

export default function HomePage() {
  // Redirigir al login por defecto
  redirect('/login');
}