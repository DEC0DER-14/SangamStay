const Payment = require('../models/payment');
const Booking = require('../models/booking');
const Hotel = require('../models/hotel');

// Commented out Razorpay for now
// const razorpay = require('../config/razorpay');
// const crypto = require('crypto');

// Cash on Delivery payment handling
module.exports.confirmCODBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.bookingId);
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Create payment record for COD
        const payment = new Payment({
            userId: req.user._id,
            bookingId: booking._id,
            amount: booking.totalAmount,
            paymentStatus: 'pending',
            paymentMethod: 'COD'
        });
        await payment.save();

        // Update booking status
        booking.status = 'confirmed';
        await booking.save();

        // Update hotel's available rooms
        const hotel = await Hotel.findById(booking.hotelId);
        if (hotel) {
            hotel.availableRooms = Math.max(0, hotel.availableRooms - booking.numberOfRooms);
            await hotel.save();
        }

        req.flash('success', 'Booking confirmed successfully! Please pay at the hotel during check-in.');
        res.redirect('/bookings');
    } catch (error) {
        console.error('Error confirming COD booking:', error);
        req.flash('error', 'Could not confirm booking. Please try again.');
        res.redirect('/bookings');
    }
};

// Commented out Razorpay related functions for now
/*
module.exports.createOrder = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.bookingId);
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        const options = {
            amount: Math.round(booking.totalAmount * 100),
            currency: 'INR',
            receipt: booking._id.toString(),
            payment_capture: 1
        };

        const order = await razorpay.orders.create(options);
        
        res.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            key: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Could not create order. Please try again.' });
    }
};

module.exports.verifyPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        const isAuthentic = expectedSignature === razorpay_signature;

        if (!isAuthentic) {
            return res.status(400).json({ error: 'Payment verification failed' });
        }

        const booking = await Booking.findById(req.params.bookingId);
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        const payment = new Payment({
            userId: req.user._id,
            bookingId: booking._id,
            amount: booking.totalAmount,
            paymentStatus: 'completed',
            transactionId: razorpay_payment_id,
            orderId: razorpay_order_id
        });
        await payment.save();

        booking.status = 'confirmed';
        await booking.save();

        const hotel = await Hotel.findById(booking.hotelId);
        if (hotel) {
            hotel.availableRooms = Math.max(0, hotel.availableRooms - booking.numberOfRooms);
            await hotel.save();
        }

        res.json({ 
            success: true,
            message: 'Payment successful and booking confirmed'
        });
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ 
            error: 'Could not verify payment. Please contact support if amount was deducted.' 
        });
    }
};
*/ 