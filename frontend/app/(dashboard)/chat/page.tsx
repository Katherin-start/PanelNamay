import { Metadata } from 'next';
import ChatPage from '@/components/chat/ChatPage';

export const metadata: Metadata = {
  title: 'Chat',
  description: 'Chat del sistema',
};

export default function ChatPageRoute() {
  return <ChatPage />;
}