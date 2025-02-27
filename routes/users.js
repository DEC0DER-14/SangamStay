const express = require('express');
const router = express.Router();
const passport = require('passport');
const catchAsync = require('../utils/catchAsync');
const users = require('../controllers/users');
const { isLoggedIn, isVerified, checkVerificationToken } = require('../middleware');
const User = require('../models/user');

// Add Google OAuth routes
router.get('/auth/google',
    (req, res, next) => {
        // Store the returnTo path in session
        req.session.returnTo = req.query.returnTo || '/hotels';
        next();
    },
    passport.authenticate('google', { 
        scope: ['profile', 'email'],
        prompt: 'select_account'
    })
);

router.get('/auth/google/callback',
    passport.authenticate('google', { 
        failureRedirect: '/login',
        failureFlash: true,
        keepSessionInfo: true
    }),
    (req, res) => {
        // Manual login to ensure session is created
        req.login(req.user, (err) => {
            if (err) {
                console.error('Login error:', err);
                req.flash('error', 'Failed to login after Google authentication');
                return res.redirect('/login');
            }
            
            // Log successful authentication
            console.log('Successfully authenticated user:', req.user.email);
            
            // Successful authentication
            const redirectTo = req.session.returnTo || '/hotels';
            delete req.session.returnTo;
            
            // Save session before redirect
            req.session.save((err) => {
                if (err) {
                    console.error('Session save error:', err);
                    req.flash('error', 'Failed to save session');
                    return res.redirect('/login');
                }
                req.flash('success', 'Welcome to SangamStay!');
                res.redirect(redirectTo);
            });
        });
    }
);

// Add route for setting password after Google login
router.route('/set-password')
    .get(isLoggedIn, (req, res) => {
        if (req.user.hasPassword) {
            req.flash('error', 'You already have a password set');
            return res.redirect('/profile');
        }
        res.render('users/set-password');
    })
    .post(isLoggedIn, catchAsync(async (req, res) => {
        if (req.user.hasPassword) {
            req.flash('error', 'You already have a password set');
            return res.redirect('/profile');
        }
        const { password } = req.body;
        const user = await User.findById(req.user._id);
        await user.setPassword(password);
        user.hasPassword = true;
        await user.save();
        req.flash('success', 'Password set successfully');
        res.redirect('/profile');
    }));

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