'use client';

import { useEffect, useState, useRef } from 'react';
import { ChatMessage } from '@/types';
import { apiClient } from '@/lib/api';
import {
  PaperAirplaneIcon,
  MagnifyingGlassIcon,
  EllipsisVerticalIcon,
  PhoneIcon,
  VideoCameraIcon,
} from '@heroicons/react/24/outline';

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [msgs, ctcs] = await Promise.all([
          apiClient.getChatMessages(),
          apiClient.getChatContacts(),
        ]);
        const msgArr = Array.isArray(msgs) ? msgs : (msgs?.data ?? msgs?.messages ?? []);
        const ctcArr = Array.isArray(ctcs) ? ctcs : (ctcs?.data ?? ctcs?.contacts ?? []);
        setMessages(msgArr);
        setContacts(ctcArr);
        if (ctcArr.length > 0) setSelectedContact(ctcArr[0]);
      } catch (error) {
        console.error('Error al cargar chat:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    try {
      await apiClient.sendMessage({ mensaje: newMessage, destinatario_id: selectedContact?.id });
      const data = await apiClient.getChatMessages();
      setMessages(Array.isArray(data) ? data : (data?.data ?? data?.messages ?? []));
      setNewMessage('');
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#457B9D] border-t-[#E63946]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: '#457B9D' }}>
          Panel · Mensajería
        </p>
        <h1 className="text-2xl font-bold mt-0.5" style={{ color: '#1D3557' }}>
          Chat Interno
        </h1>
      </div>

      <div
        className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex"
        style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }}
      >
        {/* Contacts sidebar */}
        <div className="w-64 flex-shrink-0 border-r border-gray-100 flex flex-col">
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar contacto..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {contacts.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-400">Sin contactos</div>
            ) : (
              contacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className={`w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-gray-50 transition-colors ${
                    selectedContact?.id === contact.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                    style={{ backgroundColor: '#457B9D' }}
                  >
                    {contact.nombre?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#1D3557' }}>
                      {contact.nombre}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{contact.rol}</p>
                  </div>
                  {contact.mensajes_no_leidos > 0 && (
                    <span
                      className="w-5 h-5 rounded-full text-xs font-bold text-white flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: '#E63946' }}
                    >
                      {contact.mensajes_no_leidos}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedContact ? (
            <>
              {/* Chat header */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                    style={{ backgroundColor: '#457B9D' }}
                  >
                    {selectedContact.nombre?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#1D3557' }}>
                      {selectedContact.nombre}
                    </p>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      <p className="text-xs text-gray-400">En línea</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                    <PhoneIcon className="h-4 w-4 text-gray-400" />
                  </button>
                  <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                    <VideoCameraIcon className="h-4 w-4 text-gray-400" />
                  </button>
                  <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                    <EllipsisVerticalIcon className="h-4 w-4 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ backgroundColor: '#F8FAFC' }}>
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-gray-400">
                    No hay mensajes. ¡Inicia la conversación!
                  </div>
                ) : (
                  messages.map((message) => {
                    const isMine = message.remitente_id !== selectedContact?.id;
                    return (
                      <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className="max-w-xs lg:max-w-md">
                          {!isMine && (
                            <p className="text-xs text-gray-400 mb-1 ml-1">{message.remitente_nombre}</p>
                          )}
                          <div
                            className="px-4 py-2.5 text-sm"
                            style={{
                              backgroundColor: isMine ? '#1D3557' : '#F1F4F9',
                              color: isMine ? 'white' : '#1D3557',
                              borderRadius: isMine ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
                            }}
                          >
                            {message.mensaje}
                          </div>
                          <p className={`text-xs text-gray-400 mt-1 px-1 ${isMine ? 'text-right' : 'text-left'}`}>
                            {new Date(message.fecha_envio).toLocaleTimeString('es-PE', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form
                onSubmit={handleSendMessage}
                className="px-4 py-3 border-t border-gray-100 flex items-center gap-3"
              >
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#457B9D]"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: '#1D3557' }}
                >
                  <PaperAirplaneIcon className="h-4 w-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              Selecciona un contacto para comenzar
            </div>
          )}
        </div>
      </div>
    </div>
  );
}