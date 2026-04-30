const express = require('express');
const {
  createPayment,
  listPayments,
  getPaymentsByPatient,
  getPaymentDetails,
  generateCashBoxReport,
  generatePaymentReceipt,
  generateInvoiceReport,
} = require('../controllers/paymentController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware(['ADMINISTRADOR', 'CAJERO', 'RECEPCIONISTA', 'CLIENTE']));

router.post('/', createPayment);
router.get('/', listPayments);
router.get('/patient/:patientId', getPaymentsByPatient);
router.get('/reports/cashbox', generateCashBoxReport);
router.get('/:paymentId/receipt', generatePaymentReceipt);
router.get('/:paymentId/invoice', generateInvoiceReport);
router.get('/:paymentId', getPaymentDetails);

module.exports = router;
