const { Server } = require('socket.io');
const supabase = require('../config/supabase');

let io;

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

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // 📊 Mapa para rastrear usuarios conectados
  const connectedUsers = new Map();

  io.on('connection', (socket) => {
    console.log('Usuario conectado:', socket.id);

    socket.on('join', async (userId) => {
      try {
        socket.join(`user_${userId}`);
        connectedUsers.set(userId, {
          socketId: socket.id,
          connectedAt: new Date().toISOString(),
        });

        // ✅ Actualizar usuario como online
        await supabase
          .from('usuarios')
          .update({ online: true, last_seen: new Date().toISOString() })
          .eq('id', userId);

        console.log(`Usuario ${userId} se unió a su sala (online)`);

        // 📢 Notificar a todos que este usuario está online
        io.emit('user_status_changed', {
          userId,
          online: true,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Error en join:', err);
      }
    });

    socket.on('send_message', async (data) => {
      try {
        const { remitente_id, destinatario_id, contenido, tipo = 'texto' } = data;
        const conversation = await getOrCreateConversationByPair(remitente_id, destinatario_id);
        const fecha = new Date().toISOString();

        const { data: message, error } = await supabase
          .from('mensajes')
          .insert([{
            id_conversacion: conversation.id,
            id_usuario: remitente_id,
            mensaje: contenido,
            leido: false,
            fecha,
          }])
          .select('id, id_conversacion, id_usuario, mensaje, leido, fecha')
          .single();

        if (error) {
          socket.emit('message_error', { error: 'Error al enviar mensaje' });
          return;
        }

        const normalized = {
          ...message,
          remitente_id,
          destinatario_id,
          contenido: message.mensaje,
          created_at: message.fecha,
          fecha_envio: message.fecha,
        };

        io.to(`user_${destinatario_id}`).emit('new_message', normalized);
        socket.emit('message_sent', normalized);
      } catch (err) {
        socket.emit('message_error', { error: 'Error interno del servidor' });
      }
    });

    socket.on('typing', (data) => {
      try {
        const { from, to, isTyping } = data;
        if (!from || !to) return;
        io.to(`user_${to}`).emit('user_typing', {
          from,
          isTyping: Boolean(isTyping),
        });
      } catch (err) {
        console.error('Error en evento typing:', err);
      }
    });

    socket.on('mark_as_read', async (data) => {
      try {
        const { userId, otherUserId } = data;
        const conversation = await findConversationByPair(userId, otherUserId);
        if (!conversation) return;

        const { data: updatedMessages, error } = await supabase
          .from('mensajes')
          .update({ leido: true })
          .eq('id_conversacion', conversation.id)
          .eq('id_usuario', otherUserId)
          .eq('leido', false)
          .select('id');

        if (!error && updatedMessages && updatedMessages.length > 0) {
          io.to(`user_${otherUserId}`).emit('messages_read', { 
            by: userId,
            count: updatedMessages.length 
          });
        }
      } catch (err) {
        console.error('Error al marcar mensajes como leídos:', err);
      }
    });

    socket.on('message_read', async (data) => {
      try {
        const { messageId, userId, otherUserId } = data;
        
        await supabase
          .from('mensajes')
          .update({ leido: true })
          .eq('id', messageId);

        io.to(`user_${otherUserId}`).emit('message_read_receipt', { 
          messageId,
          readBy: userId,
          readAt: new Date().toISOString()
        });
      } catch (err) {
        console.error('Error al marcar mensaje como leído:', err);
      }
    });

    socket.on('disconnect', async () => {
      console.log('Usuario desconectado:', socket.id);

      // 🔍 Buscar qué usuario se desconectó
      let disconnectedUserId = null;
      for (const [userId, userData] of connectedUsers.entries()) {
        if (userData.socketId === socket.id) {
          disconnectedUserId = userId;
          connectedUsers.delete(userId);
          break;
        }
      }

      if (disconnectedUserId) {
        try {
          const now = new Date().toISOString();
          // ❌ Actualizar usuario como offline
          await supabase
            .from('usuarios')
            .update({ online: false, last_seen: now })
            .eq('id', disconnectedUserId);

          console.log(`Usuario ${disconnectedUserId} se desconectó (offline)`);

          // 📢 Notificar a todos que este usuario está offline
          io.emit('user_status_changed', {
            userId: disconnectedUserId,
            online: false,
            lastSeen: now,
            timestamp: now,
          });
        } catch (err) {
          console.error('Error al actualizar estado de desconexión:', err);
        }
      }
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io no ha sido inicializado');
  }
  return io;
};

module.exports = {
  initializeSocket,
  getIO,
};
