const supabase = require('../config/supabase');

const normalizeDiscount = (discount) => ({
  id: discount?.id,
  nombre: discount?.nombre,
  descripcion: discount?.descripcion ?? '',
  tipo: discount?.tipo,
  valor: Number(discount?.valor) || 0,
  fecha_inicio: discount?.fecha_inicio,
  fecha_fin: discount?.fecha_fin,
  aplica_a: discount?.aplica_a ?? 'TODOS',
  estado: discount?.estado,
  activo: discount?.activo,
  aprobado_por: discount?.aprobado_por,
  aprobado_en: discount?.aprobado_en,
  creado_por: discount?.creado_por,
  creado_en: discount?.creado_en,
});

const normalizeRoleList = (value) => {
  if (!value) return 'TODOS';
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim().toUpperCase())
      .filter(Boolean)
      .join(',') || 'TODOS';
  }
  return String(value).trim().toUpperCase() || 'TODOS';
};

const isRoleAllowed = (discount, role) => {
  if (!discount || !discount.aplica_a) return true;
  const list = discount.aplica_a
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
  if (list.length === 0 || list.includes('TODOS')) return true;
  if (!role) return false;
  return list.includes(role.toUpperCase());
};

const createDiscount = async (req, res) => {
  try {
    const {
      nombre,
      descripcion,
      tipo,
      valor,
      fecha_inicio,
      fecha_fin,
      aplica_a,
      estado = 'pendiente',
      activo = true,
    } = req.body;

    if (!nombre || !tipo || valor === undefined || !fecha_inicio || !fecha_fin) {
      return res.status(400).json({ message: 'Faltan campos obligatorios', code: 'MISSING_FIELDS' });
    }

    const normalizedTipo = String(tipo).trim().toLowerCase();
    if (!['porcentaje', 'monto'].includes(normalizedTipo)) {
      return res.status(400).json({ message: 'Tipo de descuento inválido', code: 'INVALID_TYPE' });
    }

    // For security: if the requester is RECEPCIONISTA, force estado to 'pendiente'
    const normalizedEstado = String(estado).trim().toLowerCase();
    if (req.user?.rol === 'RECEPCIONISTA') {
      // override any provided estado
      if (normalizedEstado !== 'pendiente') {
        // ignore client value and set to pendiente
      }
    }
    if (!['pendiente', 'aprobado', 'rechazado'].includes(normalizedEstado)) {
      return res.status(400).json({ message: 'Estado de descuento inválido', code: 'INVALID_STATUS' });
    }

    const allowedRoles = normalizeRoleList(aplica_a);
    const ahora = new Date().toISOString();

    const payload = {
      nombre: String(nombre).trim(),
      descripcion: descripcion ? String(descripcion).trim() : null,
      tipo: normalizedTipo,
      valor: Number(valor),
      fecha_inicio,
      fecha_fin,
      aplica_a: allowedRoles,
      // if creator is recepcionista, always 'pendiente'
      estado: (req.user?.rol === 'RECEPCIONISTA') ? 'pendiente' : normalizedEstado,
      activo: Boolean(activo),
      creado_por: req.user.id,
      creado_en: ahora,
      solicitado_en: ahora,
    };

    if (normalizedEstado === 'aprobado') {
      payload.aprobado_por = req.user.id;
      payload.aprobado_en = ahora;
    }

    // Debug logging: show who is creating and payload
    console.debug('[DISCOUNTS] createDiscount called by user:', req.user);
    console.debug('[DISCOUNTS] payload:', payload);

    const { data, error } = await supabase.from('descuentos').insert([payload]).select('*').single();

    if (error) {
      console.error('[DISCOUNTS] supabase insert error:', error);
      return res.status(500).json({ message: 'Error al crear descuento', error: error.message, code: 'DISCOUNT_CREATION_ERROR' });
    }

    return res.status(201).json({ code: 'DISCOUNT_CREATED', discount: normalizeDiscount(data) });
  } catch (err) {
    return res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

const listDiscounts = async (req, res) => {
  try {
    const isAdmin = req.user?.rol === 'ADMINISTRADOR';
    // If admin: return all discount requests so approved/rejected items remain visible
    if (isAdmin) {
      const { data: discountsData, error: discountsError } = await supabase
        .from('descuentos')
        .select('*')
        .order('solicitado_en', { ascending: false });

      if (discountsError) {
        console.error('[DISCOUNTS] error fetching admin discounts', discountsError);
        return res.status(500).json({ message: 'Error al obtener solicitudes', error: discountsError.message, code: 'DISCOUNT_LIST_ERROR' });
      }

      const arr = Array.isArray(discountsData) ? discountsData : [];
      const discounts = arr.map(normalizeDiscount);
      return res.json({ code: 'DISCOUNTS_LIST_SUCCESS', discounts });
    }

    // Non-admin: return approved & active discounts within date range (for general users)
    // plus any discounts created by the current user (so they can see their pending requests)
    const today = new Date().toISOString().split('T')[0];
    const { data: approvedData, error: approvedError } = await supabase
      .from('descuentos')
      .select('*')
      .eq('estado', 'aprobado')
      .eq('activo', true)
      .lte('fecha_inicio', today)
      .gte('fecha_fin', today)
      .order('fecha_inicio', { ascending: true });

    if (approvedError) {
      console.error('[DISCOUNTS] error fetching approved discounts', approvedError);
      return res.status(500).json({ message: 'Error al obtener descuentos', error: approvedError.message, code: 'DISCOUNT_LIST_ERROR' });
    }

    const { data: ownData, error: ownError } = await supabase
      .from('descuentos')
      .select('*')
      .eq('creado_por', req.user.id)
      .order('solicitado_en', { ascending: false });

    if (ownError) {
      console.error('[DISCOUNTS] error fetching own discounts', ownError);
      return res.status(500).json({ message: 'Error al obtener tus solicitudes', error: ownError.message, code: 'DISCOUNT_LIST_ERROR' });
    }

    const approved = Array.isArray(approvedData) ? approvedData : [];
    const own = Array.isArray(ownData) ? ownData : [];

    // Merge and deduplicate by id (own should override approved if same)
    const map = {};
    [...approved, ...own].forEach((d) => { map[d.id] = d; });
    const merged = Object.values(map).map(normalizeDiscount).sort((a, b) => (a.fecha_inicio || '').localeCompare(b.fecha_inicio || ''));
    return res.json({ code: 'DISCOUNTS_LIST_SUCCESS', discounts: merged });
  } catch (err) {
    return res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

const getDiscountDetails = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'ID de descuento requerido', code: 'MISSING_DISCOUNT_ID' });
    }

    const { data, error } = await supabase.from('descuentos').select('*').eq('id', id).single();
    if (error) {
      return res.status(500).json({ message: 'Error al obtener descuento', error: error.message, code: 'DISCOUNT_DETAILS_ERROR' });
    }
    if (!data) {
      return res.status(404).json({ message: 'Descuento no encontrado', code: 'DISCOUNT_NOT_FOUND' });
    }

    return res.json({ code: 'DISCOUNT_DETAILS_SUCCESS', discount: normalizeDiscount(data) });
  } catch (err) {
    return res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

const approveDiscount = async (req, res) => {
  try {
    const { id } = req.params;
    const { accion } = req.body;

    if (!id || !accion) {
      return res.status(400).json({ message: 'ID y acción son obligatorios', code: 'MISSING_FIELDS' });
    }

    const normalizedAction = String(accion).trim().toLowerCase();
    if (!['aprobado', 'rechazado'].includes(normalizedAction)) {
      return res.status(400).json({ message: 'Acción inválida', code: 'INVALID_ACTION' });
    }

    const estado = normalizedAction;
    const activo = normalizedAction === 'aprobado';
    const ahora = new Date().toISOString();

    const { data, error } = await supabase
      .from('descuentos')
      .update({ estado, activo, aprobado_por: req.user.id, aprobado_en: ahora })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ message: 'Error al actualizar descuento', error: error.message, code: 'DISCOUNT_UPDATE_ERROR' });
    }

    return res.json({ code: 'DISCOUNT_APPROVED_SUCCESS', discount: normalizeDiscount(data) });
  } catch (err) {
    return res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

module.exports = {
  createDiscount,
  listDiscounts,
  getDiscountDetails,
  approveDiscount,
  isRoleAllowed,
};
