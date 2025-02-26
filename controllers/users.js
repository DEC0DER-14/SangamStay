const User = require('../models/user');
const passport = require('passport');
const { userSchema } = require('../schemas');
const { ExpressError } = require('../utils/ExpressError');
const jwt = require('jsonwebtoken');
const { generateToken } = require('../middleware/auth');

module.exports.renderRegister = (req, res) => {
    res.render('users/register');
}

module.exports.register = async (req, res, next) => {
    try {
        const { error } = userSchema.validate(req.body);
        if (error) {
            throw new ExpressError(error.message, 400);
        }
        
        const { email, username, password, phone } = req.body;
        const user = new User({ email, username, phone, role: 'user' });
        const registeredUser = await User.register(user, password);
        
        // Generate JWT token
        const token = generateToken(registeredUser);
        res.cookie('jwt', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        req.login(registeredUser, err => {
            if (err) return next(err);
            req.flash('success', 'Welcome to SangamStay!');
            res.redirect('/hotels');
        });
    } catch (e) {
        req.flash('error', e.message);
        res.redirect('register');
    }
}

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