const supabase = require('../config/supabase');
const supabaseAuth = require('../config/supabaseAuth');
const jwt = require('jsonwebtoken');

// Función para login - válido para todos los roles (web y API móvil)
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Autenticar con Supabase Auth usando cliente anónimo separado
    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ message: 'Credenciales inválidas', error: error.message });
    }

    // Obtener datos del usuario de la tabla usuarios
    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select('id, nombre, correo, rol_id, activo, foto_perfil, roles:rol_id(id, nombre)')
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
        foto_perfil: usuario.foto_perfil,
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
    const { error } = await supabaseAuth.auth.signOut();
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
      .select('id, nombre, correo, dni, rol_id, activo, creado_en, foto_perfil, roles:rol_id(id, nombre)')
      .order('creado_en', { ascending: false });

    if (error) {
      return res.status(500).json({ message: 'Error al obtener usuarios', error: error.message });
    }

    const users = (usuarios || []).map((u) => ({
      id: u.id,
      nombre: u.nombre,
      email: u.correo,
      dni: u.dni ?? '',
      rol: u.roles?.nombre || 'PRACTICANTE',
      rol_id: u.rol_id,
      activo: u.activo,
      creado_en: u.creado_en,
      foto_perfil: u.foto_perfil ?? null,
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
      .select('id, nombre, correo, rol_id, activo, foto_perfil, roles:rol_id(id, nombre)')
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
        foto_perfil: usuario.foto_perfil,
      } 
    });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message });
  }
};

// Función para actualizar foto de perfil
const updateProfilePhoto = async (req, res) => {
  try {
    const file = req.file;
    const userId = req.user.id;

    if (!file) {
      return res.status(400).json({ message: 'Archivo de imagen es requerido', code: 'NO_FILE' });
    }

    // Validar que sea una imagen
    if (!file.mimetype.startsWith('image/')) {
      return res.status(400).json({ message: 'Solo se permiten archivos de imagen', code: 'INVALID_FILE_TYPE' });
    }

    // Validar tamaño (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ message: 'La imagen no puede exceder 5MB', code: 'FILE_TOO_LARGE' });
    }

    // Generar nombre de archivo único
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${userId}_${Date.now()}.${fileExt}`;
    const filePath = `profiles/${fileName}`;

    console.log(`📸 Subiendo foto de perfil para usuario ${userId}: ${fileName}`);

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
    console.error('❌ Error en updateProfilePhoto:', err);
    res.status(500).json({ 
      message: 'Error interno', 
      error: err.message, 
      code: 'SERVER_ERROR' 
    });
  }
};

// Función para eliminar usuario
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    if (!userId) {
      return res.status(400).json({ message: 'ID de usuario es requerido', code: 'MISSING_ID' });
    }

    // Eliminar de la tabla usuarios
    const { error: deleteUserError } = await supabase
      .from('usuarios')
      .delete()
      .eq('id', userId);

    if (deleteUserError) {
      return res.status(500).json({ message: 'Error al eliminar usuario de BD', code: 'DB_DELETE_ERROR', error: deleteUserError.message });
    }

    // Eliminar de auth.users de Supabase
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      console.warn('Usuario eliminado de BD pero hubo error al eliminarlo de auth:', deleteAuthError);
      // No fallar aquí, el usuario ya fue eliminado de la BD
    }

    res.json({
      message: 'Usuario eliminado exitosamente',
      code: 'USER_DELETED',
      userId,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error interno', error: err.message, code: 'SERVER_ERROR' });
  }
};

module.exports = {
  login,
  register,
  logout,
  getProfile,
  getUsers,
  updateProfilePhoto,
  deleteUser,
};
