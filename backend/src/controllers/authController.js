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

  if (!email || !password || !nombre) {
    return res.status(400).json({ message: 'Email, contraseña y nombre son requeridos', code: 'MISSING_FIELDS' });
  }

  try {
    // Registrar en Supabase Auth usando admin API (service role bypasses email confirmation)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre },
    });

    if (authError) {
      return res.status(400).json({ message: authError.message, code: 'AUTH_REGISTER_ERROR' });
    }

    // Crear registro en tabla usuarios (sin .select() para evitar problemas RLS)
    const { error: usuarioError } = await supabase
      .from('usuarios')
      .insert([
        {
          id: authData.user.id,
          correo: email,
          nombre,
          rol_id: rol_id || 5,
          activo: true,
          creado_en: new Date(),
        },
      ]);

    if (usuarioError) {
      // Si falla, intentamos eliminar el usuario de Auth
      await supabase.auth.admin.deleteUser(authData.user.id);
      return res.status(400).json({ message: usuarioError.message, code: 'DB_INSERT_ERROR' });
    }

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: {
        id: authData.user.id,
        nombre,
        email,
        rol_id: rol_id || 5,
        activo: true,
      },
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

// Función para listar todos los usuarios (solo administradores)
const getUsers = async (req, res) => {
  try {
    const { data: usuarios, error } = await supabase
      .from('usuarios')
      .select('id, nombre, correo, rol_id, activo, creado_en, roles:rol_id(id, nombre)')
      .order('creado_en', { ascending: false });

    if (error) {
      return res.status(500).json({ message: 'Error al obtener usuarios', error: error.message });
    }

    const users = (usuarios || []).map((u) => ({
      id: u.id,
      nombre: u.nombre,
      email: u.correo,
      rol: u.roles?.nombre || 'PRACTICANTE',
      rol_id: u.rol_id,
      activo: u.activo,
      creado_en: u.creado_en,
    }));

    res.json({ users });
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
  getUsers,
};