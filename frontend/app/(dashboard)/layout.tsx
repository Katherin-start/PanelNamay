import { Metadata } from 'next';
import DashboardLayout from '@/components/layout/DashboardLayout';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Panel de control principal',
};

export default function DashboardLayoutPage({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}