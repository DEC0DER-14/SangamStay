const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middleware');
const paymentController = require('../controllers/payment');

// COD route
router.post('/cod/:bookingId', isLoggedIn, paymentController.confirmCODBooking);

// Commented out Razorpay routes for now
// router.post('/create-order/:bookingId', isLoggedIn, paymentController.createOrder);
// router.post('/verify/:bookingId', isLoggedIn, paymentController.verifyPayment);

module.exports = router; 