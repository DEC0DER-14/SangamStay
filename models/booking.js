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
        min: 1,
        validate: {
            validator: function(value) {
                return value <= (this.numberOfRooms * 2);
            },
            message: props => `Number of guests (${props.value}) exceeds maximum capacity (${props.value} guests for ${Math.ceil(props.value/2)} rooms). Maximum 2 guests per room allowed.`
        }
    },
    guestDetails: {
        name: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true
        }
    },
    specialRequests: String,
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled', 'completed'],
        default: 'pending'
    },
    isCheckedOut: {
        type: Boolean,
        default: false
    },
    actualCheckOutTime: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Add a pre-save hook to validate number of guests
bookingSchema.pre('save', function(next) {
    if (this.numberOfGuests > this.numberOfRooms * 2) {
        next(new Error(`Maximum 2 guests per room allowed. You have selected ${this.numberOfGuests} guests for ${this.numberOfRooms} rooms.`));
    }
    next();
});

module.exports = mongoose.model('Booking', bookingSchema); 