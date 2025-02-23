const mongoose = require('mongoose');
const Review = require('./review');
const Schema = mongoose.Schema;

const hotelSchema = new Schema({
    name: String,
    location: String,
    price: Number,
    description: String,
    amenities: [String],
    availableRooms: Number,
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reviews: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Review'
        }
    ],
    rooms: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Room'
        }
    ]
});

hotelSchema.post('findOneAndDelete', async function (doc) {
    if (doc) {
        await Review.deleteMany({
            _id: {
                $in: doc.reviews
            }
        });
    }
});

module.exports = mongoose.model('Hotel', hotelSchema); 