const express = require('express');
const router = express.Router();
const { isLoggedIn, isAdmin } = require('../middleware');
const Booking = require('../models/booking');

router.get('/', isLoggedIn, async (req, res) => {
    try {
        const bookings = await Booking.find({ userId: req.user._id })
            .populate('hotelId')
            .populate('roomId')
            .sort({ createdAt: -1 });

        // Filter out bookings with invalid references
        const validBookings = bookings.filter(booking => booking.hotelId && booking.roomId);

        res.render('bookings/index', { bookings: validBookings });
    } catch (e) {
        req.flash('error', 'Unable to fetch your bookings');
        res.redirect('/hotels');
    }
});

// Add this new route to clear all bookings (admin only)
router.delete('/clear', isLoggedIn, isAdmin, async (req, res) => {
    try {
        await Booking.deleteMany({});
        req.flash('success', 'All bookings have been cleared');
        res.redirect('/bookings');
    } catch (e) {
        req.flash('error', 'Error clearing bookings');
        res.redirect('/bookings');
    }
});

// Add this route to clear user's own bookings
router.delete('/clear-my-bookings', isLoggedIn, async (req, res) => {
    try {
        await Booking.deleteMany({ userId: req.user._id });
        req.flash('success', 'Your bookings have been cleared');
        res.redirect('/bookings');
    } catch (e) {
        req.flash('error', 'Error clearing your bookings');
        res.redirect('/bookings');
    }
});

// Update the cancel booking route
router.post('/:id/cancel', isLoggedIn, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        
        if (!booking) {
            req.flash('error', 'Booking not found');
            return res.redirect('/bookings');
        }

        // Check if the booking belongs to the current user or if user is admin
        if (!booking.userId.equals(req.user._id) && req.user.role !== 'admin') {
            req.flash('error', 'You do not have permission to cancel this booking');
            return res.redirect('/bookings');
        }

        // Only allow cancellation if the booking is not already cancelled
        if (booking.status === 'cancelled') {
            req.flash('error', 'Booking is already cancelled');
            return res.redirect('/bookings');
        }

        // Update the booking status
        await Booking.findByIdAndUpdate(booking._id, { status: 'cancelled' });
        
        req.flash('success', 'Booking cancelled successfully');
        return res.redirect('/bookings');
    } catch (e) {
        console.error(e);
        req.flash('error', 'Error cancelling booking');
        return res.redirect('/bookings');
    }
});

module.exports = router; 