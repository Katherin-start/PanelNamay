import { Metadata } from 'next';
import DentistBiographyPage from '@/components/pages/DentistBiographyPage';

export const metadata: Metadata = {
  title: 'Mi Biografía',
  description: 'Edita tu biografía profesional',
};

export default function MiBiografiaPage() {
  return <DentistBiographyPage />;
}
