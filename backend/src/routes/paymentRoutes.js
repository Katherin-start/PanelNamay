const express = require('express');
const multer = require('multer');
const {
  createPayment,
  listPayments,
  getPaymentsByPatient,
  getPaymentDetails,
  validatePayment,
  assignPaymentQr,
  generateCashBoxReport,
  generatePaymentReceipt,
  generateInvoiceReport,
} = require('../controllers/paymentController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware(['ADMINISTRADOR', 'CAJERO', 'RECEPCIONISTA', 'CLIENTE']));

router.post('/', createPayment);
router.get('/', listPayments);
router.get('/patient/:patientId', getPaymentsByPatient);
router.put('/:paymentId/validation', validatePayment);
router.post('/:paymentId/qr', upload.single('qr'), assignPaymentQr);
router.get('/reports/cashbox', generateCashBoxReport);
router.get('/:paymentId/receipt', generatePaymentReceipt);
router.get('/:paymentId/invoice', generateInvoiceReport);
router.get('/:paymentId', getPaymentDetails);

module.exports = router;
