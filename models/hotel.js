const mongoose = require('mongoose');
const Review = require('./review');

const hotelSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    pincode: {
        type: String,
        required: true,
        minlength: 6,
        maxlength: 6,
        match: /^[0-9]{6}$/
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    description: {
        type: String
    },
    availableRooms: {
        type: Number,
        required: true,
        min: 0,
        default: 10
    },
    facilities: [{
        type: String,
        enum: ['AC Rooms', 'Free WiFi', 'Parking Facility', 'Elevator', 'Food Services (Chargeable)', 'Daily House Keeping']
    }],
    reviews: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Review'
        }
    ],
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
});

// Middleware to delete all reviews when a hotel is deleted
hotelSchema.post('findOneAndDelete', async function(doc) {
    if(doc) {
        await Review.deleteMany({
            _id: {
                $in: doc.reviews
            }
        });
    }
});

module.exports = mongoose.model('Hotel', hotelSchema); 