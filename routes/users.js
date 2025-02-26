const express = require('express');
const router = express.Router();
const passport = require('passport');
const catchAsync = require('../utils/catchAsync');
const users = require('../controllers/users');
const { isLoggedIn, isVerified, checkVerificationToken } = require('../middleware');
const User = require('../models/user');

router.route('/register')
    .get(users.renderRegister)
    .post(catchAsync(users.register));

router.route('/login')
    .get((req, res) => {
        if (req.isAuthenticated()) {
            return res.redirect('/hotels');
        }
        res.render('users/login');
    })
    .post(passport.authenticate('local', { 
        failureFlash: true, 
        failureRedirect: '/login',
        keepSessionInfo: true 
    }), isVerified, users.login);

router.get('/logout', users.logout);

router.get('/profile', isLoggedIn, users.showProfile);
router.get('/profile/edit', isLoggedIn, users.renderEditProfile);
router.put('/profile', isLoggedIn, catchAsync(users.updateProfile));

// Add these new routes for password change
router.get('/change-password', isLoggedIn, users.renderChangePassword);
router.post('/change-password', isLoggedIn, catchAsync(users.changePassword));

// Add this route for creating an admin (should be protected in production)
router.post('/create-admin', catchAsync(async (req, res) => {
    const { username, email, password, phone } = req.body;
    const user = new User({ username, email, phone, role: 'admin' });
    const registeredUser = await User.register(user, password);
    req.flash('success', 'Successfully created admin account');
    res.redirect('/hotels');
}));

router.get('/verify-email/:token', checkVerificationToken, users.verifyEmail);

router.route('/forgot-password')
    .get(users.renderForgotPassword)
    .post(catchAsync(users.forgotPassword));

router.route('/reset-password/:token')
    .get(catchAsync(users.renderResetPassword))
    .post(catchAsync(users.resetPassword));

module.exports = router; 