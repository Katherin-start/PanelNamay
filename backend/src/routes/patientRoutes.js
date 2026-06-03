const express = require('express');
const router = express.Router();
const {
  getPatients,
  createPatient,
  updatePatientState,
  deletePatient,
  getTreatments,
  createTreatment,
  updateTreatment,
  getClinicalHistory,
  addClinicalRecord,
  generateClinicalHistoryPDF,
  generateTreatmentSummaryPDF,
  grantAccess,
  revokeAccess,
  listAccesses,
} = require('../controllers/patientController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.use(authMiddleware);

// 👥 RUTAS DE PACIENTES
router.get('/', roleMiddleware(['ADMINISTRADOR', 'ODONTOLOGO', 'RECEPCIONISTA']), getPatients);
router.post('/', roleMiddleware(['ADMINISTRADOR', 'RECEPCIONISTA']), createPatient);
router.put('/:id/state', roleMiddleware(['ADMINISTRADOR', 'ODONTOLOGO']), updatePatientState);
router.delete('/:id', roleMiddleware(['ADMINISTRADOR']), deletePatient);

// 🩺 RUTAS DE TRATAMIENTOS
router.get('/treatments', roleMiddleware(['ADMINISTRADOR', 'ODONTOLOGO', 'RECEPCIONISTA']), getTreatments);
router.post('/treatments', roleMiddleware(['ADMINISTRADOR', 'ODONTOLOGO']), createTreatment);
router.put('/treatments/:id', roleMiddleware(['ADMINISTRADOR', 'ODONTOLOGO']), updateTreatment);
router.get('/treatments/:id/summary/pdf', roleMiddleware(['ADMINISTRADOR', 'ODONTOLOGO']), generateTreatmentSummaryPDF);

// 📋 RUTAS DE HISTORIAL CLÍNICO
router.get('/:paciente_id/clinical-history', roleMiddleware(['ADMINISTRADOR', 'ODONTOLOGO']), getClinicalHistory);
router.post('/:paciente_id/clinical-history', roleMiddleware(['ADMINISTRADOR', 'ODONTOLOGO']), addClinicalRecord);
router.get('/:paciente_id/clinical-history/pdf', roleMiddleware(['ADMINISTRADOR', 'ODONTOLOGO']), generateClinicalHistoryPDF);

// RUTAS DE ACCESO AL HISTORIAL (el controlador valida que quien solicita sea el paciente o admin)
router.post('/:paciente_id/access', grantAccess);
router.delete('/:paciente_id/access/:odontologoId', revokeAccess);
router.get('/:paciente_id/access', listAccesses);

module.exports = router;
