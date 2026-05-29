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
    const { destinatario_id, contenido, mensaje, tipo = 'texto' } = req.body;
    const body = contenido ?? mensaje;
    const remitente_id = req.user.id;

    if (!destinatario_id || !body) {
      return res.status(400).json({ message: 'destinatario_id y contenido son requeridos', code: 'MISSING_FIELDS' });
    }

    const { data: message, error } = await supabase
      .from('mensajes_chat')
      .insert([{
        remitente_id,
        destinatario_id,
        contenido: body,
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

const getChatContacts = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const { data: conversations, error: convError } = await supabase
      .from('mensajes_chat')
      .select('id, remitente_id, destinatario_id, contenido, created_at')
      .or(`remitente_id.eq.${currentUserId},destinatario_id.eq.${currentUserId}`)
      .order('created_at', { ascending: false });

    if (convError) {
      return res.status(500).json({ message: 'Error al obtener contactos', code: 'CONTACTS_ERROR', error: convError.message });
    }

    const contactDataById = new Map();
    conversations?.forEach(conv => {
      const otherId = conv.remitente_id === currentUserId ? conv.destinatario_id : conv.remitente_id;
      const existing = contactDataById.get(otherId);
      if (!existing || new Date(conv.created_at) > new Date(existing.last_message_at)) {
        contactDataById.set(otherId, {
          id: otherId,
          last_message: conv.contenido,
          last_message_at: conv.created_at,
        });
      }
    });

    const { data: users, error: usersError } = await supabase
      .from('usuarios')
      .select('id, nombre, correo, rol_id, activo, roles:rol_id(id, nombre)')
      .neq('id', currentUserId)
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (usersError) {
      return res.status(500).json({ message: 'Error al obtener usuarios', code: 'USERS_ERROR', error: usersError.message });
    }

    const { data: unreadMessages, error: unreadError } = await supabase
      .from('mensajes_chat')
      .select('remitente_id')
      .eq('destinatario_id', currentUserId)
      .eq('leido', false);

    if (unreadError) {
      return res.status(500).json({ message: 'Error al contar mensajes no leídos', code: 'UNREAD_ERROR', error: unreadError.message });
    }

    const unreadCountMap = new Map();
    unreadMessages?.forEach((msg) => {
      const count = unreadCountMap.get(msg.remitente_id) ?? 0;
      unreadCountMap.set(msg.remitente_id, count + 1);
    });

    const contacts = (users || []).map((user) => {
      const contactInfo = contactDataById.get(user.id) ?? {};
      return {
        id: user.id,
        nombre: user.nombre,
        correo: user.correo,
        rol: user.roles?.nombre || rolIdToName(user.rol_id),
        last_message: contactInfo.last_message ?? '',
        last_message_at: contactInfo.last_message_at ?? null,
        mensajes_no_leidos: unreadCountMap.get(user.id) ?? 0,
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