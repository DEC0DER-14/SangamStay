const User = require('../models/user');
const passport = require('passport');
const { userSchema } = require('../schemas');
const { ExpressError } = require('../utils/ExpressError');
const jwt = require('jsonwebtoken');
const { generateToken } = require('../middleware/auth');
const crypto = require('crypto');
const { sendVerificationEmail } = require('../utils/email');

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
        const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

        const user = new User({
            email,
            username,
            verificationToken,
            verificationTokenExpires,
            isVerified: false
        });

        const registeredUser = await User.register(user, password);
        
        // Send verification email
        await sendVerificationEmail(email, verificationToken);

        req.flash('success', 'Registration successful! Please check your email to verify your account.');
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
        
        const user = await User.findOne({
            verificationToken: token,
            verificationTokenExpires: { $gt: Date.now() }
        });

        if (!user) {
            req.flash('error', 'Invalid or expired verification token');
            return res.redirect('/login');
        }

        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpires = undefined;
        await user.save();

        req.flash('success', 'Email verified successfully! You can now login.');
        res.redirect('/login');
    } catch (e) {
        req.flash('error', 'Something went wrong');
        res.redirect('/login');
    }
};

module.exports.resendVerification = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email, isVerified: false });
        
        if (!user) {
            req.flash('error', 'No unverified account found with this email');
            return res.redirect('/login');
        }

        // Create new verification token
        user.verificationToken = crypto.randomBytes(32).toString('hex');
        user.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
        await user.save();

        // Send new verification email
        await sendVerificationEmail(email, user.verificationToken);

        req.flash('success', 'Verification email has been resent');
        res.redirect('/login');
    } catch (e) {
        req.flash('error', 'Failed to resend verification email');
        res.redirect('/login');
    }
}; 