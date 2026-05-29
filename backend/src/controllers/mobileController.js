const supabase = require('../config/supabase');
const jwt = require('jsonwebtoken');

// Registro para clientes móviles (rol CLIENTE automáticamente)
const mobileRegister = async (req, res) => {
  const { email, password, nombre, apellido, telefono } = req.body;

  // Validar campos requeridos
  if (!email || !password || !nombre) {
    return res.status(400).json({ 
      message: 'Email, contraseña y nombre son requeridos',
      code: 'MISSING_FIELDS'
    });
  }

  try {
    // Registrar en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre,
          apellido,
          telefono,
        },
      },
    });

    if (authError) {
      return res.status(400).json({ 
        message: 'Error al registrar', 
        error: authError.message,
        code: 'AUTH_ERROR'
      });
    }

    // Crear registro en tabla usuarios con rol CLIENTE (id: sin rol_id o rol_id NULL)
    const { data: usuarioData, error: usuarioError } = await supabase
      .from('usuarios')
      .insert([
        {
          id: authData.user.id,
          correo: email,
          nombre: nombre,
          activo: true,
          creado_en: new Date(),
          // rol_id NULL = CLIENTE (si está configurado así en tu base de datos)
        },
      ])
      .select('id, nombre, correo, activo');

    if (usuarioError) {
      // Si falla, intentamos eliminar el usuario de Auth
      await supabase.auth.admin.deleteUser(authData.user.id);
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
        email: usuarioData[0].correo,
        rol: 'CLIENTE',
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
    // Autenticar con Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ 
        message: 'Credenciales inválidas', 
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Obtener datos del usuario
    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select('id, nombre, correo, activo')
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

    // Generar JWT
    const token = jwt.sign(
      { 
        id: usuario.id, 
        email: usuario.correo, 
        nombre: usuario.nombre,
        rol: 'CLIENTE',
        rol_id: null,
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
        email: usuario.correo,
        rol: 'CLIENTE',
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

// Obtener perfil del cliente
const getMobileProfile = async (req, res) => {
  try {
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('id, nombre, correo, activo, creado_en')
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
        email: usuario.correo,
        rol: 'CLIENTE',
        activo: usuario.activo,
        creado_en: usuario.creado_en,
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
  const { nombre, apellido, telefono } = req.body;

  try {
    const { data: updated, error } = await supabase
      .from('usuarios')
      .update({
        nombre: nombre || undefined,
      })
      .eq('id', req.user.id)
      .select('id, nombre, correo');

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

module.exports = {
  mobileRegister,
  mobileLogin,
  getMobileProfile,
  updateMobileProfile,
};
