const User = require('../models/user');
const passport = require('passport');
const { userSchema } = require('../schemas');
const { ExpressError } = require('../utils/ExpressError');
const jwt = require('jsonwebtoken');
const { generateToken } = require('../middleware/auth');
const crypto = require('crypto');
const { sendVerificationEmail } = require('../utils/email');
const PendingUser = require('../models/pendingUser');

module.exports.renderRegister = (req, res) => {
    res.render('users/register');
}

module.exports.register = async (req, res) => {
    try {
        const { email, username, password } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            req.flash('error', 'Email is already registered');
            return res.redirect('/register');
        }

        // Create verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        
        // Store in pending users
        const pendingUser = new PendingUser({
            username,
            email,
            password, // Note: In production, you should hash this password
            verificationToken,
            verificationTokenExpires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
        });

        await pendingUser.save();
        
        // Send verification email
        await sendVerificationEmail(email, verificationToken);

        req.flash('success', 'Please check your email to verify your account.');
        res.redirect('/login');
    } catch (e) {
        req.flash('error', e.message);
        res.redirect('/register');
    }
};

module.exports.renderLogin = (req, res) => {
    res.render('users/login');
}

module.exports.login = (req, res) => {
    if (req.user.role === 'admin') {
        res.redirect('/admin/dashboard');
    } else {
        const redirectUrl = req.session.returnTo || '/hotels';
        delete req.session.returnTo;
        res.redirect(redirectUrl);
    }
}

module.exports.logout = (req, res, next) => {
    req.logout(function(err) {
        if (err) {
            return next(err);
        }
        // Clear JWT cookie
        res.clearCookie('jwt');
        req.flash('success', "Goodbye!");
        res.redirect('/');
    });
}

module.exports.renderProfile = (req, res) => {
    res.render('users/profile', { user: req.user });
}

module.exports.renderEditProfile = (req, res) => {
    res.render('users/editProfile', { user: req.user });
}

module.exports.updateProfile = async (req, res) => {
    const { username, email, phone } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { username, email, phone }, { new: true });
    
    // Update the session with the new user information
    req.login(user, (err) => {
        if (err) {
            req.flash('error', 'There was an issue updating your session');
            return res.redirect('/profile');
        }
        req.flash('success', 'Profile updated successfully!');
        res.redirect('/hotels');
    });
}

module.exports.showProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate({
                path: 'bookings',
                populate: {
                    path: 'hotelId',
                    model: 'Hotel'
                }
            });
        res.render('users/profile', { user });
    } catch (e) {
        req.flash('error', 'Error loading profile');
        res.redirect('/');
    }
};

// Add verification endpoint
module.exports.verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;
        
        // Find pending user
        const pendingUser = await PendingUser.findOne({
            verificationToken: token,
            verificationTokenExpires: { $gt: Date.now() }
        });

        if (!pendingUser) {
            req.flash('error', 'Verification link is invalid or has expired');
            return res.redirect('/register');
        }

        // Create actual user
        const user = new User({
            username: pendingUser.username,
            email: pendingUser.email,
            isVerified: true
        });

        // Register user with passport
        await User.register(user, pendingUser.password);
        
        // Delete pending user
        await PendingUser.findByIdAndDelete(pendingUser._id);

        req.flash('success', 'Email verified successfully! You can now login.');
        res.redirect('/login');
    } catch (e) {
        req.flash('error', 'Something went wrong during verification');
        res.redirect('/register');
    }
};

module.exports.resendVerification = async (req, res) => {
    try {
        const { email } = req.body;
        
        // Check pending verifications
        const pendingUser = await PendingUser.findOne({ email });
        
        if (!pendingUser) {
            req.flash('error', 'No pending verification found for this email');
            return res.redirect('/login');
        }

        // Create new verification token
        pendingUser.verificationToken = crypto.randomBytes(32).toString('hex');
        pendingUser.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
        await pendingUser.save();

        // Resend verification email
        await sendVerificationEmail(email, pendingUser.verificationToken);

        req.flash('success', 'Verification email has been resent');
        res.redirect('/login');
    } catch (e) {
        req.flash('error', 'Failed to resend verification email');
        res.redirect('/login');
    }
}; 