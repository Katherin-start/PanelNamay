const express = require('express');
const { login, register, logout, getProfile, getUsers } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

// Rutas públicas
router.post('/login', login);

// Rutas protegidas
// Cualquier usuario autenticado puede crear otros usuarios
router.post('/register', authMiddleware, register);
router.post('/logout', authMiddleware, logout);
router.get('/profile', authMiddleware, getProfile);
// Cualquier usuario autenticado puede ver la lista de usuarios
router.get('/users', authMiddleware, getUsers);

module.exports = router;
