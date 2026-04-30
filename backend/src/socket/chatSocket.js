const { Server } = require('socket.io');
const supabase = require('../config/supabase');

let io;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*", // En producción, especificar los orígenes permitidos
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('Usuario conectado:', socket.id);

    // Unir usuario a su sala personal
    socket.on('join', (userId) => {
      socket.join(`user_${userId}`);
      console.log(`Usuario ${userId} se unió a su sala`);
    });

    // Manejar envío de mensajes
    socket.on('send_message', async (data) => {
      try {
        const { remitente_id, destinatario_id, contenido, tipo = 'texto' } = data;

        // Guardar mensaje en base de datos
        const { data: message, error } = await supabase
          .from('mensajes_chat')
          .insert([{
            remitente_id,
            destinatario_id,
            contenido,
            tipo,
            leido: false
          }])
          .select(`
            id,
            contenido,
            tipo,
            leido,
            created_at,
            remitente:remitente_id(id, nombre),
            destinatario:destinatario_id(id, nombre)
          `)
          .single();

        if (error) {
          socket.emit('message_error', { error: 'Error al enviar mensaje' });
          return;
        }

        // Enviar mensaje al destinatario
        io.to(`user_${destinatario_id}`).emit('new_message', message);

        // Confirmar envío al remitente
        socket.emit('message_sent', message);

      } catch (err) {
        socket.emit('message_error', { error: 'Error interno del servidor' });
      }
    });

    // Manejar mensajes leídos
    socket.on('mark_as_read', async (data) => {
      try {
        const { userId, otherUserId } = data;

        await supabase
          .from('mensajes_chat')
          .update({ leido: true })
          .eq('remitente_id', otherUserId)
          .eq('destinatario_id', userId)
          .eq('leido', false);

        // Notificar al otro usuario que sus mensajes fueron leídos
        io.to(`user_${otherUserId}`).emit('messages_read', { by: userId });

      } catch (err) {
        console.error('Error al marcar mensajes como leídos:', err);
      }
    });

    // Manejar desconexión
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
  getIO
};