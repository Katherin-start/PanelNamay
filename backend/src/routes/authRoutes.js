const express = require('express');
const multer = require('multer');
const { login, register, logout, getProfile, getUsers, updateProfilePhoto, deleteUser, updateBiography, getMyReviews, getDentistProfile } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

// Rutas públicas
router.post('/login', login);
router.get('/dentists/:id', getDentistProfile); // Obtener perfil del odontólogo (público)

// Rutas protegidas
// Cualquier usuario autenticado puede crear otros usuarios
router.post('/register', authMiddleware, register);
router.post('/logout', authMiddleware, logout);
router.get('/profile', authMiddleware, getProfile);
router.get('/profile/reviews', authMiddleware, roleMiddleware(['ODONTOLOGO']), getMyReviews);
router.put('/profile/photo', authMiddleware, upload.single('foto'), updateProfilePhoto);
router.put('/profile/biography', authMiddleware, roleMiddleware(['ODONTOLOGO']), updateBiography); // Solo odontólogos
// Cualquier usuario autenticado puede ver la lista de usuarios
router.get('/users', authMiddleware, getUsers);
router.delete('/users/:id', authMiddleware, deleteUser);

module.exports = router;
