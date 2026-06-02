const supabase = require('../config/supabase');
const { getIO } = require('../socket/chatSocket');

const getConversationKey = (userA, userB) => {
  const [a, b] = [String(userA), String(userB)].sort();
  return `chat_${a}_${b}`;
};

const findConversationByPair = async (userA, userB) => {
  const key = getConversationKey(userA, userB);
  const { data, error } = await supabase
    .from('conversaciones')
    .select('id, tipo, nombre, created_at')
    .eq('nombre', key)
    .limit(1);

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data[0] : data;
};

const createConversationForPair = async (userA, userB) => {
  const key = getConversationKey(userA, userB);
  const { data, error } = await supabase
    .from('conversaciones')
    .insert([{ tipo: 'chat', nombre: key }])
    .select('id, tipo, nombre, created_at')
    .limit(1);

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data[0] : data;
};

const getOrCreateConversationByPair = async (userA, userB) => {
  const existing = await findConversationByPair(userA, userB);
  if (existing) return existing;
  return await createConversationForPair(userA, userB);
};

const rolIdToName = (rolId) => {
  const map = {
    1: 'ADMINISTRADOR',
    2: 'ODONTOLOGO',
    3: 'RECEPCIONISTA',
    4: 'CAJERO',
    5: 'PRACTICANTE',
  };
  return map[rolId] || 'PRACTICANTE';
};

const parseAttachmentContent = (mensaje) => {
  if (typeof mensaje !== 'string') return null;
  try {
    const parsed = JSON.parse(mensaje);
    if (parsed?.type && parsed?.url) {
      return parsed;
    }
  } catch (err) {
    return null;
  }
  return null;
};

const buildNormalizedChatMessage = (msg, currentUserId, otherUserId) => {
  const attachment = parseAttachmentContent(msg.mensaje);
  const payload = attachment
    ? {
        tipo: attachment.type,
        attachment_url: attachment.url,
        attachment_name: attachment.name,
        attachment_mime: attachment.mime,
        caption: attachment.text,
      }
    : {
        tipo: 'texto',
      };

  const displayText = attachment
    ? attachment.text || attachment.name || ''
    : msg.mensaje;

  return {
    id: msg.id,
    remitente_id: msg.id_usuario,
    destinatario_id: msg.id_usuario === currentUserId ? otherUserId : currentUserId,
    contenido: displayText,
    mensaje: displayText,
    tipo: payload.tipo,
    attachment_url: payload.attachment_url,
    attachment_name: payload.attachment_name,
    attachment_mime: payload.attachment_mime,
    caption: payload.caption,
    leido: msg.leido,
    fecha_envio: msg.fecha,
    created_at: msg.fecha,
  };
};

const emitMessageToRecipient = (message, destinatario_id) => {
  try {
    const io = getIO();
    io.to(`user_${destinatario_id}`).emit('new_message', message);
  } catch (err) {
    console.warn('Socket no inicializado al emitir mensaje:', err.message);
  }
};

const ensureStorageBucket = async (bucketName) => {
  try {
    // Intentar obtener el bucket
    const { data: bucketData, error: bucketError } = await supabase.storage.getBucket(bucketName);
    
    if (bucketError) {
      // Si el error es que no existe (404), intentar crear
      if (bucketError.status === 404 || bucketError.statusCode === 404) {
        console.log(`Creando bucket: ${bucketName}`);
        const { data: createdBucket, error: createError } = await supabase.storage.createBucket(bucketName, { 
          public: true,
          fileSizeLimit: 20 * 1024 * 1024 // 20 MB
        });
        
        if (createError) {
          console.error(`Error al crear bucket ${bucketName}:`, createError);
          // Puede que ya exista o hay otro error de permisos
          // Intentar usarlo de todas formas
        } else {
          console.log(`Bucket ${bucketName} creado exitosamente`);
        }
      } else {
        console.error(`Error al obtener bucket ${bucketName}:`, bucketError);
        throw bucketError;
      }
    } else {
      console.log(`Bucket ${bucketName} ya existe`);
    }
  } catch (err) {
    console.error(`Error en ensureStorageBucket para ${bucketName}:`, err);
    // No lanzar error, continuar de todas formas
  }
};

const getPublicFileUrl = (bucketName, filePath) => {
  const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
  return data?.publicUrl ?? '';
};

const getChatMessages = async (req, res) => {
  try {
    const otherUserId = req.params.userId;
    const currentUserId = req.user.id;

    const conversation = await findConversationByPair(currentUserId, otherUserId);
    if (!conversation) {
      return res.json({ code: 'CHAT_SUCCESS', messages: [] });
    }

    const { data: messages, error } = await supabase
      .from('mensajes')
      .select('id, id_conversacion, id_usuario, mensaje, leido, fecha')
      .eq('id_conversacion', conversation.id)
      .order('fecha', { ascending: true });

    if (error) {
      return res.status(500).json({ message: 'Error al obtener mensajes', code: 'CHAT_ERROR', error: error.message });
    }

    await supabase
      .from('mensajes')
      .update({ leido: true })
      .eq('id_conversacion', conversation.id)
      .eq('id_usuario', otherUserId)
      .eq('leido', false);

    const normalizedMessages = (messages || []).map((msg) => buildNormalizedChatMessage(msg, currentUserId, otherUserId));

    res.json({
      code: 'CHAT_SUCCESS',
      messages: normalizedMessages,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { destinatario_id, contenido, mensaje, message, tipo = 'texto' } = req.body;
    const body = contenido ?? mensaje ?? message;
    const remitente_id = req.user.id;

    if (!destinatario_id || !body || !String(body).trim()) {
      return res.status(400).json({ message: 'destinatario_id y contenido son requeridos', code: 'MISSING_FIELDS' });
    }

    const conversation = await getOrCreateConversationByPair(remitente_id, destinatario_id);
    const fecha = new Date().toISOString();

    const { data, error } = await supabase
      .from('mensajes')
      .insert([{
        id_conversacion: conversation.id,
        id_usuario: remitente_id,
        mensaje: body,
        leido: false,
        fecha,
      }])
      .select('id, id_conversacion, id_usuario, mensaje, leido, fecha')
      .limit(1);

    if (error) {
      return res.status(500).json({
        message: `Error al enviar mensaje: ${error.message || 'error desconocido'}`,
        code: 'SEND_ERROR',
        error,
      });
    }

    const messageRecord = Array.isArray(data) ? data[0] : data;
    if (!messageRecord) {
      return res.status(500).json({ message: 'Error al enviar mensaje: no se recibió el registro insertado', code: 'SEND_ERROR' });
    }

    const normalized = buildNormalizedChatMessage(messageRecord, remitente_id, destinatario_id);
    emitMessageToRecipient(normalized, destinatario_id);

    res.status(201).json({
      code: 'MESSAGE_SENT',
      message: normalized,
    });
  } catch (err) {
    res.status(500).json({ message: `Error interno: ${err.message}`, error: err.message, code: 'SERVER_ERROR' });
  }
};

const getChatContacts = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const { data: users, error: usersError } = await supabase
      .from('usuarios')
      .select('id, nombre, correo, rol_id, activo, foto_perfil, roles:rol_id(id, nombre)')
      .neq('id', currentUserId)
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (usersError) {
      return res.status(500).json({ message: 'Error al obtener usuarios', code: 'USERS_ERROR', error: usersError.message });
    }

    const conversationNames = (users || []).map((user) => getConversationKey(currentUserId, user.id));
    const { data: conversations, error: convError } = await supabase
      .from('conversaciones')
      .select('id, nombre')
      .in('nombre', conversationNames);

    if (convError) {
      return res.status(500).json({ message: 'Error al obtener conversaciones', code: 'CONVERSATIONS_ERROR', error: convError.message });
    }

    const conversationByName = new Map((conversations || []).map((conv) => [conv.nombre, conv]));
    const conversationIds = (conversations || []).map((conv) => conv.id);

    const { data: messages, error: messagesError } = conversationIds.length > 0
      ? await supabase
          .from('mensajes')
          .select('id, id_conversacion, id_usuario, mensaje, leido, fecha')
          .in('id_conversacion', conversationIds)
          .order('fecha', { ascending: false })
      : { data: [], error: null };

    if (messagesError) {
      return res.status(500).json({ message: 'Error al obtener mensajes', code: 'MESSAGES_ERROR', error: messagesError.message });
    }

    const contacts = (users || []).map((user) => {
      const conversation = conversationByName.get(getConversationKey(currentUserId, user.id));
      const conversationMessages = conversation
        ? (messages || []).filter((msg) => msg.id_conversacion === conversation.id)
        : [];

      const lastMessage = conversationMessages[0];
      const unreadCount = conversationMessages.filter((msg) => !msg.leido && msg.id_usuario !== currentUserId).length;

      return {
        id: user.id,
        nombre: user.nombre,
        correo: user.correo,
        rol: user.roles?.nombre || rolIdToName(user.rol_id),
        foto_perfil: user.foto_perfil,
        last_message: lastMessage?.mensaje ?? '',
        last_message_at: lastMessage?.fecha ?? null,
        mensajes_no_leidos: unreadCount,
        online: false, // Se actualiza via socket.io en tiempo real
        last_seen: null, // Se actualiza via socket.io en tiempo real
      };
    });

    contacts.sort((a, b) => {
      if (a.last_message_at && b.last_message_at) {
        return new Date(b.last_message_at) - new Date(a.last_message_at);
      }
      if (a.last_message_at) return -1;
      if (b.last_message_at) return 1;
      return a.nombre.localeCompare(b.nombre);
    });

    res.json({
      code: 'CONTACTS_SUCCESS',
      contacts,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

const uploadChatAttachment = async (req, res) => {
  try {
    const destinatario_id = req.body.destinatario_id;
    const caption = req.body.caption ?? '';
    const file = req.file;
    const remitente_id = req.user.id;

    if (!destinatario_id || !file) {
      return res.status(400).json({ message: 'destinatario_id y archivo son requeridos', code: 'MISSING_FIELDS' });
    }

    if (file.size > 20 * 1024 * 1024) {
      return res.status(400).json({ message: 'El archivo no puede ser mayor a 20 MB', code: 'FILE_TOO_LARGE' });
    }

    const conversation = await getOrCreateConversationByPair(remitente_id, destinatario_id);
    const bucketName = 'chat-files';
    
    console.log(`Iniciando carga de archivo: ${file.originalname} (${file.size} bytes)`);
    
    // Asegurar que el bucket existe
    await ensureStorageBucket(bucketName);
    
    const filePath = `chat/${conversation.id}/${Date.now()}_${file.originalname}`;
    console.log(`Ruta del archivo: ${filePath}`);

    // Intentar subir archivo con reintentos
    let uploadError = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`Intento ${attempt} de subir archivo...`);
      
      const result = await supabase.storage
        .from(bucketName)
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
          cacheControl: '3600',
        });

      if (!result.error) {
        uploadError = null;
        console.log(`Archivo subido exitosamente en intento ${attempt}`);
        break;
      } else {
        uploadError = result.error;
        console.error(`Error en intento ${attempt}:`, result.error);
        
        if (attempt < 3) {
          // Esperar un poco antes de reintentar
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
        }
      }
    }

    if (uploadError) {
      console.error(`Fallo final al subir archivo: ${uploadError.message}`);
      return res.status(500).json({ 
        message: `Error al subir archivo: ${uploadError.message}`, 
        code: 'UPLOAD_ERROR', 
        error: uploadError.message 
      });
    }

    const publicUrl = getPublicFileUrl(bucketName, filePath);
    console.log(`URL pública: ${publicUrl}`);

    const attachmentPayload = {
      type: file.mimetype.startsWith('image/') ? 'imagen' : 'documento',
      url: publicUrl,
      name: file.originalname,
      mime: file.mimetype,
      text: caption,
    };

    const { data, error } = await supabase
      .from('mensajes')
      .insert([{
        id_conversacion: conversation.id,
        id_usuario: remitente_id,
        mensaje: JSON.stringify(attachmentPayload),
        leido: false,
        fecha: new Date().toISOString(),
      }])
      .select('id, id_conversacion, id_usuario, mensaje, leido, fecha')
      .limit(1);

    if (error) {
      console.error(`Error al guardar mensaje en DB:`, error);
      return res.status(500).json({ 
        message: `Error al enviar archivo: ${error.message || 'error desconocido'}`, 
        code: 'SEND_ERROR', 
        error 
      });
    }

    const messageRecord = Array.isArray(data) ? data[0] : data;
    const normalized = buildNormalizedChatMessage(messageRecord, remitente_id, destinatario_id);
    emitMessageToRecipient(normalized, destinatario_id);

    res.status(201).json({
      code: 'MESSAGE_SENT',
      message: normalized,
    });
  } catch (err) {
    console.error(`Error crítico en uploadChatAttachment:`, err);
    res.status(500).json({ 
      message: `Error interno: ${err.message}`, 
      error: err.message, 
      code: 'SERVER_ERROR' 
    });
  }
};

const getUnreadMessagesCount = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const { data: users, error: usersError } = await supabase
      .from('usuarios')
      .select('id')
      .neq('id', currentUserId)
      .eq('activo', true);

    if (usersError) {
      return res.status(500).json({ message: 'Error al obtener usuarios', code: 'USERS_ERROR', error: usersError.message });
    }

    const conversationNames = (users || []).map((user) => getConversationKey(currentUserId, user.id));
    const { data: conversations, error: convError } = await supabase
      .from('conversaciones')
      .select('id')
      .in('nombre', conversationNames);

    if (convError) {
      return res.status(500).json({ message: 'Error al obtener conversaciones', code: 'CONVERSATIONS_ERROR', error: convError.message });
    }

    const conversationIds = (conversations || []).map((conv) => conv.id);
    if (conversationIds.length === 0) {
      return res.json({ code: 'COUNT_SUCCESS', unread_count: 0 });
    }

    const { count, error } = await supabase
      .from('mensajes')
      .select('*', { count: 'exact', head: true })
      .in('id_conversacion', conversationIds)
      .neq('id_usuario', currentUserId)
      .eq('leido', false);

    if (error) {
      return res.status(500).json({ message: 'Error al contar mensajes', code: 'COUNT_ERROR', error: error.message });
    }

    res.json({
      code: 'COUNT_SUCCESS',
      unread_count: count || 0,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

const markMessagesAsRead = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { otherUserId } = req.body;

    if (!otherUserId) {
      return res.status(400).json({ message: 'otherUserId es requerido', code: 'MISSING_FIELDS' });
    }

    const conversation = await findConversationByPair(currentUserId, otherUserId);
    if (!conversation) {
      return res.json({ code: 'SUCCESS', messages_read: 0 });
    }

    const { data, error } = await supabase
      .from('mensajes')
      .update({ leido: true })
      .eq('id_conversacion', conversation.id)
      .eq('id_usuario', otherUserId)
      .eq('leido', false)
      .select('id');

    if (error) {
      return res.status(500).json({
        message: 'Error al marcar mensajes como leídos',
        code: 'UPDATE_ERROR',
        error: error.message,
      });
    }

    const io = getIO();
    io.to(`user_${otherUserId}`).emit('messages_read', {
      by: currentUserId,
      count: data?.length || 0,
    });

    res.json({
      code: 'SUCCESS',
      messages_read: data?.length || 0,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

// 🗑️ NUEVA FUNCIÓN: Eliminar mensaje
const deleteMessageForMe = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { messageId } = req.body;

    if (!messageId) {
      return res.status(400).json({ message: 'messageId es requerido', code: 'MISSING_FIELDS' });
    }

    // Obtener el mensaje para verificar que existe
    const { data: messageData, error: fetchError } = await supabase
      .from('mensajes')
      .select('id')
      .eq('id', messageId)
      .limit(1);

    if (fetchError || !messageData || messageData.length === 0) {
      return res.status(404).json({ message: 'Mensaje no encontrado', code: 'NOT_FOUND' });
    }

    // Eliminar completamente el mensaje
    const { error: deleteError } = await supabase
      .from('mensajes')
      .delete()
      .eq('id', messageId);

    if (deleteError) {
      return res.status(500).json({
        message: 'Error al eliminar mensaje',
        code: 'DELETE_ERROR',
        error: deleteError.message,
      });
    }

    // Emitir evento de socket
    try {
      const io = getIO();
      io.emit('message_deleted', {
        messageId,
        deletedByUserId: currentUserId,
      });
    } catch (err) {
      console.warn('Error emitiendo socket:', err.message);
    }

    res.json({
      code: 'SUCCESS',
      message: 'Mensaje eliminado correctamente',
    });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

// 🗑️ NUEVA FUNCIÓN: Vaciar chat
const clearChat = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { otherUserId } = req.body;

    if (!otherUserId) {
      return res.status(400).json({ message: 'otherUserId es requerido', code: 'MISSING_FIELDS' });
    }

    const conversation = await findConversationByPair(currentUserId, otherUserId);
    if (!conversation) {
      return res.json({ code: 'SUCCESS', messages_cleared: 0 });
    }

    // Eliminar todos los mensajes de la conversación
    const { error: deleteError } = await supabase
      .from('mensajes')
      .delete()
      .eq('id_conversacion', conversation.id);

    if (deleteError) {
      return res.status(500).json({
        message: 'Error al vaciar chat',
        code: 'DELETE_ERROR',
        error: deleteError.message,
      });
    }

    // Emitir evento de socket
    try {
      const io = getIO();
      io.emit('chat_cleared', {
        conversationId: conversation.id,
        clearedByUserId: currentUserId,
      });
    } catch (err) {
      console.warn('Error emitiendo socket:', err.message);
    }

    res.json({
      code: 'SUCCESS',
      message: 'Chat vaciado correctamente',
      messages_cleared: 0,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

module.exports = {
  getChatMessages,
  sendMessage,
  getChatContacts,
  getUnreadMessagesCount,
  markMessagesAsRead,
  uploadChatAttachment,
  deleteMessageForMe,
  clearChat,
};
