const express = require('express');
const multer = require('multer');
const {
  createPayment,
  listPayments,
  getPaymentsByPatient,
  getPaymentDetails,
  validatePayment,
  deletePaymentProof,
  assignPaymentQr,
  generateCashBoxReport,
  generatePaymentReceipt,
  generateInvoiceReport,
  getPendingValidationPayments,
  confirmPaymentAndGenerateInvoice,
  servePaymentProof,
} = require('../controllers/paymentController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// 📥 Rutas PÚBLICAS (sin autenticación)
router.get('/:paymentId/receipt', generatePaymentReceipt);
router.get('/:paymentId/invoice', generateInvoiceReport);
router.get('/:paymentId/proof', servePaymentProof); // <img> no puede enviar headers de auth

// 🔐 Rutas PROTEGIDAS (requieren autenticación)
router.use(authMiddleware);
router.use(roleMiddleware(['ADMINISTRADOR', 'CAJERO', 'RECEPCIONISTA', 'CLIENTE']));

// ⚠️ Rutas específicas PRIMERO (antes de /:paymentId)
router.get('/pending-validation', getPendingValidationPayments);
router.get('/reports/cashbox', generateCashBoxReport);

router.post('/', createPayment);
router.get('/', listPayments);
router.get('/patient/:patientId', getPaymentsByPatient);
router.put('/:paymentId/validation', validatePayment);
router.post('/:paymentId/confirm-and-invoice', confirmPaymentAndGenerateInvoice);
router.delete('/:paymentId/proof', deletePaymentProof);
router.post('/:paymentId/qr', upload.single('qr'), assignPaymentQr);
router.get('/:paymentId', getPaymentDetails);

module.exports = router;
