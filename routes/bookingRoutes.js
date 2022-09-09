const express = require('express');
const bookingController = require('../controller/bookingController');
const authController = require('../controller/authController')

const router = express.Router();

router.post('/checkout-session/:tourId', authController.protect, bookingController.getCheckoutSession)
router.post('/create-booking-checkout', bookingController.createBookingCheckout)
router.post('/my-tours', authController.protect, bookingController.getMyTours)


module.exports = router;