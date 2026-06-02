const express = require('express');
const {
  createDiscount,
  listDiscounts,
  getDiscountDetails,
  approveDiscount,
} = require('../controllers/discountController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware(['ADMINISTRADOR', 'RECEPCIONISTA', 'CAJERO']));

router.get('/', listDiscounts);
router.get('/:id', getDiscountDetails);

// Recepcionista y administrador pueden crear solicitudes; sólo admin aprueba
router.post('/', roleMiddleware(['RECEPCIONISTA','ADMINISTRADOR']), createDiscount);
router.put('/:id/approve', roleMiddleware(['ADMINISTRADOR']), approveDiscount);

module.exports = router;
