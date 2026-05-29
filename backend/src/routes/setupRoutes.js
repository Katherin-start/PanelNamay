const express = require('express');
const router = express.Router();
const { initializeStorage, healthCheck } = require('../controllers/setupController');
const authMiddleware = require('../middleware/authMiddleware');

// 🔧 RUTAS DE CONFIGURACIÓN

// Endpoint público para inicializar storage (sin autenticación para primera configuración)
router.post('/initialize-storage', initializeStorage);

// Health check del sistema
router.get('/health', healthCheck);

// Health check con autenticación
router.get('/health/auth', authMiddleware, healthCheck);

module.exports = router;
