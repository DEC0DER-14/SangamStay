const express = require('express');
const router = express.Router();
const { isLoggedIn, isAdmin } = require('../middleware');
const Hotel = require('../models/hotel');
const Booking = require('../models/booking');
const User = require('../models/user');
const catchAsync = require('../utils/catchAsync');

// Admin dashboard
router.get('/dashboard', isLoggedIn, isAdmin, catchAsync(async (req, res) => {
    const hotels = await Hotel.find({});
    res.render('admin/dashboard', { hotels });
}));

// Update hotel room availability
router.post('/hotels/:id/rooms', isLoggedIn, isAdmin, catchAsync(async (req, res) => {
    const { id } = req.params;
    const { availableRooms } = req.body;
    await Hotel.findByIdAndUpdate(id, { availableRooms });
    req.flash('success', 'Updated room availability');
    res.redirect('/admin/dashboard');
}));

// View all bookings
router.get('/bookings', isLoggedIn, isAdmin, catchAsync(async (req, res) => {
    const bookings = await Booking.find({})
        .populate('userId')
        .populate('hotelId')
        .populate('roomId');
    res.render('admin/bookings', { bookings });
}));

// Manage users
router.get('/users', isLoggedIn, isAdmin, catchAsync(async (req, res) => {
    const users = await User.find({});
    res.render('admin/users', { users });
}));

module.exports = router; 