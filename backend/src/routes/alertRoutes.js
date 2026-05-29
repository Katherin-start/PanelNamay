const express = require('express');
const router = express.Router();
const {
  getMedicalAlerts,
  createMedicalAlert,
  updateMedicalAlert,
  getUpcomingAlerts,
  getPatientAlerts,
} = require('../controllers/alertController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// 🔔 RUTAS DE ALERTAS MÉDICAS
router.get('/', authMiddleware, roleMiddleware(['ADMINISTRADOR', 'ODONTOLOGO', 'RECEPCIONISTA']), getMedicalAlerts);
router.post('/', authMiddleware, roleMiddleware(['ADMINISTRADOR', 'ODONTOLOGO']), createMedicalAlert);
router.put('/:id', authMiddleware, roleMiddleware(['ADMINISTRADOR', 'ODONTOLOGO']), updateMedicalAlert);
router.get('/upcoming', authMiddleware, roleMiddleware(['ADMINISTRADOR', 'ODONTOLOGO', 'RECEPCIONISTA']), getUpcomingAlerts);
router.get('/patient/:paciente_id', authMiddleware, roleMiddleware(['ADMINISTRADOR', 'ODONTOLOGO']), getPatientAlerts);

module.exports = router;
