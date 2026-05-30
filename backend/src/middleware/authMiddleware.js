const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  // Log header for debugging (temporary)
  try {
    console.debug('[AUTH] Received Authorization header:', req.header('Authorization') || req.headers.authorization);
  } catch (e) {}

  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'Acceso denegado. Token requerido.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
    req.user = decoded;
    next();
  } catch (err) {
    console.error('[AUTH] JWT verify failed:', err.message);
    res.status(401).json({ message: 'Token inválido' });
  }
};

module.exports = authMiddleware;
