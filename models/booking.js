const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const bookingSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    hotelId: {
        type: Schema.Types.ObjectId,
        ref: 'Hotel',
        required: true
    },
    roomId: {
        type: Schema.Types.ObjectId,
        ref: 'Room',
        required: true
    },
    checkInDate: {
        type: Date,
        required: true
    },
    checkOutDate: {
        type: Date,
        required: true
    },
    checkInTime: {
        type: String,
        required: true,
        default: '14:00' // Standard check-in time
    },
    checkOutTime: {
        type: String,
        required: true,
        default: '11:00' // Standard check-out time
    },
    numberOfNights: {
        type: Number,
        required: true,
        min: 1
    },
    numberOfRooms: {
        type: Number,
        required: true,
        min: 1
    },
    numberOfGuests: {
        type: Number,
        required: true,
        min: 1
    },
    guestDetails: {
        name: String,
        email: String,
        phone: String
    },
    specialRequests: String,
    totalAmount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Booking', bookingSchema); 