const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    // allowedRoles puede ser un array de IDs o de nombres
    const userRole = req.user.rol; // Viene del JWT (nombre del rol)
    const userRolId = req.user.rol_id; // ID del rol

    const isAuthorized = allowedRoles.includes(userRole) || allowedRoles.includes(userRolId);

    if (!isAuthorized) {
      return res.status(403).json({ 
        message: 'Acceso denegado. Rol insuficiente.',
        userRole,
        allowedRoles
      });
    }
    next();
  };
};

module.exports = roleMiddleware;