const mongoose = require('mongoose');
const Review = require('./review');
const Schema = mongoose.Schema;

const hotelSchema = new Schema({
    name: String,
    location: String,
    price: Number,
    amenities: [String],
    availableRooms: Number,
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    reviews: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Review'
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