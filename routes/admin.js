const express = require('express');
const router = express.Router();
const { isLoggedIn, isAdmin } = require('../middleware');
const Hotel = require('../models/hotel');
const Booking = require('../models/booking');
const User = require('../models/user');
const catchAsync = require('../utils/catchAsync');
const hotels = require('../controllers/hotels');

// Admin dashboard
router.get('/dashboard', isLoggedIn, isAdmin, catchAsync(async (req, res) => {
    try {
        const hotels = await Hotel.find({});
        const bookings = await Booking.find({})
            .populate('userId')
            .populate('hotelId')
            .limit(5)
            .sort({ createdAt: -1 });
        
        res.render('admin/dashboard', { 
            hotels,
            bookings,
            totalHotels: hotels.length,
            totalBookings: await Booking.countDocuments()
        });
    } catch (e) {
        req.flash('error', 'Error loading dashboard');
        res.redirect('/hotels');
    }
}));

// Update hotel room availability
router.post('/hotels/:id/rooms', isLoggedIn, isAdmin, catchAsync(async (req, res) => {
    const { id } = req.params;
    const { availableRooms } = req.body;
    await Hotel.findByIdAndUpdate(id, { availableRooms });
    req.flash('success', 'Updated room availability');
    res.redirect('/admin/dashboard');
}));

// View all bookings with advanced filtering
router.get('/bookings', isLoggedIn, isAdmin, catchAsync(async (req, res) => {
    try {
        const { status, sortBy, search } = req.query;
        
        // Build query
        let query = {};
        
        // Filter by status if specified
        if (status && ['pending', 'confirmed', 'cancelled'].includes(status)) {
            query.status = status;
        }

        // Search by guest name, email, or hotel name
        if (search) {
            query.$or = [
                { 'guestDetails.name': { $regex: search, $options: 'i' } },
                { 'guestDetails.email': { $regex: search, $options: 'i' } }
            ];
        }

        let bookings = Booking.find(query)
            .populate('userId')
            .populate('hotelId')
            .populate('roomId');

        // Apply sorting
        switch (sortBy) {
            case 'dateAsc':
                bookings = bookings.sort({ checkInDate: 1 });
                break;
            case 'dateDesc':
                bookings = bookings.sort({ checkInDate: -1 });
                break;
            case 'amountAsc':
                bookings = bookings.sort({ totalAmount: 1 });
                break;
            case 'amountDesc':
                bookings = bookings.sort({ totalAmount: -1 });
                break;
            default:
                bookings = bookings.sort({ createdAt: -1 }); // Default sort by newest
        }

        bookings = await bookings.exec();
        res.render('admin/bookings', { bookings, query: { status, sortBy, search } });
    } catch (e) {
        console.error('Error fetching admin bookings:', e);
        req.flash('error', 'Error loading bookings');
        res.redirect('/admin/dashboard');
    }
}));

// Update booking status
router.post('/bookings/:bookingId/status', isLoggedIn, isAdmin, catchAsync(hotels.updateBookingStatus));

// Manage users
router.get('/users', isLoggedIn, isAdmin, catchAsync(async (req, res) => {
    const users = await User.find({});
    res.render('admin/users', { users });
}));

// Update booking details
router.post('/bookings/:bookingId/update', isLoggedIn, isAdmin, catchAsync(hotels.updateBookingDetails));

module.exports = router; 