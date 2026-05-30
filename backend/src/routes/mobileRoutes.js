const express = require('express');
const { mobileRegister, mobileLogin, getMobileDoctors, getMobileProfile, updateMobileProfile } = require('../controllers/mobileController');
const mobileAuthMiddleware = require('../middleware/mobileAuthMiddleware');

const router = express.Router();

// Rutas públicas (sin autenticación)
router.post('/auth/register', mobileRegister);      // Registro de cliente
router.post('/auth/login', mobileLogin);             // Login de cliente

// Rutas protegidas (requieren autenticación)
router.get('/odontologos', mobileAuthMiddleware, getMobileDoctors);    // Listar odontólogos activos
router.get('/profile', mobileAuthMiddleware, getMobileProfile);        // Obtener perfil
router.put('/profile', mobileAuthMiddleware, updateMobileProfile);     // Actualizar perfil

module.exports = router;
