const supabase = require('../config/supabase');

const getServices = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('servicios')
      .select('id, nombre, descripcion, precio, activo, creado_en, actualizado_en')
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (error) {
      return res.status(500).json({ message: 'Error al obtener servicios', error: error.message, code: 'SERVICE_LIST_ERROR' });
    }

    res.json({ code: 'SERVICES_LIST_SUCCESS', services: data || [] });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('servicios')
      .select('id, nombre, descripcion, precio, activo, creado_en, actualizado_en')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(500).json({ message: 'Error al obtener servicio', error: error.message, code: 'SERVICE_GET_ERROR' });
    }

    if (!data) {
      return res.status(404).json({ message: 'Servicio no encontrado', code: 'SERVICE_NOT_FOUND' });
    }

    res.json({ code: 'SERVICE_GET_SUCCESS', service: data });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

const createService = async (req, res) => {
  try {
    const { nombre, descripcion, precio, activo = true } = req.body;
    const parsedPrecio = Number(precio);

    if (!nombre || Number.isNaN(parsedPrecio)) {
      return res.status(400).json({ message: 'Nombre y precio son requeridos', code: 'MISSING_FIELDS' });
    }

    const payload = {
      nombre: String(nombre).trim(),
      descripcion: descripcion || null,
      precio: parsedPrecio,
      activo: activo === false ? false : true,
      creado_por: req.user.id,
    };

    const { data, error } = await supabase
      .from('servicios')
      .insert([payload])
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ message: 'Error al crear servicio', error: error.message, code: 'SERVICE_CREATE_ERROR' });
    }

    res.status(201).json({ code: 'SERVICE_CREATED', service: data });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, precio, activo } = req.body;
    const payload = {};

    if (nombre !== undefined) payload.nombre = String(nombre).trim();
    if (descripcion !== undefined) payload.descripcion = descripcion;
    if (precio !== undefined) {
      const parsedPrecio = Number(precio);
      if (Number.isNaN(parsedPrecio)) {
        return res.status(400).json({ message: 'Precio inválido', code: 'INVALID_PRICE' });
      }
      payload.precio = parsedPrecio;
    }
    if (activo !== undefined) payload.activo = Boolean(activo);
    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ message: 'No se proporcionaron datos para actualizar', code: 'NO_UPDATE_FIELDS' });
    }

    payload.actualizado_en = new Date().toISOString();

    const { data, error } = await supabase
      .from('servicios')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ message: 'Error al actualizar servicio', error: error.message, code: 'SERVICE_UPDATE_ERROR' });
    }

    res.json({ code: 'SERVICE_UPDATED', service: data });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('servicios')
      .update({ activo: false, actualizado_en: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ message: 'Error al desactivar servicio', error: error.message, code: 'SERVICE_DELETE_ERROR' });
    }

    res.json({ code: 'SERVICE_DEACTIVATED', service: data });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

module.exports = {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
};
