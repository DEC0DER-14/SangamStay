const express = require('express');
const router = express.Router();
const catchAsync = require('../utils/catchAsync');
const hotelsController = require('../controllers/hotels');
const { isLoggedIn, validateHotel, isAuthor, isAdmin } = require('../middleware');
const Hotel = require('../models/hotel');
const Booking = require('../models/booking');

// Move the bookings route BEFORE the :id routes
router.get('/bookings', isLoggedIn, catchAsync(hotelsController.showBookings));

router.route('/')
    .get(catchAsync(hotelsController.index))
    .post(isLoggedIn, isAdmin, validateHotel, catchAsync(hotelsController.createHotel));

router.get('/new', isLoggedIn, isAdmin, hotelsController.renderNewForm);

// Add booking routes
router.get('/:id/book', isLoggedIn, catchAsync(hotelsController.renderBookingForm));
router.post('/:id/book', isLoggedIn, catchAsync(hotelsController.createBooking));

router.route('/:id')
    .get(catchAsync(hotelsController.showHotel))
    .put(isLoggedIn, isAuthor, validateHotel, catchAsync(hotelsController.updateHotel))
    .delete(isLoggedIn, isAuthor, catchAsync(hotelsController.deleteHotel));

router.get('/:id/edit', isLoggedIn, isAuthor, catchAsync(hotelsController.renderEditForm));

// Add this route temporarily for debugging
router.get('/debug/:id', async (req, res) => {
    try {
        const hotel = await Hotel.findById(req.params.id)
            .populate('author')
            .populate('rooms')
            .populate('reviews');
        res.json(hotel);
    } catch (e) {
        res.json({ error: e.message });
    }
});

module.exports = router; 