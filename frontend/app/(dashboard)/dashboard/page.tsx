import { Metadata } from 'next';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DashboardOverview from '@/components/dashboard/DashboardOverview';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Vista general del panel de administración',
};

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <DashboardOverview />
    </DashboardLayout>
  );
}