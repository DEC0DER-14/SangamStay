const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const locationSchema = new Schema({
    hotelId: {
        type: Schema.Types.ObjectId,
        ref: 'Hotel'
    },
    nearbyLocations: [String]
});

module.exports = mongoose.model('Location', locationSchema); 