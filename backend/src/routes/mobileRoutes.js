const express = require('express');
const multer = require('multer');
const { mobileRegister, mobileLogin, getMobileDoctors, getMobileProfile, updateMobileProfile, uploadMobileProfilePhoto, getMobileDiscounts, getMobileDoctorById, createReview, getMyReviews, createMobileAppointment, getMobileAppointmentPayment, uploadMobilePaymentProof, getMyClinicalHistory, getMyMobileAppointments, getMyPatientAppointments, confirmMobileAppointment, getMobileChatContacts, diagnosticRoles, testNotification } = require('../controllers/mobileController');
const { getServices } = require('../controllers/serviceController');
const mobileAuthMiddleware = require('../middleware/mobileAuthMiddleware');

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// 🔧 RUTAS DE DIAGNÓSTICO (desarrollo/debugging)
router.get('/diagnostic/roles', diagnosticRoles);
router.post('/diagnostic/test-notification', testNotification);

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
router.post('/appointments', mobileAuthMiddleware, createMobileAppointment); // Crear cita + pago QR
router.get('/appointments', mobileAuthMiddleware, getMyPatientAppointments); // Listar citas del paciente autenticado
router.get('/appointments/doctor/my', mobileAuthMiddleware, getMyMobileAppointments); // Obtener citas asignadas al doctor
router.put('/appointments/:appointmentId/confirm', mobileAuthMiddleware, confirmMobileAppointment); // Doctor confirma cita
router.get('/appointments/:appointmentId/payment', mobileAuthMiddleware, getMobileAppointmentPayment); // Obtener pago de cita y QR
router.post('/payments/:paymentId/proof', mobileAuthMiddleware, upload.single('comprobante'), uploadMobilePaymentProof); // Subir comprobante de pago
router.get('/clinical-history', mobileAuthMiddleware, getMyClinicalHistory); // Obtener historial clínico del paciente
router.get('/chat/contacts', mobileAuthMiddleware, getMobileChatContacts);   // Contactos de chat disponibles para el paciente
router.get('/services', mobileAuthMiddleware, getServices); // Listar precios de consultas definidos por administración
router.get('/discounts', mobileAuthMiddleware, getMobileDiscounts);    // Listar descuentos autorizados y vigentes

module.exports = router;
