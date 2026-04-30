const express = require('express');
const {
  listAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} = require('../controllers/appointmentController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware(['ADMINISTRADOR', 'ODONTOLOGO', 'RECEPCIONISTA', 'PRACTICANTE']));

router.get('/', listAppointments);
router.get('/:id', getAppointmentById);
router.post('/', createAppointment);
router.put('/:id', updateAppointment);
router.delete('/:id', deleteAppointment);

module.exports = router;
