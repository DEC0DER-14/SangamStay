const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const pendingUserSchema = new Schema({
    username: String,
    email: String,
    password: String,
    verificationToken: String,
    verificationTokenExpires: Date,
    createdAt: { 
        type: Date, 
        default: Date.now,
        expires: 86400 // Document will be automatically deleted after 24 hours
    }
});

module.exports = mongoose.model('PendingUser', pendingUserSchema); 