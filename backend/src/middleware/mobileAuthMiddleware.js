const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

// Middleware para autenticación móvil (Flutter)
// Similar a authMiddleware pero puede aceptar tanto JWT local como session tokens de Supabase
const mobileAuthMiddleware = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  
  if (!authHeader) {
    return res.status(401).json({ 
      message: 'Acceso denegado. Header Authorization requerido.',
      code: 'NO_AUTH_HEADER'
    });
  }

  const token = authHeader.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ 
      message: 'Acceso denegado. Token requerido en formato: Bearer {token}',
      code: 'NO_TOKEN'
    });
  }

  try {
    // Intentar verificar con JWT local primero
    const jwtSecret = process.env.JWT_SECRET || 'secret_key';
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    req.authSource = 'jwt_local';
    return next();
  } catch (jwtError) {
    console.error('JWT verification error:', jwtError.message);
    
    // Si JWT local falla, intentar con Supabase session token
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        throw new Error('Token de Supabase inválido');
      }
      
      req.user = {
        id: user.id,
        email: user.email,
      };
      req.authSource = 'supabase_session';
      return next();
    } catch (supabaseError) {
      console.error('Supabase token error:', supabaseError.message);
      return res.status(401).json({ 
        message: 'Token inválido o expirado',
        code: 'INVALID_TOKEN',
        details: process.env.NODE_ENV === 'development' ? jwtError.message : undefined
      });
    }
  }
};

module.exports = mobileAuthMiddleware;
