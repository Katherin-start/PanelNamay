const supabase = require('../config/supabase');

const listAppointments = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const currentUserRole = req.user.rol;
    const { estado, paciente_id, odontologo_id, fecha, fecha_inicio, fecha_fin } = req.query;

    let query = supabase
      .from('citas')
      .select(
        'id, fecha, hora, estado, id_paciente, id_odontologo, pacientes:id_paciente(nombre), usuarios:id_odontologo(nombre)'
      );

    if (estado) query = query.eq('estado', estado);
    if (paciente_id) query = query.eq('id_paciente', paciente_id);
    if (odontologo_id) query = query.eq('id_odontologo', odontologo_id);
    if (fecha) query = query.eq('fecha', fecha);
    if (fecha_inicio) query = query.gte('fecha', fecha_inicio);
    if (fecha_fin) query = query.lte('fecha', fecha_fin);

    if (currentUserRole === 'ODONTOLOGO') {
      query = query.eq('id_odontologo', currentUserId);
    }

    const { data, error } = await query.order('fecha', { ascending: true }).order('hora', { ascending: true });

    if (error) {
      return res.status(500).json({ message: 'Error al listar citas', error: error.message, code: 'APPOINTMENTS_LIST_ERROR' });
    }

    res.json({ code: 'APPOINTMENTS_LIST_SUCCESS', data: data || [] });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

const getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('citas')
      .select('id, fecha, hora, estado, id_paciente, id_odontologo, pacientes:id_paciente(nombre), usuarios:id_odontologo(nombre)')
      .eq('id', id)
      .single();

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
    const { fecha, hora, id_paciente, id_odontologo, paciente_id, odontologo_id, estado = 'programada', fecha_hora } = req.body;

    const finalPacienteId = id_paciente ?? paciente_id ?? null;
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
      id_paciente: finalPacienteId,
      id_odontologo: finalOdontologoId,
      estado,
    };

    const { data, error } = await supabase.from('citas').insert([payload]).select('*').single();

    if (error) {
      return res.status(500).json({ message: 'Error al crear cita', error: error.message, code: 'APPOINTMENT_CREATE_ERROR' });
    }

    res.status(201).json({ code: 'APPOINTMENT_CREATED', data });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, hora, id_paciente, id_odontologo, paciente_id, odontologo_id, estado } = req.body;

    const updates = {
      fecha,
      hora,
      id_paciente: id_paciente ?? paciente_id,
      id_odontologo: id_odontologo ?? odontologo_id,
      estado,
    };

    const filteredUpdates = Object.entries(updates).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = value;
      return acc;
    }, {});

    const { data, error } = await supabase
      .from('citas')
      .update(filteredUpdates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ message: 'Error al actualizar cita', error: error.message, code: 'APPOINTMENT_UPDATE_ERROR' });
    }

    res.json({ code: 'APPOINTMENT_UPDATED', data });
  } catch (err) {
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
