const supabase = require('../config/supabase');

// 🔔 ALERTAS MÉDICAS
const getMedicalAlerts = async (req, res) => {
  try {
    const { paciente_id, tipo, estado = 'activa', page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('alertas_medicas')
      .select(`
        id,
        tipo,
        titulo,
        descripcion,
        fecha_programada,
        prioridad,
        estado,
        created_at,
        paciente:usuarios!alertas_medicas_paciente_id_fkey(id, nombre, correo)
      `)
      .range(offset, offset + limit - 1)
      .order('fecha_programada', { ascending: true });

    if (paciente_id) {
      query = query.eq('paciente_id', paciente_id);
    }

    if (tipo) {
      query = query.eq('tipo', tipo);
    }

    if (estado) {
      query = query.eq('estado', estado);
    }

    const { data: alerts, error } = await query;

    if (error) {
      return res.status(500).json({ message: 'Error al obtener alertas', code: 'ALERTS_ERROR' });
    }

    res.json({
      code: 'ALERTS_SUCCESS',
      alerts: alerts || []
    });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

const createMedicalAlert = async (req, res) => {
  try {
    const { paciente_id, tipo, titulo, descripcion, fecha_programada, prioridad = 'media' } = req.body;

    const { data: alert, error } = await supabase
      .from('alertas_medicas')
      .insert([{
        paciente_id,
        tipo,
        titulo,
        descripcion,
        fecha_programada,
        prioridad,
        estado: 'activa'
      }])
      .select(`
        id,
        tipo,
        titulo,
        descripcion,
        fecha_programada,
        prioridad,
        estado,
        created_at,
        paciente:usuarios!alertas_medicas_paciente_id_fkey(id, nombre, correo)
      `)
      .single();

    if (error) {
      return res.status(500).json({ message: 'Error al crear alerta', code: 'CREATE_ERROR' });
    }

    res.status(201).json({
      code: 'ALERT_CREATED',
      alert
    });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

const updateMedicalAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data: alert, error } = await supabase
      .from('alertas_medicas')
      .update(updates)
      .eq('id', id)
      .select(`
        id,
        tipo,
        titulo,
        descripcion,
        fecha_programada,
        prioridad,
        estado,
        created_at,
        paciente:usuarios!alertas_medicas_paciente_id_fkey(id, nombre, correo)
      `)
      .single();

    if (error) {
      return res.status(500).json({ message: 'Error al actualizar alerta', code: 'UPDATE_ERROR' });
    }

    res.json({
      code: 'ALERT_UPDATED',
      alert
    });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

const getUpcomingAlerts = async (req, res) => {
  try {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const { data: alerts, error } = await supabase
      .from('alertas_medicas')
      .select(`
        id,
        tipo,
        titulo,
        descripcion,
        fecha_programada,
        prioridad,
        paciente:usuarios!alertas_medicas_paciente_id_fkey(id, nombre, correo)
      `)
      .eq('estado', 'activa')
      .gte('fecha_programada', today.toISOString())
      .lte('fecha_programada', nextWeek.toISOString())
      .order('fecha_programada', { ascending: true })
      .limit(50);

    if (error) {
      return res.status(500).json({ message: 'Error al obtener alertas próximas', code: 'UPCOMING_ERROR' });
    }

    // Clasificar por urgencia
    const urgent = alerts?.filter(a => a.prioridad === 'urgente' || a.prioridad === 'alta') || [];
    const normal = alerts?.filter(a => a.prioridad === 'media') || [];
    const low = alerts?.filter(a => a.prioridad === 'baja') || [];

    res.json({
      code: 'UPCOMING_SUCCESS',
      alerts: {
        urgent,
        normal,
        low,
        all: alerts || []
      },
      summary: {
        total: alerts?.length || 0,
        urgent: urgent.length,
        normal: normal.length,
        low: low.length
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

const getPatientAlerts = async (req, res) => {
  try {
    const { paciente_id } = req.params;

    const { data: alerts, error } = await supabase
      .from('alertas_medicas')
      .select(`
        id,
        tipo,
        titulo,
        descripcion,
        fecha_programada,
        prioridad,
        estado,
        created_at
      `)
      .eq('paciente_id', paciente_id)
      .order('fecha_programada', { ascending: false });

    if (error) {
      return res.status(500).json({ message: 'Error al obtener alertas del paciente', code: 'PATIENT_ALERTS_ERROR' });
    }

    res.json({
      code: 'PATIENT_ALERTS_SUCCESS',
      alerts: alerts || []
    });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

module.exports = {
  getMedicalAlerts,
  createMedicalAlert,
  updateMedicalAlert,
  getUpcomingAlerts,
  getPatientAlerts,
};