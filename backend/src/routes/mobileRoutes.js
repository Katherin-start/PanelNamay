const express = require('express');
const multer = require('multer');
const { mobileRegister, mobileLogin, getMobileDoctors, getMobileProfile, updateMobileProfile, uploadMobileProfilePhoto, getMobileDiscounts, getMobileDoctorById, createReview, getMyReviews } = require('../controllers/mobileController');
const mobileAuthMiddleware = require('../middleware/mobileAuthMiddleware');

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// Rutas públicas (sin autenticación)
router.post('/auth/register', mobileRegister);      // Registro de cliente
router.post('/auth/login', mobileLogin);             // Login de cliente

// Rutas protegidas (requieren autenticación)
router.get('/odontologos', mobileAuthMiddleware, getMobileDoctors);    // Listar odontólogos activos
router.get('/odontologos/me/reviews', mobileAuthMiddleware, getMyReviews); // Obtener reseñas del odontólogo autenticado
router.get('/odontologos/:id', mobileAuthMiddleware, getMobileDoctorById); // Perfil público de odontólogo (incluye reseñas)
router.post('/odontologos/:id/reviews', mobileAuthMiddleware, createReview); // Crear reseña para odontólogo
router.get('/profile', mobileAuthMiddleware, getMobileProfile);        // Obtener perfil
router.put('/profile', mobileAuthMiddleware, updateMobileProfile);     // Actualizar perfil
router.post('/profile/photo', mobileAuthMiddleware, upload.single('foto'), uploadMobileProfilePhoto); // Subir foto de perfil
router.get('/discounts', mobileAuthMiddleware, getMobileDiscounts);    // Listar descuentos autorizados y vigentes

module.exports = router;
