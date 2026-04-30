const jwt = require('jsonwebtoken');

// Middleware para autenticación móvil (Flutter)
// Similar a authMiddleware pero puede aceptar tanto JWT local como session tokens de Supabase
const mobileAuthMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ 
      message: 'Acceso denegado. Token requerido.',
      code: 'NO_TOKEN'
    });
  }

  try {
    // Intentar verificar con JWT local primero
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
    req.user = decoded;
    req.authSource = 'jwt_local'; // Para distinguir el origen de autenticación
    next();
  } catch (err) {
    // Si falla, podría ser un token de Supabase (sesión)
    // Por ahora retornamos error, pero podrías agregar validación con Supabase aquí
    res.status(401).json({ 
      message: 'Token inválido o expirado',
      code: 'INVALID_TOKEN'
    });
  }
};

module.exports = mobileAuthMiddleware;