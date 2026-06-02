const express = require('express');
const multer = require('multer');
const { mobileRegister, mobileLogin, getMobileDoctors, getMobileProfile, updateMobileProfile, uploadMobileProfilePhoto } = require('../controllers/mobileController');
const mobileAuthMiddleware = require('../middleware/mobileAuthMiddleware');

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// Rutas públicas (sin autenticación)
router.post('/auth/register', mobileRegister);      // Registro de cliente
router.post('/auth/login', mobileLogin);             // Login de cliente

// Rutas protegidas (requieren autenticación)
router.get('/odontologos', mobileAuthMiddleware, getMobileDoctors);    // Listar odontólogos activos
router.get('/profile', mobileAuthMiddleware, getMobileProfile);        // Obtener perfil
router.put('/profile', mobileAuthMiddleware, updateMobileProfile);     // Actualizar perfil
router.post('/profile/photo', mobileAuthMiddleware, upload.single('foto'), uploadMobileProfilePhoto); // Subir foto de perfil

module.exports = router;
