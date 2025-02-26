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
            password,
            verificationToken,
            verificationTokenExpires: Date.now() + 24 * 60 * 60 * 1000
        });

        await pendingUser.save();
        
        // Send verification email
        await sendVerificationEmail(email, verificationToken);

        req.flash('success', 'Please verify your email to sign in');
        res.redirect('/login');
    } catch (e) {
        req.flash('error', e.message);
        res.redirect('/register');
    }
};

module.exports.renderLogin = (req, res) => {
    res.render('users/login', { 
        pendingVerificationEmail: req.session.pendingVerificationEmail 
    });
}

module.exports.login = (req, res) => {
    req.flash('success', 'Welcome back!');
    const redirectUrl = req.session.returnTo || '/hotels';
    delete req.session.returnTo;
    
    // Clear browser history and redirect
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    if (req.user.role === 'admin') {
        return res.redirect('/admin/dashboard');
    } else {
        return res.redirect(redirectUrl);
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

        console.log('Creating new verified user:', user);

        // Register user with passport
        const registeredUser = await User.register(user, pendingUser.password);
        console.log('Registered user verification status:', registeredUser.isVerified);
        
        // Double-check verification status
        const savedUser = await User.findById(registeredUser._id);
        console.log('Saved user verification status:', savedUser.isVerified);
        
        // Delete pending user
        await PendingUser.findByIdAndDelete(pendingUser._id);

        req.flash('success', 'Email verified successfully! You can now login.');
        res.redirect('/login');
        
    } catch (e) {
        console.error('Verification error:', e);
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
            return res.status(404).json({ message: 'No pending verification found for this email' });
        }

        // Create new verification token
        pendingUser.verificationToken = crypto.randomBytes(32).toString('hex');
        pendingUser.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
        await pendingUser.save();

        // Resend verification email
        await sendVerificationEmail(email, pendingUser.verificationToken);

        res.status(200).json({ message: 'Verification email has been resent' });
    } catch (e) {
        res.status(500).json({ message: 'Failed to resend verification email' });
    }
}; 