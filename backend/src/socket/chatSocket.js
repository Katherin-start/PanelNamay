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

  io.on('connection', (socket) => {
    console.log('Usuario conectado:', socket.id);

    socket.on('join', (userId) => {
      socket.join(`user_${userId}`);
      console.log(`Usuario ${userId} se unió a su sala`);
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

    socket.on('disconnect', () => {
      console.log('Usuario desconectado:', socket.id);
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
