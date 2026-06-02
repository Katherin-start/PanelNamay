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
  TrashIcon,
  EllipsisVerticalIcon,
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
  const [menuOpenMessageId, setMenuOpenMessageId] = useState<string | null>(null);
  const [contactTyping, setContactTyping] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const selectedContactRef = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingSentRef = useRef<boolean>(false);
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

    // 🗑️ Evento cuando se elimina un mensaje
    socket.on('message_deleted', (data: any) => {
      setMessages((prev) => prev.filter((msg) => msg.id !== data.messageId));
      refreshContacts();
    });

    // 🗑️ Evento cuando se vacía el chat
    socket.on('chat_cleared', (data: any) => {
      setMessages([]);
      refreshContacts();
    });

    // 👤 Evento cuando cambia el estado online/offline de un usuario
    socket.on('user_status_changed', (data: any) => {
      setContacts((prev) =>
        prev.map((contact) =>
          contact.id === data.userId
            ? { ...contact, online: data.online, last_seen: data.lastSeen || data.timestamp }
            : contact
        )
      );
      
      // Si es el contacto seleccionado, actualizar su estado en el header
      if (selectedContactRef.current?.id === data.userId) {
        setSelectedContact((prev) => ({
          ...prev,
          online: data.online,
          last_seen: data.lastSeen || data.timestamp,
        }));
      }
    });

    socket.on('user_typing', (data: any) => {
      if (selectedContactRef.current?.id === data.from) {
        setContactTyping(Boolean(data.isTyping));
      }
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
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const emitTypingStatus = (isTyping: boolean) => {
    const recipientId = selectedContactRef.current?.id;
    if (!recipientId || !currentUserId) return;
    const socket = socketRef.current;
    if (!socket) return;

    socket.emit('typing', {
      from: currentUserId,
      to: recipientId,
      isTyping,
    });
  };

  const scheduleTypingStopped = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      emitTypingStatus(false);
      lastTypingSentRef.current = false;
    }, 1200);
  };

  const handleTyping = (value: string) => {
    const isTyping = value.trim().length > 0;
    if (isTyping && !lastTypingSentRef.current) {
      emitTypingStatus(true);
      lastTypingSentRef.current = true;
    }

    if (!isTyping && lastTypingSentRef.current) {
      emitTypingStatus(false);
      lastTypingSentRef.current = false;
    }

    if (isTyping) {
      scheduleTypingStopped();
    } else {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
  };

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

  // 📅 Función para formatear hora relativa
  const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays}d`;

    return date.toLocaleDateString('es-PE', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  // 📅 Función para obtener hora y fecha
  const getMessageTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
    });
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
      emitTypingStatus(false);
      lastTypingSentRef.current = false;
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

  // 🗑️ Eliminar mensaje completamente
  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('¿Estás seguro? El mensaje será eliminado permanentemente')) return;

    try {
      await apiClient.deleteMessage(messageId);
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      setMenuOpenMessageId(null);
    } catch (error: any) {
      console.error('Error al eliminar mensaje:', error);
      alert('No se pudo eliminar el mensaje');
    }
  };

  // 🗑️ Vaciar chat
  const handleClearChat = async () => {
    if (!confirm('¿Estás seguro? Se eliminarán TODOS los mensajes de este chat')) return;

    try {
      await apiClient.clearChat(selectedContact.id);
      setMessages([]);
      alert('Chat vaciado correctamente');
    } catch (error: any) {
      console.error('Error al vaciar chat:', error);
      alert('No se pudo vaciar el chat');
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
                    <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: selectedContact.online ? '#22c55e' : '#9ca3af' }}
                      />
                      <p className="text-xs text-gray-400">
                        {selectedContact.online 
                          ? 'En línea' 
                          : selectedContact.last_seen 
                            ? `Última vez ${getRelativeTime(selectedContact.last_seen)}`
                            : 'Sin conexión'
                        }
                      </p>
                    </div>
                    {contactTyping && selectedContact.online && (
                      <p className="text-xs text-blue-600">Escribiendo...</p>
                    )}
                  </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{selectedContact.correo}</span>
                  <button
                    onClick={handleClearChat}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    title="Vaciar chat"
                  >
                    <TrashIcon className="h-5 w-5 text-red-500" />
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
                          <div className="relative group">
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

                            {/* 🗑️ Menu de opciones */}
                            <button
                              onClick={() => setMenuOpenMessageId(menuOpenMessageId === message.id ? null : message.id)}
                              className={`absolute ${isMine ? '-left-8' : '-right-8'} top-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity`}
                              title="Opciones del mensaje"
                            >
                              <EllipsisVerticalIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                            </button>

                            {/* Dropdown Menu */}
                            {menuOpenMessageId === message.id && (
                              <div
                                className={`absolute ${isMine ? 'right-0' : 'left-0'} top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 min-w-max`}
                              >
                                <button
                                  onClick={() => handleDeleteMessage(message.id)}
                                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 first:rounded-t-lg flex items-center gap-2"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                  Eliminar mensaje
                                </button>
                              </div>
                            )}
                          </div>

                          <div className={`mt-1 px-1 ${isMine ? 'text-right' : 'text-left'}`}>
                            <div className="flex items-center gap-1 justify-end" style={isMine ? {} : { justifyContent: 'flex-start' }}>
                              <p className="text-xs text-gray-400">
                                {getMessageTime(message.fecha_envio)}
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
                            {/* 📅 Mostrar fecha si es diferente al día anterior */}
                            <p className="text-xs text-gray-300 mt-1">
                              {new Date(message.fecha_envio).toLocaleDateString('es-PE', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                              })}
                            </p>
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
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      handleTyping(e.target.value);
                    }}
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
