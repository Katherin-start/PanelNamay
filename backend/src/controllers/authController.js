const supabase = require('../config/supabase');
const jwt = require('jsonwebtoken');

// Función para login - válido para todos los roles (web y API móvil)
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Autenticar con Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ message: 'Credenciales inválidas', error: error.message });
    }

    // Obtener datos del usuario de la tabla usuarios
    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select('id, nombre, correo, rol_id, activo, roles:rol_id(id, nombre)')
      .eq('correo', email)
      .single();

    if (usuarioError || !usuario) {
      return res.status(500).json({ message: 'Error al obtener usuario', error: usuarioError?.message });
    }

    // Verificar si el usuario está activo
    if (!usuario.activo) {
      return res.status(401).json({ message: 'Usuario inactivo' });
    }

    // Generar JWT con la información del usuario
    const token = jwt.sign(
      { 
        id: usuario.id, 
        email: usuario.correo, 
        nombre: usuario.nombre,
        rol_id: usuario.rol_id,
        rol: usuario.roles?.nombre || 'CLIENTE'
      },
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login exitoso',
      user: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.correo,
        rol: usuario.roles?.nombre || 'CLIENTE',
        rol_id: usuario.rol_id,
      },
      token,
      session: data.session,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message });
  }
};

// Función para registrar usuario (solo administradores pueden crear usuarios)
const register = async (req, res) => {
  const { email, password, nombre, rol_id } = req.body;
  const adminId = req.user?.id; // Obtenido del middleware de autenticación

  try {
    // Validar que quien registra sea administrador
    if (req.user?.rol !== 'ADMINISTRADOR') {
      return res.status(403).json({ message: 'Solo administradores pueden registrar usuarios' });
    }

    // Registrar en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre,
        },
      },
    });

    if (authError) {
      return res.status(400).json({ message: 'Error al registrar en Auth', error: authError.message });
    }

    // Crear registro en tabla usuarios
    const { data: usuarioData, error: usuarioError } = await supabase
      .from('usuarios')
      .insert([
        {
          id: authData.user.id,
          correo: email,
          nombre,
          rol_id: rol_id || 5, // Por defecto PRACTICANTE (id 5)
          activo: true,
          creado_en: new Date(),
        },
      ])
      .select();

    if (usuarioError) {
      return res.status(400).json({ message: 'Error al crear usuario', error: usuarioError.message });
    }

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: usuarioData[0],
    });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message });
  }
};

// Función para logout
const logout = async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return res.status(500).json({ message: 'Error al cerrar sesión', error: error.message });
    }
    res.json({ message: 'Sesión cerrada exitosamente' });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message });
  }
};

// Función para obtener perfil actual
const getProfile = async (req, res) => {
  try {
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('id, nombre, correo, rol_id, activo, roles:rol_id(id, nombre)')
      .eq('id', req.user.id)
      .single();

    if (error) {
      return res.status(500).json({ message: 'Error al obtener perfil', error: error.message });
    }

    res.json({ 
      profile: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.correo,
        rol: usuario.roles?.nombre,
        activo: usuario.activo,
      } 
    });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message });
  }
};

module.exports = {
  login,
  register,
  logout,
  getProfile,
};