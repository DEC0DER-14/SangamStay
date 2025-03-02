const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');

const UserSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    username: {
        type: String,
        required: true,
        unique: true
    },
    phone: {
        type: String
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    bookings: [{
        type: Schema.Types.ObjectId,
        ref: 'Booking'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationToken: String,
    verificationTokenExpires: Date,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    googleId: String,
    displayName: String,
    firstName: String,
    lastName: String,
    profilePicture: String,
    hasPassword: {
        type: Boolean,
        default: false
    }
});

// Configure passport-local-mongoose
UserSchema.plugin(passportLocalMongoose, {
    usernameField: 'email',
    errorMessages: {
        UserExistsError: 'A user with the given email is already registered',
        IncorrectPasswordError: 'Password is incorrect',
        IncorrectUsernameError: 'Email is not registered',
        MissingPasswordError: 'No password was given',
        MissingUsernameError: 'No email was given',
        AttemptTooSoonError: 'Account is currently locked. Try again later',
        TooManyAttemptsError: 'Account locked due to too many failed login attempts'
    },
    limitAttempts: true,
    maxAttempts: 5,
    unlockInterval: 2 * 60 * 60 * 1000, // 2 hours
    selectFields: '+email +createdAt +role +isVerified +hasPassword'
});

module.exports = mongoose.model('User', UserSchema); 