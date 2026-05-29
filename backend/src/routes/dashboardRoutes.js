const express = require('express');
const {
  getDashboardMetrics,
  getNotifications,
  getAppointmentAlerts,
  getFollowUpReminders,
  getAttendanceAlerts,
} = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

// Todas las rutas requieren autenticación y rol ADMINISTRADOR, ODONTOLOGO, RECEPCIONISTA, PRACTICANTE o CAJERO
router.use(authMiddleware);
router.use(roleMiddleware(['ADMINISTRADOR', 'ODONTOLOGO', 'RECEPCIONISTA', 'PRACTICANTE', 'CAJERO']));

// 📊 Dashboard - Métricas y gráficos
router.get('/metrics', getDashboardMetrics);

// 🔔 Notificaciones
router.get('/notifications', getNotifications);

// 🔔 Recordatorios de seguimiento y control médico
router.get('/followups', getFollowUpReminders);

// 📌 Alertas de citas
router.get('/appointment-alerts', getAppointmentAlerts);
router.get('/attendance-alerts', getAttendanceAlerts);

module.exports = router;
