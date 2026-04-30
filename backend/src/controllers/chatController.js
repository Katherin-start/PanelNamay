const supabase = require('../config/supabase');

// 💬 SISTEMA DE CHAT - Entre web y móvil
const getChatMessages = async (req, res) => {
  try {
    const otherUserId = req.params.userId;
    const currentUserId = req.user.id;

    const { data: messages, error } = await supabase
      .from('mensajes_chat')
      .select('id, remitente_id, destinatario_id, contenido, tipo, leido, created_at')
      .or(`and(remitente_id.eq.${currentUserId},destinatario_id.eq.${otherUserId}),and(remitente_id.eq.${otherUserId},destinatario_id.eq.${currentUserId})`)
      .order('created_at', { ascending: true });

    if (error) {
      return res.status(500).json({ message: 'Error al obtener mensajes', code: 'CHAT_ERROR', error: error.message });
    }

    await supabase
      .from('mensajes_chat')
      .update({ leido: true })
      .eq('remitente_id', otherUserId)
      .eq('destinatario_id', currentUserId)
      .eq('leido', false);

    res.json({
      code: 'CHAT_SUCCESS',
      messages: messages || []
    });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { destinatario_id, contenido, tipo = 'texto' } = req.body;
    const remitente_id = req.user.id;

    const { data: message, error } = await supabase
      .from('mensajes_chat')
      .insert([{
        remitente_id,
        destinatario_id,
        contenido,
        tipo,
        leido: false
      }])
      .select('id, remitente_id, destinatario_id, contenido, tipo, leido, created_at')
      .single();

    if (error) {
      return res.status(500).json({ message: 'Error al enviar mensaje', code: 'SEND_ERROR', error: error.message });
    }

    res.status(201).json({
      code: 'MESSAGE_SENT',
      message
    });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

const getChatContacts = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const { data: conversations, error } = await supabase
      .from('mensajes_chat')
      .select('id, remitente_id, destinatario_id, contenido, created_at')
      .or(`remitente_id.eq.${currentUserId},destinatario_id.eq.${currentUserId}`)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ message: 'Error al obtener contactos', code: 'CONTACTS_ERROR', error: error.message });
    }

    const contactIds = new Set();
    const contactsData = [];

    conversations?.forEach(conv => {
      const otherId = conv.remitente_id === currentUserId ? conv.destinatario_id : conv.remitente_id;

      if (!contactIds.has(otherId)) {
        contactIds.add(otherId);
        contactsData.push({
          id: otherId,
          last_message: conv.contenido,
          last_message_at: conv.created_at
        });
      }
    });

    if (contactIds.size > 0) {
      const ids = Array.from(contactIds);
      const { data: users } = await supabase
        .from('usuarios')
        .select('id, nombre, correo')
        .in('id', ids);

      const usersMap = new Map(users?.map(user => [user.id, user]));

      contactsData.forEach(contact => {
        const user = usersMap.get(contact.id);
        if (user) {
          contact.nombre = user.nombre;
          contact.correo = user.correo;
        }
      });
    }

    res.json({
      code: 'CONTACTS_SUCCESS',
      contacts: contactsData
    });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

const getUnreadMessagesCount = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const { count, error } = await supabase
      .from('mensajes_chat')
      .select('*', { count: 'exact', head: true })
      .eq('destinatario_id', currentUserId)
      .eq('leido', false);

    if (error) {
      return res.status(500).json({ message: 'Error al contar mensajes', code: 'COUNT_ERROR', error: error.message });
    }

    res.json({
      code: 'COUNT_SUCCESS',
      unread_count: count || 0
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
};