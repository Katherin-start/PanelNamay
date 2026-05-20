import { Metadata } from 'next';
import DashboardOverview from '@/components/dashboard/DashboardOverview';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Panel de control principal',
};

export default function DashboardPage() {
  return <DashboardOverview />;
}