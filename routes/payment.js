const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middleware');
const paymentController = require('../controllers/payment');

router.post('/create-order/:bookingId', isLoggedIn, paymentController.createOrder);
router.post('/verify/:bookingId', isLoggedIn, paymentController.verifyPayment);

module.exports = router; 