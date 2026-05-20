const express = require('express');
const { login, register, logout, getProfile, getUsers } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

// Rutas públicas
router.post('/login', login);

// Rutas protegidas
router.post('/register', authMiddleware, roleMiddleware(['ADMINISTRADOR']), register); // Solo admin
router.post('/logout', authMiddleware, logout);
router.get('/profile', authMiddleware, getProfile);
router.get('/users', authMiddleware, roleMiddleware(['ADMINISTRADOR']), getUsers); // Solo admin

module.exports = router;