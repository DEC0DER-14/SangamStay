const express = require('express');
const router = express.Router();
const catchAsync = require('../utils/catchAsync');
const hotelsController = require('../controllers/hotels');
const { isLoggedIn, validateHotel, isAuthor, isAdmin } = require('../middleware');
const Hotel = require('../models/hotel');

router.route('/')
    .get(catchAsync(hotelsController.index))
    .post(isLoggedIn, isAdmin, validateHotel, catchAsync(hotelsController.createHotel));

router.get('/new', isLoggedIn, isAdmin, hotelsController.renderNewForm);

router.route('/:id')
    .get(catchAsync(hotelsController.showHotel))
    .put(isLoggedIn, isAuthor, validateHotel, catchAsync(hotelsController.updateHotel))
    .delete(isLoggedIn, isAuthor, catchAsync(hotelsController.deleteHotel));

router.get('/:id/edit', isLoggedIn, isAuthor, catchAsync(hotelsController.renderEditForm));

// Add booking routes
router.get('/:id/book', catchAsync(async (req, res) => {
    if (!req.isAuthenticated()) {
        req.session.returnTo = `/hotels/${req.params.id}/book`;
        req.flash('error', 'You must be logged in to book a hotel');
        return res.redirect('/login');
    }
    const hotel = await Hotel.findById(req.params.id);
    if (!hotel) {
        req.flash('error', 'Hotel not found');
        return res.redirect('/hotels');
    }
    res.render('hotels/book', { hotel });
}));
router.post('/:id/book', isLoggedIn, catchAsync(hotelsController.createBooking));

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