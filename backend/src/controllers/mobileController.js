const supabase = require('../config/supabase');
const supabaseAuth = require('../config/supabaseAuth');
const jwt = require('jsonwebtoken');
const { getIO } = require('../socket/chatSocket');

const resolveRoleId = async (roleName) => {
  if (!roleName) {
    console.warn('❌ [resolveRoleId] roleName es null/undefined');
    return null;
  }

  const normalized = String(roleName).trim().toUpperCase();
  console.log(`🔍 [resolveRoleId] Buscando rol: "${normalized}"`);

  try {
    // Primera búsqueda: case-insensitive exacta
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('id, nombre')
      .ilike('nombre', normalized)
      .maybeSingle();

    if (roleError && roleError.code !== 'PGRST116') {
      console.error(`❌ [resolveRoleId] Error consultando BD:`, roleError.message);
      return null;
    }

    if (roleData) {
      console.log(`✅ [resolveRoleId] Rol encontrado: ${roleData.nombre} (ID: ${roleData.id})`);
      return roleData.id;
    }

    // Si no encontró con ilike, buscar exactamente (por si hay diferencias en espacios/caracteres)
    console.warn(`⚠️ [resolveRoleId] Búsqueda ilike no encontró "${normalized}". Intentando búsqueda alternativa...`);
    const { data: allRoles, error: allRolesError } = await supabase
      .from('roles')
      .select('id, nombre')
      .order('nombre');

    if (allRolesError) {
      console.error(`❌ [resolveRoleId] Error listando roles:`, allRolesError.message);
      return null;
    }

    if (!allRoles || allRoles.length === 0) {
      console.warn(`⚠️ [resolveRoleId] No hay roles en la BD`);
      return null;
    }

    console.warn(`📋 Roles disponibles en BD:`, allRoles.map(r => `"${r.nombre}" (${r.id})`).join(', '));

    // Búsqueda por coincidencia parcial
    const exactMatch = allRoles.find(r => r.nombre.toUpperCase() === normalized);
    if (exactMatch) {
      console.log(`✅ [resolveRoleId] Rol encontrado (búsqueda alternativa): ${exactMatch.nombre} (ID: ${exactMatch.id})`);
      return exactMatch.id;
    }

    console.error(`❌ [resolveRoleId] Rol "${normalized}" NO existe en BD`);
    return null;
  } catch (err) {
    console.error(`❌ [resolveRoleId] Error inesperado:`, err?.message || err);
    return null;
  }
};

const notifyUsersByRole = async (roleName, event, payload) => {
  try {
    console.log(`\n📢 [notifyUsersByRole] Intentando notificar rol: "${roleName}" con evento: "${event}"`);

    const roleId = await resolveRoleId(roleName);
    if (!roleId) {
      console.error(`❌ [notifyUsersByRole] No se encontró el rol "${roleName}", ABORTANDO notificaciones.`);
      return false;
    }

    console.log(`✅ [notifyUsersByRole] Rol ID resuelto: ${roleId}`);

    const { data: users, error: usersError } = await supabase
      .from('usuarios')
      .select('id, nombre, correo, rol_id, activo')
      .eq('rol_id', roleId)
      .eq('activo', true);

    if (usersError) {
      console.error(`❌ [notifyUsersByRole] Error listando usuarios para rol ${roleName} (${roleId}):`, usersError.message);
      return false;
    }

    if (!users || users.length === 0) {
      console.warn(`⚠️ [notifyUsersByRole] No hay usuarios activos para el rol ${roleName} (${roleId})`);
      return false;
    }

    console.log(`👥 [notifyUsersByRole] Encontrados ${users.length} usuario(s) para ${roleName}:`);
    users.forEach(u => console.log(`  - ${u.nombre} (${u.correo}) [${u.id}]`));

    const io = getIO();
    if (!io) {
      console.error(`❌ [notifyUsersByRole] Socket.IO no está inicializado`);
      return false;
    }

    let notificacionesEnviadas = 0;
    let notificacionesFallidas = 0;

    // 🎯 Opción 1: Enviar directamente a la sala del rol (más eficiente si los usuarios están en ella)
    const normalizedRoleName = String(roleName).trim().toUpperCase();
    const roleRoom = `role_${normalizedRoleName}`;
    
    try {
      console.log(`📤 [notifyUsersByRole] Emitiendo a sala de rol: ${roleRoom}`);
      io.to(roleRoom).emit(event, payload);
      notificacionesEnviadas++;
    } catch (e) {
      console.warn(`⚠️ [notifyUsersByRole] Error emitiendo a sala de rol, intentando notificación individual...`, e?.message);
    }

    // 🎯 Opción 2: Fallback - Enviar a cada usuario individualmente
    users.forEach((user) => {
      try {
        const roomId = `user_${user.id}`;
        console.log(`📤 [notifyUsersByRole] Fallback - Emitiendo a room: ${roomId} - evento: "${event}"`);
        io.to(roomId).emit(event, payload);
        notificacionesEnviadas++;
      } catch (e) {
        console.error(`⚠️ [notifyUsersByRole] Error emitiendo a usuario ${user.id}:`, e?.message);
        notificacionesFallidas++;
      }
    });

    console.log(`✅ [notifyUsersByRole] ${notificacionesEnviadas}/${users.length + 1} notificación(es) enviada(s) para evento "${event}" (${notificacionesFallidas} fallidas)`);
    return notificacionesEnviadas > 0;
  } catch (err) {
    console.error(`❌ [notifyUsersByRole] Error inesperado:`, err?.message || err);
    return false;
  }
};

const mobileRegister = async (req, res) => {
  const { email, password, nombre, apellido, foto_perfil } = req.body;

  if (!email || !password || !nombre) {
    return res.status(400).json({
      message: 'Email, contraseña y nombre son requeridos',
      code: 'MISSING_FIELDS'
    });
  }

  const rolId = 6; // paciente

  try {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nombre,
        apellido,
        rol_id: rolId,
      },
    });

    if (authError) {
      return res.status(400).json({
        message: 'Error al registrar',
        error: authError.message,
        code: 'AUTH_ERROR'
      });
    }

    const { data: usuarioData, error: usuarioError } = await supabase
      .from('usuarios')
      .insert([
        {
          id: authData.user.id,
          correo: email,
          nombre: nombre,
          apellido: apellido || null,
          foto_perfil: foto_perfil || null,
          rol_id: rolId,
          activo: true,
          creado_en: new Date(),
          biografia: null,
        },
      ])
      .select('id, nombre, apellido, correo, activo, rol_id, foto_perfil, biografia, roles:rol_id(id, nombre)');

    if (usuarioError) {
      try {
        await supabase.auth.admin.deleteUser(authData.user.id);
      } catch (deleteError) {
        console.error('Error al eliminar usuario de Auth:', deleteError);
      }
      return res.status(400).json({
        message: 'Error al crear perfil',
        error: usuarioError.message,
        code: 'PROFILE_ERROR'
      });
    }

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      code: 'REGISTER_SUCCESS',
      user: {
        id: usuarioData[0].id,
        nombre: usuarioData[0].nombre,
        apellido: usuarioData[0].apellido,
        email: usuarioData[0].correo,
        foto_perfil: usuarioData[0].foto_perfil || null,
        rol_id: usuarioData[0].rol_id,
        rol: usuarioData[0].roles?.nombre || 'PACIENTE',
        activo: usuarioData[0].activo,
      },
    });
  } catch (err) {
    res.status(500).json({
      message: 'Error interno',
      error: err.message,
      code: 'SERVER_ERROR'
    });
  }
};

const mobileLogin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: 'Email y contraseña requeridos',
      code: 'MISSING_FIELDS'
    });
  }

  try {
    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Supabase login error:', error);
      const isEmailNotConfirmed = error.code === 'email_not_confirmed';
      return res.status(error.status || 401).json({
        message: isEmailNotConfirmed
          ? 'Email no confirmado. Registra nuevamente o confirma tu correo.'
          : 'Credenciales inválidas',
        code: isEmailNotConfirmed ? 'EMAIL_NOT_CONFIRMED' : 'INVALID_CREDENTIALS',
        error: error.message,
      });
    }

    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido, correo, activo, rol_id, foto_perfil, roles:rol_id(id, nombre)')
      .eq('correo', email)
      .single();

    if (usuarioError || !usuario) {
      return res.status(500).json({
        message: 'Error al obtener perfil',
        code: 'PROFILE_ERROR'
      });
    }

    if (!usuario.activo) {
      return res.status(401).json({
        message: 'Usuario inactivo',
        code: 'USER_INACTIVE'
      });
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        email: usuario.correo,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        rol_id: usuario.rol_id,
        rol: usuario.roles?.nombre || 'PACIENTE',
      },
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: '30d' }
    );

    res.json({
      message: 'Login exitoso',
      code: 'LOGIN_SUCCESS',
      user: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.correo,
        rol_id: usuario.rol_id,
        rol: usuario.roles?.nombre || 'PACIENTE',
        foto_perfil: usuario.foto_perfil || null,
        activo: usuario.activo,
      },
      token,
      refreshToken: data.session?.refresh_token,
    });
  } catch (err) {
    res.status(500).json({
      message: 'Error interno',
      error: err.message,
      code: 'SERVER_ERROR'
    });
  }
};

const getMobileDoctors = async (req, res) => {
  try {
    const { data: usuarios, error } = await supabase
      .from('usuarios')
      .select('id, nombre, correo, rol_id, activo, foto_perfil, biografia, roles:rol_id(id, nombre)')
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (error) {
      return res.status(500).json({
        message: 'Error al obtener odontólogos',
        code: 'DOCTORS_ERROR',
        error: error.message,
      });
    }

    const odontologos = (usuarios || [])
      .filter((usuario) => (usuario.roles?.nombre || '').toUpperCase() === 'ODONTOLOGO')
      .map((usuario) => ({
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.roles?.nombre || 'ODONTOLOGO',
        foto_perfil: usuario.foto_perfil,
        biografia: usuario.biografia || null,
        activo: usuario.activo,
      }));

    res.json({
      code: 'DOCTORS_SUCCESS',
      odontologos,
    });
  } catch (err) {
    res.status(500).json({
      message: 'Error interno',
      error: err.message,
      code: 'SERVER_ERROR',
    });
  }
};

const getMobileProfile = async (req, res) => {
  try {
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido, correo, activo, creado_en, foto_perfil, rol_id, biografia, roles:rol_id(id, nombre)')
      .eq('id', req.user.id)
      .single();

    if (error) {
      return res.status(500).json({
        message: 'Error al obtener perfil',
        code: 'PROFILE_ERROR'
      });
    }

    res.json({
      code: 'PROFILE_SUCCESS',
      profile: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.correo,
        rol_id: usuario.rol_id,
        rol: usuario.roles?.nombre || 'PACIENTE',
        activo: usuario.activo,
        creado_en: usuario.creado_en,
        foto_perfil: usuario.foto_perfil || null,
        biografia: usuario.biografia || null,
      }
    });
  } catch (err) {
    res.status(500).json({
      message: 'Error interno',
      error: err.message,
      code: 'SERVER_ERROR'
    });
  }
};

const normalizePaymentMethod = (paymentMethod) => {
  const method = String(paymentMethod || 'Yape').trim().toLowerCase();
  if (method === 'efectivo' || method === 'cash') return 'Efectivo';
  if (method === 'yape') return 'Yape';
  return String(paymentMethod || 'Yape');
};

const isUuid = (value) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const buildPatientReference = (patientId) => {
  if (!patientId) return {};
  if (isUuid(patientId)) {
    return { id_paciente_uuid: patientId };
  }

  const parsedId = Number(patientId);
  if (Number.isInteger(parsedId) && parsedId > 0) {
    return { id_paciente: parsedId };
  }

  return { id_paciente_uuid: patientId };
};

const updateMobileProfile = async (req, res) => {
  const { nombre, apellido, telefono, biografia } = req.body;

  try {
    const updateBody = {};
    if (nombre !== undefined) updateBody.nombre = nombre;
    if (apellido !== undefined) updateBody.apellido = apellido;
    if (biografia !== undefined) updateBody.biografia = biografia;

    const { data: updated, error } = await supabase
      .from('usuarios')
      .update(updateBody)
      .eq('id', req.user.id)
      .select('id, nombre, correo, foto_perfil, biografia');

    if (error) {
      return res.status(500).json({
        message: 'Error al actualizar perfil',
        code: 'UPDATE_ERROR'
      });
    }

    res.json({
      code: 'UPDATE_SUCCESS',
      message: 'Perfil actualizado',
      profile: updated[0],
    });
  } catch (err) {
    res.status(500).json({
      message: 'Error interno',
      error: err.message,
      code: 'SERVER_ERROR'
    });
  }
};

const getMobileDoctorById = async (req, res) => {
  const doctorId = req.params.id;
  try {
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido, correo, activo, creado_en, foto_perfil, rol_id, biografia, roles:rol_id(id, nombre)')
      .eq('id', doctorId)
      .single();

    if (error || !usuario) {
      return res.status(404).json({ message: 'Odontólogo no encontrado', code: 'DOCTOR_NOT_FOUND' });
    }

    const { data: reviewsData, error: reviewsError } = await supabase
      .from('resenas')
      .select('id, rating, comentario, creado_en, id_paciente, pacientes:id_paciente(id, nombre, apellido, foto_perfil)')
      .eq('id_odontologo', doctorId)
      .order('creado_en', { ascending: false });

    if (reviewsError) {
      return res.status(500).json({ message: 'Error al obtener reseñas', code: 'REVIEWS_ERROR' });
    }

    res.json({
      code: 'DOCTOR_PROFILE_SUCCESS',
      doctor: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.correo,
        rol_id: usuario.rol_id,
        rol: usuario.roles?.nombre || 'ODONTOLOGO',
        foto_perfil: usuario.foto_perfil || null,
        biografia: usuario.biografia || null,
        activo: usuario.activo,
        creado_en: usuario.creado_en,
        reseñas: reviewsData || [],
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

const createReview = async (req, res) => {
  const doctorId = req.params.id;
  const pacienteId = req.user.id;
  const { rating, comentario } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Rating inválido (1-5)', code: 'INVALID_RATING' });
  }

  try {
    const { data, error } = await supabase
      .from('resenas')
      .insert([
        {
          id_odontologo: doctorId,
          id_paciente: pacienteId,
          rating: Number(rating),
          comentario: comentario || null,
        }
      ])
      .select('id, id_odontologo, id_paciente, rating, comentario, creado_en');

    if (error) {
      return res.status(500).json({ message: 'Error al crear reseña', error: error.message, code: 'CREATE_REVIEW_ERROR' });
    }

    res.status(201).json({ code: 'CREATE_REVIEW_SUCCESS', review: data[0] });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

const getMyReviews = async (req, res) => {
  try {
    const doctorId = req.user.id;
    const { data: reviewsData, error: reviewsError } = await supabase
      .from('resenas')
      .select('id, rating, comentario, creado_en, id_paciente, pacientes:id_paciente(id, nombre, apellido, foto_perfil)')
      .eq('id_odontologo', doctorId)
      .order('creado_en', { ascending: false });

    if (reviewsError) {
      return res.status(500).json({ message: 'Error al obtener reseñas', code: 'REVIEWS_ERROR' });
    }

    res.json({ code: 'MY_REVIEWS_SUCCESS', reviews: reviewsData || [] });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

// Crear cita móvil junto con el pago inicial y QR para el método elegido
const createMobileAppointment = async (req, res) => {
  try {
    console.log('🔵 [createMobileAppointment] Iniciando creación de cita móvil');
    console.log('📝 [createMobileAppointment] Body recibido:', JSON.stringify(req.body, null, 2));
    console.log('👤 [createMobileAppointment] User autenticado:', req.user?.id ? `ID: ${req.user.id}` : 'NO AUTENTICADO');

    const {
      fecha,
      date,
      hora,
      time,
      fecha_hora,
      fechaHora,
      dateTime,
      datetime,
      id_odontologo,
      odontologo_id,
      doctor_id,
      doctorId,
      odontologoId,
      metodo_pago = 'Yape',
      payment_method,
      paymentMethod,
      monto,
      amount,
      servicio,
      service,
      descripcion,
      description,
      qr_imagen = null,
      qrImage = null,
    } = req.body;

    const finalDoctorId = id_odontologo ?? odontologo_id ?? doctor_id ?? doctorId ?? odontologoId ?? null;
    console.log('🏥 [createMobileAppointment] Doctor ID resuelto:', finalDoctorId);
    const finalAmount = monto ?? amount;
    const finalPaymentMethod = metodo_pago ?? payment_method ?? paymentMethod ?? 'Yape';
    const finalService = servicio ?? service;
    const finalDescription = descripcion ?? description;
    const finalQrImage = qr_imagen ?? qrImage;

    if (!req.user || !req.user.id) {
      console.error('❌ [createMobileAppointment] Usuario no autenticado');
      return res.status(401).json({ message: 'Usuario no autenticado', code: 'USER_NOT_AUTHENTICATED' });
    }

    if ((!fecha && !date && !hora && !time) && !fecha_hora && !fechaHora && !dateTime && !datetime) {
      console.error('❌ [createMobileAppointment] Falta fecha o hora');
      return res.status(400).json({ message: 'Fecha y hora son requeridos', code: 'MISSING_FIELDS' });
    }

    if (!finalDoctorId) {
      console.error('❌ [createMobileAppointment] Falta Doctor ID');
      return res.status(400).json({ message: 'Debe seleccionar un odontólogo', code: 'MISSING_DOCTOR' });
    }

    if (finalAmount === undefined || finalAmount === null || finalAmount === '') {
      console.error('❌ [createMobileAppointment] Falta monto');
      return res.status(400).json({ message: 'El monto del pago es requerido', code: 'MISSING_AMOUNT' });
    }

    const parsedAmount = Number(finalAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      console.error('❌ [createMobileAppointment] Monto inválido:', finalAmount);
      return res.status(400).json({ message: 'El monto del pago debe ser un número válido', code: 'INVALID_AMOUNT' });
    }

    let finalFecha = fecha ?? date;
    let finalHora = hora ?? time;
    const finalDateTime = fecha_hora ?? fechaHora ?? dateTime ?? datetime;

    if (finalDateTime && (!finalFecha || !finalHora)) {
      const dt = new Date(finalDateTime);
      if (Number.isNaN(dt.getTime())) {
        return res.status(400).json({ message: 'Fecha y hora válidas son requeridas', code: 'INVALID_DATETIME' });
      }
      finalFecha = dt.toISOString().split('T')[0];
      finalHora = dt.toTimeString().substring(0, 5);
    }

    if (!finalFecha || !finalHora) {
      return res.status(400).json({ message: 'Fecha y hora válidas son requeridas', code: 'INVALID_DATETIME' });
    }

    // Validar que el doctor exista y tenga rol ODONTOLOGO
    const { data: doctorUser, error: doctorError } = await supabase
      .from('usuarios')
      .select('id, rol_id, roles:rol_id(id, nombre)')
      .eq('id', finalDoctorId)
      .single();

    if (doctorError || !doctorUser) {
      return res.status(404).json({ message: 'Odontólogo no encontrado', code: 'DOCTOR_NOT_FOUND' });
    }
    const doctorRoleName = (doctorUser.roles?.nombre || '').toUpperCase();
    if (doctorRoleName !== 'ODONTOLOGO') {
      return res.status(400).json({ message: 'El usuario seleccionado no es odontólogo', code: 'INVALID_DOCTOR' });
    }

    const { data: existing, error: existingError } = await supabase
      .from('citas')
      .select('id')
      .eq('id_odontologo', finalDoctorId)
      .eq('fecha', finalFecha)
      .eq('hora', finalHora)
      .in('estado', ['pendiente', 'programada', 'confirmada', 'en_curso']);

    if (existingError) {
      return res.status(500).json({ message: 'Error verificando disponibilidad', error: existingError.message, code: 'SLOT_CHECK_ERROR' });
    }

    if (existing && existing.length > 0) {
      const nextDay = new Date(finalFecha);
      nextDay.setDate(nextDay.getDate() + 1);
      const suggestedFecha = nextDay.toISOString().split('T')[0];

      return res.status(409).json({
        message: 'El horario seleccionado ya está ocupado. Elige otro horario o un odontólogo diferente.',
        code: 'SLOT_UNAVAILABLE',
        suggestion: {
          fecha: suggestedFecha,
          hora: finalHora,
          nota: 'Horario sugerido para el mismo doctor al día siguiente',
        },
      });
    }

    const normalizedMetodoPago = normalizePaymentMethod(finalPaymentMethod);
    const paymentState = normalizedMetodoPago.toLowerCase() === 'efectivo' ? 'por_pagar' : 'pendiente';

    // Nota: para evitar race conditions en alta concurrencia, considera:
    // - crear UNIQUE INDEX en (id_odontologo, fecha, hora) con condición sobre estados válidos
    // - o mover la comprobación+insert a una función RPC/transaction en la DB.

    const patientReference = buildPatientReference(req.user.id);

    // Si usamos UUID para paciente, asegurar que exista el usuario en `usuarios` (no asumir columna en `pacientes`)
    if (patientReference && patientReference.id_paciente_uuid) {
      try {
        const uuid = patientReference.id_paciente_uuid;

        // Verificar que el usuario exista en la tabla `usuarios`
        const { data: usuarioExistente, error: usuarioExistenteError } = await supabase
          .from('usuarios')
          .select('id')
          .eq('id', uuid)
          .maybeSingle();

        if (usuarioExistenteError) {
          console.warn('[createMobileAppointment] Error buscando usuario en tabla `usuarios`:', usuarioExistenteError.message);
        }

        if (!usuarioExistente) {
          // No existe el usuario auth; no podemos crear la cita con este UUID
          console.error('[createMobileAppointment] Usuario (auth) no encontrado para id_paciente_uuid:', uuid);
          return res.status(400).json({ message: 'Usuario paciente no encontrado', error: 'USER_NOT_FOUND', code: 'PATIENT_CREATE_ERROR' });
        }

        // Nota: no creamos filas en `pacientes` automáticamente aquí porque su esquema local
        // puede no tener la columna `id_paciente_uuid`. El FK de `id_paciente_uuid` en
        // `citas` debe apuntar a `usuarios(id)` — si tu esquema es distinto, adapta la migración.
      } catch (e) {
        console.error('[createMobileAppointment] Error verificando usuario paciente:', e?.message || e);
        return res.status(500).json({ message: 'Error interno', error: e?.message || e, code: 'SERVER_ERROR' });
      }
    }

    const { data: appointment, error: appointmentError } = await supabase
      .from('citas')
      .insert([
        {
          fecha: finalFecha,
          hora: finalHora,
          ...patientReference,
          id_odontologo: finalDoctorId,
          estado: 'pendiente',
        },
      ])
      .select('*')
      .single();

    if (appointmentError) {
      console.error('❌ [createMobileAppointment] Error al insertar cita:', appointmentError);
      return res.status(500).json({
        message: 'Error al crear cita',
        error: appointmentError.message,
        code: 'APPOINTMENT_CREATE_ERROR',
        details: process.env.NODE_ENV === 'development' ? appointmentError : undefined,
      });
    }

    // Construir payload de pago con solo campos que seguro existen
    const paymentPayload = {
      ...patientReference,
      id_cita: appointment.id,
      monto: parsedAmount,
      metodo_pago: normalizedMetodoPago,
      estado: paymentState,
      fecha: finalFecha,
      // fecha_pago se omite si la columna no existe; la migración lo añade
    };

    const { data: payment, error: paymentError } = await supabase
      .from('pagos')
      .insert([paymentPayload])
      .select('*')
      .single();

    if (paymentError) {
      console.error('❌ [createMobileAppointment] Error al insertar pago:', paymentError);
      const cancellationNote = paymentError?.message || 'Error al crear pago';
      await supabase
        .from('citas')
        .update({ estado: 'cancelada', nota_cancelacion: cancellationNote })
        .eq('id', appointment.id);
      return res.status(500).json({
        message: 'Error al crear pago; la cita se marcó como cancelada',
        error: paymentError.message,
        code: 'PAYMENT_CREATE_ERROR'
      });
    }

    try {
      console.log('\n🔔 [createMobileAppointment] Enviando notificaciones de nueva cita...');
      const cajerNotified = await notifyUsersByRole('CAJERO', 'new_mobile_appointment', { appointment, payment });
      const recepNotified = await notifyUsersByRole('RECEPCIONISTA', 'new_mobile_appointment', { appointment, payment });
      
      if (cajerNotified || recepNotified) {
        console.log('✅ [createMobileAppointment] Al menos una notificación fue enviada correctamente');
      } else {
        console.warn('⚠️ [createMobileAppointment] NINGUNA notificación fue enviada (roles no encontrados o sin usuarios)');
      }
    } catch (e) {
      console.error('❌ [createMobileAppointment] Error notificando roles:', e?.message || e);
    }

    res.status(201).json({
      code: 'MOBILE_APPOINTMENT_CREATED',
      appointment,
      payment,
    });
  } catch (err) {
    console.error('❌ [createMobileAppointment] ERROR CRÍTICO:', err);
    console.error('❌ [createMobileAppointment] Stack:', err.stack);
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

const getMyClinicalHistory = async (req, res) => {
  try {
    const { data: history, error } = await supabase
      .from('historial_clinico')
      .select('id, fecha, tipo, descripcion, diagnostico, tratamiento, medicamentos, notas, archivos, odontologo_id, odontologo:odontologo_id(id, nombre, apellido, foto_perfil)')
      .eq('paciente_id', req.user.id)
      .order('fecha', { ascending: false });

    if (error) {
      return res.status(500).json({ message: 'Error al obtener historial clínico', error: error.message, code: 'HISTORY_FETCH_ERROR' });
    }

    res.json({ code: 'MOBILE_CLINICAL_HISTORY_SUCCESS', history: history || [] });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

const getMobileAppointmentPayment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { data, error } = await supabase
      .from('pagos')
      .select('*')
      .eq('id_cita', appointmentId)
      .single();

    if (error) {
      return res.status(500).json({ message: 'Error al obtener el pago de la cita', error: error.message, code: 'PAYMENT_FETCH_ERROR' });
    }

    if (!data) {
      return res.status(404).json({ message: 'Pago de cita no encontrado', code: 'PAYMENT_NOT_FOUND' });
    }

    res.json({ code: 'MOBILE_APPOINTMENT_PAYMENT_SUCCESS', payment: data });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

const uploadMobilePaymentProof = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No se proporcionó archivo', code: 'NO_FILE' });
    }

    const { paymentId } = req.params;
    let payment = null;
    let paymentError = null;
    let paymentByAppointment = null;

    const paymentById = await supabase
      .from('pagos')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (!paymentById.error && paymentById.data) {
      payment = paymentById.data;
    } else {
      paymentByAppointment = await supabase
        .from('pagos')
        .select('*')
        .eq('id_cita', paymentId)
        .single();

      if (!paymentByAppointment.error && paymentByAppointment.data) {
        payment = paymentByAppointment.data;
      } else {
        paymentError = paymentById.error || paymentByAppointment.error;
      }
    }

    if (paymentError || !payment) {
      console.error('Pago no encontrado para comprobante:', paymentError || paymentById.error || paymentByAppointment?.error);
      return res.status(404).json({ message: 'Pago no encontrado', code: 'PAYMENT_NOT_FOUND' });
    }

    const isOwner = (payment.id_paciente && String(payment.id_paciente) === String(req.user.id)) || (payment.id_paciente_uuid && String(payment.id_paciente_uuid) === String(req.user.id));
    if (!isOwner) {
      return res.status(403).json({ message: 'No autorizado para subir este comprobante', code: 'FORBIDDEN' });
    }

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimes.includes(req.file.mimetype)) {
      return res.status(400).json({ message: 'Solo se permiten imágenes JPEG, PNG, WebP o GIF', code: 'INVALID_FILE_TYPE' });
    }

    if (req.file.size > 10 * 1024 * 1024) {
      return res.status(400).json({ message: 'El comprobante no puede exceder 10MB', code: 'FILE_TOO_LARGE' });
    }

    const fileExt = req.file.originalname.split('.').pop();
    const fileName = `pago_${payment.id}_${Date.now()}.${fileExt}`;
    const filePath = `payment-proofs/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('payment-proofs')
      .upload(filePath, req.file.buffer, {
        cacheControl: '3600',
        upsert: true,
        contentType: req.file.mimetype,
      });

    if (uploadError) {
      return res.status(500).json({ message: 'Error al subir comprobante', error: uploadError.message, code: 'UPLOAD_ERROR' });
    }

    const { data: publicUrlData, error: publicUrlError } = await supabase.storage
      .from('payment-proofs')
      .getPublicUrl(filePath);

    let comprobanteUrl = null;
    if (!publicUrlError && publicUrlData) {
      comprobanteUrl = publicUrlData.publicUrl || publicUrlData.publicURL || null;
    }
    // Fallback: build public URL if SUPABASE_URL present
    if (!comprobanteUrl && process.env.SUPABASE_URL) {
      const base = process.env.SUPABASE_URL.replace(/\/$/, '');
      comprobanteUrl = `${base}/storage/v1/object/public/payment-proofs/${encodeURIComponent(filePath)}`;
    }

    const { data: updatedPayment, error: updateError } = await supabase
      .from('pagos')
      .update({
        comprobante: comprobanteUrl,
        estado_validacion: 'POR_CONFIRMAR',
        estado: 'pendiente',
      })
      .eq('id', payment.id)
      .select('*')
      .single();

    if (updateError) {
      return res.status(500).json({ message: 'Error al actualizar el pago', error: updateError.message, code: 'PAYMENT_UPDATE_ERROR' });
    }

    try {
      console.log('\n🔔 [uploadMobilePaymentProof] Enviando notificaciones de nuevo comprobante...');
      await notifyUsersByRole('CAJERO', 'payment_proof_uploaded', { payment: updatedPayment });
      await notifyUsersByRole('RECEPCIONISTA', 'payment_proof_uploaded', { payment: updatedPayment });
      console.log('✅ [uploadMobilePaymentProof] Notificaciones de CAJERO/RECEPCIONISTA enviadas');

      const io = getIO();
      io.to(`user_${req.user.id}`).emit('payment_proof_received', { payment: updatedPayment });
      console.log('✅ [uploadMobilePaymentProof] Notificación al paciente enviada');
    } catch (e) {
      console.error('❌ [uploadMobilePaymentProof] Error notificando:', e?.message || e);
    }

    res.json({ code: 'PAYMENT_PROOF_UPLOADED', payment: updatedPayment });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

const uploadMobileProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'No se proporcionó archivo',
        code: 'NO_FILE'
      });
    }

    const file = req.file;
    const userId = req.user.id;

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimes.includes(file.mimetype)) {
      return res.status(400).json({
        message: 'Solo se permiten archivos de imagen (JPEG, PNG, WebP, GIF)',
        code: 'INVALID_FILE_TYPE'
      });
    }

    if (file.size > 5 * 1024 * 1024) {
      return res.status(400).json({
        message: 'La imagen no puede exceder 5MB',
        code: 'FILE_TOO_LARGE'
      });
    }

    const fileExt = file.originalname.split('.').pop();
    const fileName = `${userId}_${Date.now()}.${fileExt}`;
    const filePath = `profiles/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('profile-photos')
      .upload(filePath, file.buffer, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.mimetype,
      });

    if (uploadError) {
      console.error('❌ Error subiendo foto:', uploadError);
      return res.status(500).json({
        message: 'Error al subir imagen',
        code: 'UPLOAD_ERROR',
        error: uploadError.message
      });
    }

    const { data: publicUrlData } = await supabase.storage
      .from('profile-photos')
      .getPublicUrl(filePath);
    const publicUrl = publicUrlData?.publicUrl || publicUrlData?.publicURL || (process.env.SUPABASE_URL ? `${process.env.SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/profile-photos/${encodeURIComponent(filePath)}` : null);

    if (!publicUrl) {
      console.error('❌ Error obteniendo URL pública');
      return res.status(500).json({
        message: 'Error al obtener URL de la imagen',
        code: 'URL_ERROR'
      });
    }

    const { error: updateError } = await supabase
      .from('usuarios')
      .update({ foto_perfil: publicUrl })
      .eq('id', userId);

    if (updateError) {
      console.error('❌ Error actualizando usuario:', updateError);
      return res.status(500).json({
        message: 'Error al actualizar perfil',
        code: 'UPDATE_ERROR',
        error: updateError.message
      });
    }

    res.json({
      message: 'Foto de perfil actualizada exitosamente',
      code: 'PHOTO_UPDATED',
      foto_perfil: publicUrl,
    });
  } catch (err) {
    console.error('❌ Error en uploadMobileProfilePhoto:', err);
    res.status(500).json({
      message: 'Error interno',
      error: err.message,
      code: 'SERVER_ERROR'
    });
  }
};

const getMobileDiscounts = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('descuentos')
      .select('*')
      .eq('estado', 'aprobado')
      .eq('activo', true)
      .eq('visible', true)
      .lte('fecha_inicio', today)
      .gte('fecha_fin', today)
      .order('fecha_inicio', { ascending: true });

    if (error) {
      return res.status(500).json({ message: 'Error al obtener descuentos móviles', error: error.message, code: 'MOBILE_DISCOUNTS_ERROR' });
    }

    const discounts = Array.isArray(data)
      ? data.map((discount) => ({
          id: discount.id,
          nombre: discount.nombre,
          descripcion: discount.descripcion,
          tipo: discount.tipo,
          valor: Number(discount.valor) || 0,
          fecha_inicio: discount.fecha_inicio,
          fecha_fin: discount.fecha_fin,
          aplica_a: discount.aplica_a,
          estado: discount.estado,
          activo: discount.activo,
          visible: discount.visible,
        }))
      : [];

    res.json({ code: 'MOBILE_DISCOUNTS_SUCCESS', discounts });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// DOCTOR/ODONTOLOGO ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

const getMyMobileAppointments = async (req, res) => {
  try {
    const doctorId = req.user.id;

    const { data, error } = await supabase
      .from('citas')
      .select(
        'id, fecha, hora, estado, id_paciente, id_paciente_uuid, monto, metodo_pago, ' +
        'pacientes:id_paciente(id, nombre, apellido, telefono), ' +
        'pacientes_uuid:id_paciente_uuid(id, nombre, apellido, correo, foto_perfil), ' +
        'pagos:id_cita(id, monto, estado, estado_validacion, comprobante)'
      )
      .eq('id_odontologo', doctorId)
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true });

    if (error) {
      return res.status(500).json({
        message: 'Error al obtener citas del doctor',
        error: error.message,
        code: 'DOCTOR_APPOINTMENTS_ERROR'
      });
    }

    res.json({
      code: 'DOCTOR_APPOINTMENTS_SUCCESS',
      appointments: data || []
    });
  } catch (err) {
    res.status(500).json({
      message: 'Error interno',
      error: err.message,
      code: 'SERVER_ERROR'
    });
  }
};

// Citas del PACIENTE autenticado (para la app móvil del cliente)
const getMyPatientAppointments = async (req, res) => {
  try {
    const patientId = req.user.id;

    // Intentar con join de odontologo
    let { data, error } = await supabase
      .from('citas')
      .select('*, odontologo:id_odontologo(id, nombre, apellido, foto_perfil)')
      .eq('id_paciente_uuid', patientId)
      .order('fecha', { ascending: false })
      .order('hora', { ascending: false });

    // Fallback sin join si Supabase no tiene el FK configurado en schema cache
    if (error) {
      const fallback = await supabase
        .from('citas')
        .select('*')
        .eq('id_paciente_uuid', patientId)
        .order('fecha', { ascending: false })
        .order('hora', { ascending: false });
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      return res.status(500).json({
        message: 'Error al obtener citas del paciente',
        error: error.message,
        code: 'PATIENT_APPOINTMENTS_ERROR'
      });
    }

    res.json({
      code: 'PATIENT_APPOINTMENTS_SUCCESS',
      appointments: data || []
    });
  } catch (err) {
    res.status(500).json({
      message: 'Error interno',
      error: err.message,
      code: 'SERVER_ERROR'
    });
  }
};

const confirmMobileAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { estado } = req.body;
    const doctorId = req.user.id;

    if (!estado) {
      return res.status(400).json({
        message: 'Estado de cita es requerido',
        code: 'MISSING_FIELDS'
      });
    }

    const validStates = ['confirmada', 'en_curso', 'completada', 'cancelada'];
    if (!validStates.includes(estado)) {
      return res.status(400).json({
        message: `Estado inválido. Valores válidos: ${validStates.join(', ')}`,
        code: 'INVALID_STATE'
      });
    }

    // Verificar que la cita pertenece al doctor
    const { data: appointment, error: appointmentError } = await supabase
      .from('citas')
      .select('id, id_odontologo, id_paciente, id_paciente_uuid, fecha, hora, estado')
      .eq('id', appointmentId)
      .single();

    if (appointmentError || !appointment) {
      return res.status(404).json({
        message: 'Cita no encontrada',
        code: 'APPOINTMENT_NOT_FOUND'
      });
    }

    if (appointment.id_odontologo !== doctorId) {
      return res.status(403).json({
        message: 'No autorizado para modificar esta cita',
        code: 'FORBIDDEN'
      });
    }

    // Actualizar estado de la cita
    const { data: updatedAppointment, error: updateError } = await supabase
      .from('citas')
      .update({ estado })
      .eq('id', appointmentId)
      .select('*')
      .single();

    if (updateError) {
      return res.status(500).json({
        message: 'Error al actualizar cita',
        error: updateError.message,
        code: 'UPDATE_ERROR'
      });
    }

    // Obtener datos del paciente para notificación
    const patientId = appointment.id_paciente_uuid || appointment.id_paciente;
    
    // Emitir notificación Socket.IO al PACIENTE
    try {
      const io = getIO();
      io.to(`user_${patientId}`).emit('appointment_status_changed', {
        appointmentId: updatedAppointment.id,
        status: estado,
        doctor: req.user.nombre,
        fecha: updatedAppointment.fecha,
        hora: updatedAppointment.hora,
        message: `Tu cita ha sido ${estado === 'confirmada' ? 'confirmada' : estado === 'completada' ? 'completada' : estado}`,
        timestamp: new Date().toISOString(),
      });

      console.log(`✅ [confirmMobileAppointment] Notificación enviada al paciente ${patientId}: estado = ${estado}`);
    } catch (notifyError) {
      console.error('⚠️ [confirmMobileAppointment] Error enviando notificación:', notifyError?.message);
    }

    res.json({
      code: 'APPOINTMENT_CONFIRMED',
      appointment: updatedAppointment,
      notification_sent: true
    });
  } catch (err) {
    res.status(500).json({
      message: 'Error interno',
      error: err.message,
      code: 'SERVER_ERROR'
    });
  }
};

// 🔧 DIAGNOSTICS ENDPOINT - Verificar estado de roles y notificaciones
const diagnosticRoles = async (req, res) => {
  try {
    console.log('\n🔧 [diagnosticRoles] Iniciando diagnóstico de roles...');
    
    // Listar todos los roles
    const { data: allRoles, error: rolesError } = await supabase
      .from('roles')
      .select('id, nombre')
      .order('nombre');

    if (rolesError) {
      return res.status(500).json({
        error: rolesError.message,
        code: 'ROLES_FETCH_ERROR'
      });
    }

    console.log('📋 Roles en BD:', allRoles);

    // Buscar específicamente CAJERO y RECEPCIONISTA
    const cajerRole = allRoles?.find(r => r.nombre.toUpperCase() === 'CAJERO');
    const recepRole = allRoles?.find(r => r.nombre.toUpperCase() === 'RECEPCIONISTA');

    console.log('🔍 Rol CAJERO:', cajerRole || 'NO ENCONTRADO');
    console.log('🔍 Rol RECEPCIONISTA:', recepRole || 'NO ENCONTRADO');

    // Listar usuarios por rol
    const diagnostics = {
      roles_en_bd: allRoles,
      roles_buscados: {
        cajero: cajerRole || null,
        recepcionista: recepRole || null,
      },
      usuarios_por_rol: {}
    };

    for (const role of allRoles) {
      const { data: usuarios, error: usuariosError } = await supabase
        .from('usuarios')
        .select('id, nombre, correo, activo')
        .eq('rol_id', role.id)
        .order('nombre');

      if (!usuariosError) {
        diagnostics.usuarios_por_rol[role.nombre] = {
          total: usuarios?.length || 0,
          activos: usuarios?.filter(u => u.activo)?.length || 0,
          usuarios: usuarios || []
        };
      }
    }

    res.json({
      code: 'DIAGNOSTIC_SUCCESS',
      timestamp: new Date().toISOString(),
      diagnostics
    });
  } catch (err) {
    res.status(500).json({
      message: 'Error en diagnóstico',
      error: err.message,
      code: 'DIAGNOSTIC_ERROR'
    });
  }
};

// 🔧 TEST NOTIFICATION ENDPOINT - Enviar notificación de prueba
const testNotification = async (req, res) => {
  try {
    const { roleName, event = 'test_event' } = req.body;

    if (!roleName) {
      return res.status(400).json({
        message: 'roleName es requerido',
        code: 'MISSING_FIELDS'
      });
    }

    console.log(`\n🧪 [testNotification] Probando notificación para rol: "${roleName}"`);

    const testPayload = {
      test: true,
      message: `Notificación de prueba para ${roleName}`,
      timestamp: new Date().toISOString(),
    };

    const success = await notifyUsersByRole(roleName, event, testPayload);

    res.json({
      code: 'TEST_NOTIFICATION_SENT',
      roleName,
      event,
      success,
      payload: testPayload,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({
      message: 'Error enviando notificación de prueba',
      error: err.message,
      code: 'TEST_ERROR'
    });
  }
};

// ─────────────────────────────────────────────────────────────────
// CHAT CONTACTS — devuelve los contactos que el paciente puede ver
// Doctor asignado (de sus citas) + todo el personal (admin, cajero, recepcionista)
// ─────────────────────────────────────────────────────────────────
const getMobileChatContacts = async (req, res) => {
  try {
    const pacienteId = req.user.id;

    // Obtener roles relevantes
    const { data: roles } = await supabase
      .from('roles')
      .select('id, nombre')
      .in('nombre', ['ADMINISTRADOR', 'RECEPCIONISTA', 'CAJERO', 'ODONTOLOGO']);

    const roleMap = {};
    (roles || []).forEach(r => { roleMap[r.nombre.toUpperCase()] = r.id; });

    // 1. Doctor asignado: el odontólogo de la cita más reciente del paciente
    let assignedDoctorId = null;
    const { data: lastCita } = await supabase
      .from('citas')
      .select('id_odontologo')
      .eq('id_paciente_uuid', pacienteId)
      .not('id_odontologo', 'is', null)
      .order('fecha', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastCita?.id_odontologo) assignedDoctorId = lastCita.id_odontologo;

    // 2. Traer usuarios por roles
    const rolesToFetch = ['ADMINISTRADOR', 'RECEPCIONISTA', 'CAJERO'];
    const roleIds = rolesToFetch.map(r => roleMap[r]).filter(Boolean);

    const { data: staffUsers, error: staffError } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido, foto_perfil, rol_id, online, last_seen, roles:rol_id(nombre)')
      .in('rol_id', roleIds)
      .eq('activo', true);

    if (staffError) {
      console.error('[getMobileChatContacts] Error al obtener staff:', staffError.message);
    }

    // 3. Si hay doctor asignado, traerlo también (solo ese, no todos los odontólogos)
    let doctorUser = null;
    if (assignedDoctorId) {
      const { data: doc, error: doctorError } = await supabase
        .from('usuarios')
        .select('id, nombre, apellido, foto_perfil, rol_id, online, last_seen, roles:rol_id(nombre)')
        .eq('id', assignedDoctorId)
        .maybeSingle();
      if (doctorError) {
        console.error('[getMobileChatContacts] Error al obtener doctor asignado:', doctorError.message);
      }
      if (doc) doctorUser = doc;
    }

    // Combinar y deduplicar por id
    const all = [...(staffUsers || [])];
    if (doctorUser && !all.find(u => u.id === doctorUser.id)) all.unshift(doctorUser);

    const contacts = all.map(u => ({
      id: u.id,
      nombre: [u.nombre, u.apellido].filter(Boolean).join(' '),
      foto_perfil: u.foto_perfil ?? null,
      rol: u.roles?.nombre ?? 'STAFF',
      online: u.online ?? false,
      last_seen: u.last_seen ?? null,
      is_assigned_doctor: u.id === assignedDoctorId,
    }));

    res.json({ code: 'CHAT_CONTACTS_SUCCESS', contacts });
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener contactos', error: err.message, code: 'SERVER_ERROR' });
  }
};

// ─────────────────────────────────────────────────────────────────
// HISTORIAL CLÍNICO DEL PACIENTE
// ─────────────────────────────────────────────────────────────────
const getMyClinicalHistory = async (req, res) => {
  try {
    const patientId = req.user.id;

    const { data: citas, error } = await supabase
      .from('citas')
      .select('id, fecha, hora, estado, servicio, notas, id_odontologo, metodo_pago')
      .or(`id_paciente_uuid.eq.${patientId},id_paciente.eq.${patientId}`)
      .order('fecha', { ascending: false });

    if (error) {
      return res.status(500).json({ message: 'Error al obtener historial', error: error.message, code: 'DB_ERROR' });
    }

    const items = citas || [];

    // Enriquecer con nombre del doctor
    const doctorIds = [...new Set(items.map(c => c.id_odontologo).filter(Boolean))];
    let doctorMap = {};
    if (doctorIds.length > 0) {
      const { data: docs } = await supabase
        .from('usuarios')
        .select('id, nombre, apellido, foto_perfil')
        .in('id', doctorIds);
      (docs || []).forEach(d => { doctorMap[d.id] = d; });
    }

    const history = items.map(c => ({
      ...c,
      doctor: doctorMap[c.id_odontologo] ?? null,
      nombre_doctor: doctorMap[c.id_odontologo]
        ? `${doctorMap[c.id_odontologo].nombre || ''} ${doctorMap[c.id_odontologo].apellido || ''}`.trim()
        : null,
    }));

    res.json({ code: 'CLINICAL_HISTORY_SUCCESS', history });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

// ─────────────────────────────────────────────────────────────────
// DISPONIBILIDAD — devuelve slots de 30 min (09:00-21:00) para un
// doctor en una fecha dada, marcando los ya ocupados.
// ─────────────────────────────────────────────────────────────────
const getMobileAvailability = async (req, res) => {
  try {
    const { id_odontologo, fecha } = req.query;
    if (!id_odontologo || !fecha) {
      return res.status(400).json({ message: 'id_odontologo y fecha son requeridos', code: 'MISSING_PARAMS' });
    }

    const { data: booked, error } = await supabase
      .from('citas')
      .select('hora')
      .eq('id_odontologo', id_odontologo)
      .eq('fecha', fecha)
      .not('estado', 'in', '("cancelada","completada")');

    if (error) {
      return res.status(500).json({ message: 'Error al consultar citas', error: error.message, code: 'DB_ERROR' });
    }

    const bookedHoras = new Set((booked || []).map(c => c.hora?.substring(0, 5)));

    const slots = [];
    for (let h = 9; h < 21; h++) {
      for (const m of [0, 30]) {
        const hora = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const turno = h < 12 ? 'mañana' : h < 18 ? 'tarde' : 'noche';
        slots.push({ hora, disponible: !bookedHoras.has(hora), turno });
      }
    }

    res.json({ code: 'AVAILABILITY_SUCCESS', slots });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

// ─────────────────────────────────────────────────────────────────
// CANCELAR CITA (paciente)
// ─────────────────────────────────────────────────────────────────
const cancelMobileAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { reason } = req.body;
    const patientId = req.user.id;

    const { data: appointment, error: fetchError } = await supabase
      .from('citas')
      .select('id, id_paciente, id_paciente_uuid, estado')
      .eq('id', appointmentId)
      .single();

    if (fetchError || !appointment) {
      return res.status(404).json({ message: 'Cita no encontrada', code: 'APPOINTMENT_NOT_FOUND' });
    }

    const isOwner =
      String(appointment.id_paciente) === String(patientId) ||
      String(appointment.id_paciente_uuid) === String(patientId);
    if (!isOwner) {
      return res.status(403).json({ message: 'No autorizado para cancelar esta cita', code: 'FORBIDDEN' });
    }

    if (['cancelada', 'completada'].includes(appointment.estado)) {
      return res.status(400).json({ message: `La cita ya está ${appointment.estado}`, code: 'INVALID_STATE' });
    }

    const { data: updated, error: updateError } = await supabase
      .from('citas')
      .update({ estado: 'cancelada', nota_cancelacion: reason || 'Cancelada por el paciente' })
      .eq('id', appointmentId)
      .select('*')
      .single();

    if (updateError) {
      return res.status(500).json({ message: 'Error al cancelar la cita', error: updateError.message, code: 'UPDATE_ERROR' });
    }

    try {
      await notifyUsersByRole('CAJERO', 'appointment_cancelled', { appointment: updated });
      await notifyUsersByRole('RECEPCIONISTA', 'appointment_cancelled', { appointment: updated });
    } catch (e) {
      console.error('⚠️ [cancelMobileAppointment] Error notificando:', e?.message);
    }

    res.json({ code: 'APPOINTMENT_CANCELLED', appointment: updated });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

// ─────────────────────────────────────────────────────────────────
// REAGENDAR CITA (paciente)
// ─────────────────────────────────────────────────────────────────
const rescheduleMobileAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { fecha, hora, metodo_pago, payment_method } = req.body;
    const patientId = req.user.id;
    const finalMetodoPago = metodo_pago ?? payment_method;

    if (!fecha || !hora) {
      return res.status(400).json({ message: 'fecha y hora son requeridos', code: 'MISSING_FIELDS' });
    }

    const { data: appointment, error: fetchError } = await supabase
      .from('citas')
      .select('id, id_paciente, id_paciente_uuid, id_odontologo, estado')
      .eq('id', appointmentId)
      .single();

    if (fetchError || !appointment) {
      return res.status(404).json({ message: 'Cita no encontrada', code: 'APPOINTMENT_NOT_FOUND' });
    }

    const isOwner =
      String(appointment.id_paciente) === String(patientId) ||
      String(appointment.id_paciente_uuid) === String(patientId);
    if (!isOwner) {
      return res.status(403).json({ message: 'No autorizado para reagendar esta cita', code: 'FORBIDDEN' });
    }

    if (['cancelada', 'completada', 'en_curso'].includes(appointment.estado)) {
      return res.status(400).json({
        message: `La cita está en estado "${appointment.estado}" y no se puede reagendar`,
        code: 'INVALID_STATE',
      });
    }

    // Verificar disponibilidad del slot (excluyendo esta misma cita)
    const { data: conflict } = await supabase
      .from('citas')
      .select('id')
      .eq('id_odontologo', appointment.id_odontologo)
      .eq('fecha', fecha)
      .eq('hora', hora)
      .not('id', 'eq', appointmentId)
      .not('estado', 'in', '("cancelada","completada")')
      .maybeSingle();

    if (conflict) {
      return res.status(409).json({ message: 'El nuevo horario ya está ocupado para este odontólogo', code: 'SLOT_UNAVAILABLE' });
    }

    const updateData = { fecha, hora };
    if (finalMetodoPago) updateData.metodo_pago = finalMetodoPago;

    const { data: updatedAppointment, error: updateError } = await supabase
      .from('citas')
      .update(updateData)
      .eq('id', appointmentId)
      .select('*')
      .single();

    if (updateError) {
      return res.status(500).json({ message: 'Error al reagendar la cita', error: updateError.message, code: 'UPDATE_ERROR' });
    }

    try {
      await notifyUsersByRole('CAJERO', 'appointment_rescheduled', { appointment: updatedAppointment });
      await notifyUsersByRole('RECEPCIONISTA', 'appointment_rescheduled', { appointment: updatedAppointment });
    } catch (e) {
      console.error('⚠️ [rescheduleMobileAppointment] Error notificando:', e?.message);
    }

    res.json({ code: 'APPOINTMENT_RESCHEDULED', appointment: updatedAppointment });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

module.exports = {
  mobileRegister,
  mobileLogin,
  getMobileDoctors,
  getMobileProfile,
  updateMobileProfile,
  getMobileDoctorById,
  createReview,
  getMyReviews,
  createMobileAppointment,
  getMobileAppointmentPayment,
  uploadMobilePaymentProof,
  uploadMobileProfilePhoto,
  getMyClinicalHistory,
  getMobileDiscounts,
  getMyMobileAppointments,
  getMyPatientAppointments,
  getMyClinicalHistory,
  confirmMobileAppointment,
  getMobileAvailability,
  cancelMobileAppointment,
  rescheduleMobileAppointment,
  getMobileChatContacts,
  diagnosticRoles,
  testNotification,
};
