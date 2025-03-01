const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const paymentSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    bookingId: {
        type: Schema.Types.ObjectId,
        ref: 'Booking'
    },
    amount: Number,
    paymentStatus: String,
    paymentMethod: {
        type: String,
        enum: ['COD', 'online'],
        default: 'COD'
    },
    transactionId: String,
    orderId: String
});

module.exports = mongoose.model('Payment', paymentSchema); 