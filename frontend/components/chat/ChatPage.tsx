'use client';

import { useEffect, useState, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { ChatMessage, User } from '@/types';
import { apiClient } from '@/lib/api';
import { useInitializeStorage } from '@/hooks/useStorage';
import {
  PaperAirplaneIcon,
  MagnifyingGlassIcon,
  PaperClipIcon,
  CheckIcon,
  ChecksIcon,
} from '@heroicons/react/24/outline';

export default function ChatPage() {
  // Inicializar storage automáticamente
  useInitializeStorage();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [searchContact, setSearchContact] = useState('');
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const selectedContactRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const contactsPollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, chatResult, userResult] = (await Promise.all([
          apiClient.getProfile().catch(() => null),
          apiClient.getChatContacts().catch(() => []),
          apiClient.getUsers().catch(() => []),
        ])) as [any, any, any];

        const currentUserId = profileRes?.profile?.id ?? profileRes?.user?.id ?? profileRes?.id ?? '';
        setCurrentUserId(currentUserId);

        const chatContacts = Array.isArray(chatResult)
          ? chatResult
          : chatResult?.contacts ?? chatResult?.data ?? [];

        const users = Array.isArray(userResult)
          ? userResult
          : userResult?.users ?? userResult?.data ?? [];

        const allUsers = (users as User[])
          .filter((user) => user.id && user.id !== currentUserId)
          .map((user) => ({
            id: user.id,
            nombre: user.nombre,
            correo: user.email,
            rol: user.rol,
            mensajes_no_leidos: 0,
          }));

        const contactsMap = new Map();

        chatContacts.forEach((contact: any) => {
          contactsMap.set(contact.id, {
            ...contact,
            mensajes_no_leidos: contact.mensajes_no_leidos ?? 0,
          });
        });

        allUsers.forEach((user) => {
          if (!contactsMap.has(user.id)) {
            contactsMap.set(user.id, user);
          }
        });

        const mergedContacts = Array.from(contactsMap.values());

        setContacts(mergedContacts);
        if (mergedContacts.length > 0) setSelectedContact(mergedContacts[0]);
      } catch (error) {
        console.error('Error al cargar chat:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const refreshContacts = async () => {
    try {
      const chatResult = await apiClient.getChatContacts();
      const chatContacts = Array.isArray(chatResult)
        ? chatResult
        : chatResult?.contacts ?? chatResult?.data ?? [];

      const contactMap = new Map(contacts.map((contact) => [contact.id, contact]));
      chatContacts.forEach((contact: any) => {
        contactMap.set(contact.id, {
          ...contactMap.get(contact.id),
          ...contact,
          mensajes_no_leidos: contact.mensajes_no_leidos ?? 0,
        });
      });

      setContacts(Array.from(contactMap.values()));
    } catch (error) {
      console.error('Error al refrescar contactos:', error);
    }
  };

  useEffect(() => {
    selectedContactRef.current = selectedContact;
  }, [selectedContact]);

  // Auto-refresh messages every 3 seconds when a contact is selected
  useEffect(() => {
    if (!selectedContact?.id) {
      setMessages([]);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    const loadMessages = async () => {
      try {
        const data = await apiClient.getChatMessages(selectedContact.id);
        setMessages(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error al cargar mensajes:', error);
      }
    };

    // Load messages immediately
    loadMessages();

    // Mark as read via API
    if (currentUserId) {
      apiClient.markChatMessagesAsRead(selectedContact.id).catch(err =>
        console.error('Error al marcar como leído:', err)
      );
    }

    // Setup auto-polling every 3 seconds
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    
    pollIntervalRef.current = setInterval(() => {
      loadMessages();
    }, 3000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [selectedContact?.id, currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;

    const socketUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/api$/, '');
    const socket = io(socketUrl);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket conectado:', socket.id);
      socket.emit('join', currentUserId);
    });

    socket.on('new_message', (message: any) => {
      const normalized = normalizeChatMessage(message);
      const currentContact = selectedContactRef.current;

      if (normalized.remitente_id === currentContact?.id || normalized.destinatario_id === currentContact?.id) {
        setMessages((prev) => {
          const exists = prev.some(m => m.id === normalized.id);
          return exists ? prev : [...prev, normalized];
        });
      }

      refreshContacts();
    });

    socket.on('messages_read', (data: any) => {
      const currentContact = selectedContactRef.current;
      if (currentContact?.id === data.by) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.remitente_id === currentUserId ? { ...msg, leido: true } : msg
          )
        );
      }
      refreshContacts();
    });

    socket.on('message_read_receipt', (data: any) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.messageId ? { ...msg, leido: true } : msg
        )
      );
    });

    // Setup auto-refresh de contactos cada 5 segundos
    if (contactsPollRef.current) {
      clearInterval(contactsPollRef.current);
    }

    contactsPollRef.current = setInterval(() => {
      refreshContacts();
    }, 5000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (contactsPollRef.current) {
        clearInterval(contactsPollRef.current);
      }
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const normalizeChatMessage = (message: any) => {
    const rawText = message?.mensaje ?? message?.contenido ?? '';
    let attachment: any = null;
    let texto = rawText;

    if (typeof rawText === 'string') {
      try {
        const parsed = JSON.parse(rawText);
        if (parsed?.type && parsed?.url) {
          attachment = parsed;
          texto = parsed.text ?? parsed.name ?? '';
        }
      } catch (err) {
        attachment = null;
      }
    }

    return {
      id: message?.id ?? `${Date.now()}`,
      remitente_id: message?.remitente_id ?? '',
      destinatario_id: message?.destinatario_id ?? '',
      mensaje: texto,
      contenido: texto,
      tipo: attachment?.type ?? message?.tipo ?? 'texto',
      attachment_url: attachment?.url ?? message?.attachment_url,
      attachment_name: attachment?.name ?? message?.attachment_name,
      attachment_mime: attachment?.mime ?? message?.attachment_mime,
      caption: attachment?.text ?? message?.caption,
      fecha_envio: message?.fecha_envio ?? message?.created_at ?? new Date().toISOString(),
      leido: Boolean(message?.leido),
    };
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const recipientId = selectedContact?.id || selectedContact?.userId || selectedContact?.destinatario_id;
    if (!recipientId) {
      alert('Selecciona un contacto válido antes de enviar el mensaje.');
      return;
    }

    if (!newMessage.trim() && !selectedFile) {
      alert('Escribe un mensaje o selecciona un archivo antes de enviar.');
      return;
    }

    // Validar tamaño del archivo
    if (selectedFile && selectedFile.size > 20 * 1024 * 1024) {
      alert('El archivo no puede ser mayor a 20 MB. Por favor selecciona uno más pequeño.');
      return;
    }

    try {
      let sent;
      if (selectedFile) {
        setIsUploading(true);
        console.log(`Enviando archivo: ${selectedFile.name} (${selectedFile.size} bytes)`);
        
        sent = await apiClient.sendChatAttachment({
          destinatario_id: recipientId,
          file: selectedFile,
          caption: newMessage.trim(),
        });
        setSelectedFile(null);
      } else {
        sent = await apiClient.sendMessage({
          destinatario_id: recipientId,
          contenido: newMessage,
        });
      }

      setMessages((prev) => [...prev, normalizeChatMessage(sent?.message ?? sent)]);
      setNewMessage('');
    } catch (error: any) {
      console.error('Error al enviar mensaje:', error);
      
      let errorMessage = 'No se pudo enviar el mensaje';
      
      // Mensajes de error más informativos
      if (error?.message?.includes('Bucket not found')) {
        errorMessage = 'Error de configuración: Bucket de archivos no configurado. Contacta al administrador.';
      } else if (error?.message?.includes('Permission denied')) {
        errorMessage = 'Permiso denegado. Verifica tu acceso.';
      } else if (error?.message?.includes('File too large')) {
        errorMessage = 'El archivo es demasiado grande (máximo 20 MB).';
      } else if (error?.message?.includes('ERR_CONNECTION_REFUSED')) {
        errorMessage = 'Error de conexión: El servidor no está disponible.';
      } else {
        errorMessage = `No se pudo enviar: ${error?.message ?? 'Error desconocido'}`;
      }
      
      alert(errorMessage);
    } finally {
      setIsUploading(false);
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
                value={searchContact}
                onChange={(e) => setSearchContact(e.target.value)}
                placeholder="Buscar contacto o rol..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {contacts.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-400">Sin contactos</div>
            ) : (
              contacts
                .filter((contact) =>
                  `${contact.nombre ?? ''} ${contact.rol ?? ''}`
                    .toLowerCase()
                    .includes(searchContact.toLowerCase())
                )
                .map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    className={`w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-gray-50 transition-colors ${
                      selectedContact?.id === contact.id ? 'bg-blue-50' : ''
                    }`}
                  >
                  {contact.foto_perfil ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={contact.foto_perfil}
                      alt={contact.nombre}
                      className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                      style={{ backgroundColor: '#457B9D' }}
                    >
                      {contact.nombre?.charAt(0).toUpperCase()}
                    </div>
                  )}
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
                  {selectedContact.foto_perfil ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedContact.foto_perfil}
                      alt={selectedContact.nombre}
                      className="w-9 h-9 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                      style={{ backgroundColor: '#457B9D' }}
                    >
                      {selectedContact.nombre?.charAt(0).toUpperCase()}
                    </div>
                  )}
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
                <span className="text-xs text-gray-400">{selectedContact.correo}</span>
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
                            {message.tipo === 'imagen' && message.attachment_url ? (
                              <img
                                src={message.attachment_url}
                                alt={message.attachment_name ?? 'Imagen'}
                                className="max-w-full rounded-xl"
                              />
                            ) : message.tipo === 'documento' && message.attachment_url ? (
                              <a
                                href={message.attachment_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 text-sm text-white underline"
                                style={{ color: isMine ? 'white' : '#1D3557' }}
                              >
                                <PaperClipIcon className="h-4 w-4" />
                                {message.attachment_name ?? 'Documento'}
                              </a>
                            ) : (
                              <span>{message.mensaje}</span>
                            )}

                            {message.caption && message.tipo !== 'texto' ? (
                              <p className="text-[11px] text-white/80 mt-2">{message.caption}</p>
                            ) : null}
                          </div>
                          <div className={`mt-1 px-1 ${isMine ? 'text-right' : 'text-left'}`}>
                            <div className="flex items-center gap-1 justify-end" style={isMine ? {} : { justifyContent: 'flex-start' }}>
                              <p className="text-xs text-gray-400">
                                {new Date(message.fecha_envio).toLocaleTimeString('es-PE', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                              {isMine && (
                                message.leido ? (
                                  <div className="flex gap-0.5">
                                    <CheckIcon className="h-3 w-3 text-blue-500" />
                                    <CheckIcon className="h-3 w-3 text-blue-500 -ml-1.5" />
                                  </div>
                                ) : (
                                  <CheckIcon className="h-3 w-3 text-gray-400" />
                                )
                              )}
                            </div>
                          </div>
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
                className="px-4 py-3 border-t border-gray-100 space-y-3"
              >
                {selectedFile && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900 truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-blue-600">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="text-blue-600 hover:text-blue-700 font-semibold text-sm"
                    >
                      ✕
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors">
                    <PaperClipIcon className="h-4 w-4" />
                    Adjuntar
                    <input
                      type="file"
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.csv,.json,.xml"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        if (file && file.size > 20 * 1024 * 1024) {
                          alert('El archivo no puede ser mayor a 20 MB');
                          return;
                        }
                        setSelectedFile(file);
                      }}
                    />
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={selectedFile ? 'Añade un comentario opcional...' : 'Escribe un mensaje...'}
                    className="flex-1 px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#457B9D]"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() && !selectedFile || isUploading}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: '#1D3557' }}
                    title={isUploading ? 'Enviando...' : 'Enviar'}
                  >
                    {isUploading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    ) : (
                      <PaperAirplaneIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
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
