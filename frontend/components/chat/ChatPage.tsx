'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChatMessage } from '@/types';
import { apiClient } from '@/lib/api';

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const data = await apiClient.getChatMessages();
        setMessages(data);
      } catch (error) {
        console.error('Error al cargar mensajes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chat</h1>
          <p className="mt-1 text-sm text-gray-500">
            Comunicación con pacientes y equipo médico
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Mensajes Recientes</CardTitle>
            <CardDescription>
              Últimas conversaciones del sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {messages.map((message) => (
                <div key={message.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-sm font-medium text-primary-foreground">
                        {message.remitente_nombre?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {message.remitente_nombre}
                    </p>
                    <p className="text-sm text-gray-600">
                      {message.mensaje}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(message.fecha_envio).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}