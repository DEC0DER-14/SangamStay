const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const roomSchema = new Schema({
    hotelId: {
        type: Schema.Types.ObjectId,
        ref: 'Hotel'
    },
    roomType: String,
    capacity: Number,
    pricePerNight: Number
});

module.exports = mongoose.model('Room', roomSchema); 