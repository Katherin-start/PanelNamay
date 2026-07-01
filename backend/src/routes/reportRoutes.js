const express = require('express');
const {
  generateIncomeReport,
  generatePatientsReport,
  generateAppointmentsReport,
  generateAttendanceReport,
  generateAccumulatedHoursReport,
  generateTodayAppointmentsReport,
  generateFinancialReport,
} = require('../controllers/reportController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware(['ADMINISTRADOR', 'ODONTOLOGO', 'RECEPCIONISTA', 'PRACTICANTE', 'CAJERO', 'PACIENTE']));

// 🧾 Reportes PDF
router.get('/income', generateIncomeReport);
router.get('/patients', generatePatientsReport);
router.get('/appointments', generateAppointmentsReport);
router.get('/appointments/today', generateTodayAppointmentsReport);
router.get('/attendance', generateAttendanceReport);
router.get('/hours', generateAccumulatedHoursReport);
router.get('/financial', generateFinancialReport);

module.exports = router;
