const supabase = require('../config/supabase');
const { getIO } = require('../socket/chatSocket');

const listAppointments = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const currentUserRole = req.user.rol;
    const { estado, paciente_id, odontologo_id, fecha, fecha_inicio, fecha_fin } = req.query;

    let query = supabase
      .from('citas')
      .select('*, odontologo:id_odontologo(id, nombre, apellido, foto_perfil)');

    if (estado) query = query.eq('estado', estado);
    if (paciente_id) query = query.eq('id_paciente_uuid', paciente_id);
    if (odontologo_id) query = query.eq('id_odontologo', odontologo_id);
    if (fecha) query = query.eq('fecha', fecha);
    if (fecha_inicio) query = query.gte('fecha', fecha_inicio);
    if (fecha_fin) query = query.lte('fecha', fecha_fin);

    if (currentUserRole === 'ODONTOLOGO') {
      query = query.eq('id_odontologo', currentUserId);
    }

    const { data, error } = await query
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true });

    if (error) {
      console.error('[listAppointments] Join error:', error.message, '— reintentando sin join');
      // Si el join falla, reintentar sin join
      const { data: fallback, error: fallbackError } = await supabase
        .from('citas')
        .select('*')
        .order('fecha', { ascending: true })
        .order('hora', { ascending: true });

      if (fallbackError) {
        return res.status(500).json({ message: 'Error al listar citas', error: fallbackError.message, code: 'APPOINTMENTS_LIST_ERROR' });
      }
      return res.json({ code: 'APPOINTMENTS_LIST_SUCCESS', data: fallback || [] });
    }

    res.json({ code: 'APPOINTMENTS_LIST_SUCCESS', data: data || [] });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

const getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;

    let data, error;

    // Intentar con join de odontologo
    ({ data, error } = await supabase
      .from('citas')
      .select('*, odontologo:id_odontologo(id, nombre, apellido, foto_perfil)')
      .eq('id', id)
      .single());

    // Si falla el join, usar select básico
    if (error) {
      ({ data, error } = await supabase
        .from('citas')
        .select('*')
        .eq('id', id)
        .single());
    }

    if (error) {
      return res.status(500).json({ message: 'Error al obtener cita', error: error.message, code: 'APPOINTMENT_GET_ERROR' });
    }

    if (!data) {
      return res.status(404).json({ message: 'Cita no encontrada', code: 'APPOINTMENT_NOT_FOUND' });
    }

    res.json({ code: 'APPOINTMENT_GET_SUCCESS', data });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

const createAppointment = async (req, res) => {
  try {
    const {
      fecha, hora, estado = 'programada', fecha_hora,
      id_paciente_uuid, id_paciente, paciente_id,
      id_odontologo, odontologo_id,
    } = req.body;

    const finalPacienteUuid = id_paciente_uuid ?? id_paciente ?? paciente_id ?? null;
    const finalOdontologoId = id_odontologo ?? odontologo_id ?? null;

    let finalFecha = fecha;
    let finalHora = hora;
    if (fecha_hora && (!fecha || !hora)) {
      const dt = new Date(fecha_hora);
      finalFecha = dt.toISOString().split('T')[0];
      finalHora = dt.toTimeString().substring(0, 5);
    }

    if (!finalFecha || !finalHora) {
      return res.status(400).json({ message: 'Fecha y hora son requeridos', code: 'MISSING_FIELDS' });
    }

    const payload = {
      fecha: finalFecha,
      hora: finalHora,
      estado,
      ...(finalPacienteUuid && { id_paciente_uuid: finalPacienteUuid }),
      ...(finalOdontologoId && { id_odontologo: finalOdontologoId }),
    };

    const { data, error } = await supabase.from('citas').insert([payload]).select('*').single();

    if (error) {
      return res.status(500).json({ message: 'Error al crear cita', error: error.message, code: 'APPOINTMENT_CREATE_ERROR' });
    }

    // Notificar al paciente en la app móvil vía Socket.IO
    if (finalPacienteUuid) {
      try {
        const io = getIO();
        io.to(`user_${finalPacienteUuid}`).emit('new_mobile_appointment', {
          appointmentId: data.id,
          fecha: data.fecha,
          hora: data.hora,
          estado: data.estado,
          servicio: req.body.servicio ?? 'Consulta dental',
          message: `Tienes una nueva cita agendada para el ${data.fecha} a las ${data.hora}`,
          timestamp: new Date().toISOString(),
        });
      } catch (socketErr) {
        console.warn('[createAppointment] Socket emit error:', socketErr?.message);
      }
    }

    res.status(201).json({ code: 'APPOINTMENT_CREATED', data });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, fecha, hora } = req.body;

    // Solo actualizar columnas que con certeza existen y son seguras
    const updates = {};
    if (estado != null) updates.estado = estado;
    if (fecha != null) updates.fecha = fecha;
    if (hora != null) updates.hora = hora;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No hay campos para actualizar', code: 'NO_FIELDS' });
    }

    console.log(`[updateAppointment] id=${id} updates=`, updates);

    const { data, error } = await supabase
      .from('citas')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('[updateAppointment] Supabase error:', error);
      return res.status(500).json({
        message: 'Error al actualizar cita',
        error: error.message,
        code: 'APPOINTMENT_UPDATE_ERROR',
      });
    }

    // Notificar al paciente en tiempo real vía Socket.IO
    const patientId = data.id_paciente_uuid;
    if (patientId && updates.estado) {
      try {
        const io = getIO();
        io.to(`user_${patientId}`).emit('appointment_status_changed', {
          appointmentId: data.id,
          status: data.estado,
          fecha: data.fecha,
          hora: data.hora,
          message: `Tu cita del ${data.fecha} a las ${data.hora} ha sido ${data.estado}`,
          timestamp: new Date().toISOString(),
        });
        console.log(`[updateAppointment] Notificación enviada al paciente ${patientId}: ${data.estado}`);
      } catch (socketErr) {
        console.warn('[updateAppointment] Error enviando socket:', socketErr?.message);
      }
    }

    res.json({ code: 'APPOINTMENT_UPDATED', data });
  } catch (err) {
    console.error('[updateAppointment] Error:', err);
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('citas')
      .delete()
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ message: 'Error al eliminar cita', error: error.message, code: 'APPOINTMENT_DELETE_ERROR' });
    }

    res.json({ code: 'APPOINTMENT_DELETED', data });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

module.exports = {
  listAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
};
