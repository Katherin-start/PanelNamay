import { Metadata } from 'next';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ChatPage from '@/components/chat/ChatPage';

export const metadata: Metadata = {
  title: 'Chat',
  description: 'Mensajería interna del sistema',
};

export default function ChatPageRoute() {
  return (
    <DashboardLayout>
      <ChatPage />
    </DashboardLayout>
  );
}