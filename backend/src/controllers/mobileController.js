const supabase = require('../config/supabase');
const supabaseAuth = require('../config/supabaseAuth');
const jwt = require('jsonwebtoken');
const { getIO } = require('../socket/chatSocket');

// Registro para clientes móviles (siempre paciente, rol_id = 6)
const mobileRegister = async (req, res) => {
  const { email, password, nombre, apellido, foto_perfil } = req.body;

  // Validar campos requeridos
  if (!email || !password || !nombre) {
    return res.status(400).json({ 
      message: 'Email, contraseña y nombre son requeridos',
      code: 'MISSING_FIELDS'
    });
  }

  // Para registro móvil siempre usar rol paciente (rol_id = 6)
  const rolId = 6;

  try {
    // Registrar en Supabase Auth usando clave de servicio para crear usuario confirmado
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

    // Crear registro en tabla usuarios con rol_id
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
      // Si falla, intentamos eliminar el usuario de Auth
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

// Login para clientes móviles
const mobileLogin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ 
      message: 'Email y contraseña requeridos',
      code: 'MISSING_FIELDS'
    });
  }

  try {
    // Autenticar con Supabase Auth usando cliente anónimo separado
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

    // Obtener datos del usuario incluyendo rol_id
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

    // Verificar si está activo
    if (!usuario.activo) {
      return res.status(401).json({ 
        message: 'Usuario inactivo',
        code: 'USER_INACTIVE'
      });
    }

    // Generar JWT con el rol del usuario
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
      { expiresIn: '30d' } // 30 días para móvil
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

// Obtener odontólogos activos para la app móvil
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

// Actualizar perfil del cliente
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

// Obtener perfil público de un odontólogo por id (incluye reseñas)
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

    // Obtener reseñas del odontólogo
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

// Crear reseña para un odontólogo (pacientes desde app móvil)
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

// Obtener reseñas del odontólogo autenticado
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
    const {
      fecha,
      hora,
      fecha_hora,
      id_odontologo,
      metodo_pago = 'Yape',
      monto,
      servicio,
      descripcion,
    } = req.body;

    if ((!fecha || !hora) && !fecha_hora) {
      return res.status(400).json({ message: 'Fecha y hora son requeridos', code: 'MISSING_FIELDS' });
    }

    if (!id_odontologo) {
      return res.status(400).json({ message: 'Debe seleccionar un odontólogo', code: 'MISSING_DOCTOR' });
    }

    if (!monto) {
      return res.status(400).json({ message: 'El monto del pago es requerido', code: 'MISSING_AMOUNT' });
    }

    let finalFecha = fecha;
    let finalHora = hora;

    if (fecha_hora && (!fecha || !hora)) {
      const dt = new Date(fecha_hora);
      finalFecha = dt.toISOString().split('T')[0];
      finalHora = dt.toTimeString().substring(0, 5);
    }

    if (!finalFecha || !finalHora) {
      return res.status(400).json({ message: 'Fecha y hora válidas son requeridas', code: 'INVALID_DATETIME' });
    }

    const { data: appointment, error: appointmentError } = await supabase
      .from('citas')
      .insert([
        {
          fecha: finalFecha,
          hora: finalHora,
          id_paciente: req.user.id,
          id_odontologo,
          estado: 'programada',
        },
      ])
      .select('*')
      .single();

    if (appointmentError) {
      return res.status(500).json({ message: 'Error al crear cita', error: appointmentError.message, code: 'APPOINTMENT_CREATE_ERROR' });
    }


    const { data: payment, error: paymentError } = await supabase
      .from('pagos')
      .insert([
        {
          id_paciente: req.user.id,
          id_cita: appointment.id,
          monto: Number(monto),
          monto_final: Number(monto),
          metodo_pago,
          estado: 'pendiente',
          estado_validacion: 'POR_CONFIRMAR',
          fecha: finalFecha,
          servicio: servicio ?? 'Pago de cita',
          descripcion: descripcion ?? null,
          qr_imagen: null,
        },
      ])
      .select('*')
      .single();

    if (paymentError) {
      await supabase.from('citas').delete().eq('id', appointment.id);
      return res.status(500).json({ message: 'Error al crear pago', error: paymentError.message, code: 'PAYMENT_CREATE_ERROR' });
    }

    // Notificar a recepcionistas vía socket
    try {
      const { data: roleData } = await supabase.from('roles').select('id').eq('nombre', 'RECEPCIONISTA').single();
      if (roleData && roleData.id) {
        const { data: recps } = await supabase.from('usuarios').select('id').eq('rol_id', roleData.id).eq('activo', true);
        const io = getIO();
        (recps || []).forEach((r) => {
          io.to(`user_${r.id}`).emit('new_appointment', { appointment, payment });
        });
      }
    } catch (e) {
      console.error('Error notificando recepcionistas:', e?.message || e);
    }

    res.status(201).json({
      code: 'MOBILE_APPOINTMENT_CREATED',
      appointment,
      payment,
    });
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
    const { data: payment, error: paymentError } = await supabase
      .from('pagos')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      return res.status(404).json({ message: 'Pago no encontrado', code: 'PAYMENT_NOT_FOUND' });
    }

    if (payment.id_paciente !== req.user.id) {
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
    const fileName = `pago_${paymentId}_${Date.now()}.${fileExt}`;
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

    const { data: publicUrlData } = supabase.storage
      .from('payment-proofs')
      .getPublicUrl(filePath);

    const comprobanteUrl = publicUrlData?.publicUrl || null;

    const { data: updatedPayment, error: updateError } = await supabase
      .from('pagos')
      .update({
        comprobante: comprobanteUrl,
        estado_validacion: 'POR_CONFIRMAR',
        estado: 'pendiente',
      })
      .eq('id', paymentId)
      .select('*')
      .single();

    if (updateError) {
      return res.status(500).json({ message: 'Error al actualizar el pago', error: updateError.message, code: 'PAYMENT_UPDATE_ERROR' });
    }

    // Notificar a cajeros y recepcionistas que hay un comprobante por validar
    try {
      const io = getIO();
      const { data: cajeroRole } = await supabase.from('roles').select('id').eq('nombre', 'CAJERO').single();
      const { data: recepRole } = await supabase.from('roles').select('id').eq('nombre', 'RECEPCIONISTA').single();

      if (cajeroRole?.id) {
        const { data: cajeros } = await supabase.from('usuarios').select('id').eq('rol_id', cajeroRole.id).eq('activo', true);
        (cajeros || []).forEach((c) => io.to(`user_${c.id}`).emit('payment_proof_uploaded', { payment: updatedPayment }));
      }

      if (recepRole?.id) {
        const { data: recps } = await supabase.from('usuarios').select('id').eq('rol_id', recepRole.id).eq('activo', true);
        (recps || []).forEach((r) => io.to(`user_${r.id}`).emit('payment_proof_uploaded', { payment: updatedPayment }));
      }

      // Notificar al paciente que su comprobante fue recibido
      io.to(`user_${req.user.id}`).emit('payment_proof_received', { payment: updatedPayment });
    } catch (e) {
      console.error('Error notificando roles tras comprobante:', e?.message || e);
    }

    res.json({ code: 'PAYMENT_PROOF_UPLOADED', payment: updatedPayment });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

// Subir foto de perfil desde app móvil
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

    // Validar tipo de archivo
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimes.includes(file.mimetype)) {
      return res.status(400).json({ 
        message: 'Solo se permiten archivos de imagen (JPEG, PNG, WebP, GIF)',
        code: 'INVALID_FILE_TYPE'
      });
    }

    // Validar tamaño (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ 
        message: 'La imagen no puede exceder 5MB',
        code: 'FILE_TOO_LARGE'
      });
    }

    // Generar nombre de archivo único
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${userId}_${Date.now()}.${fileExt}`;
    const filePath = `profiles/${fileName}`;

    console.log(`📸 Subiendo foto de perfil (mobile) para usuario ${userId}: ${fileName}`);

    // Subir archivo a Supabase Storage
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

    console.log(`✅ Foto subida exitosamente: ${filePath}`);

    // Obtener URL pública
    const { data: publicUrlData } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(filePath);
    const publicUrl = publicUrlData?.publicUrl;

    if (!publicUrl) {
      console.error('❌ Error obteniendo URL pública');
      return res.status(500).json({ 
        message: 'Error al obtener URL de la imagen', 
        code: 'URL_ERROR' 
      });
    }

    console.log(`🔗 URL pública generada: ${publicUrl}`);

    // Actualizar URL en la base de datos
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

    console.log(`✅ Foto de perfil actualizada para usuario ${userId}`);

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
  getMobileDiscounts,
};
