const express = require('express');
const router = express.Router();
const passport = require('passport');
const catchAsync = require('../utils/catchAsync');
const users = require('../controllers/users');
const { isLoggedIn } = require('../middleware');
const User = require('../models/user');

router.route('/register')
    .get(users.renderRegister)
    .post(catchAsync(users.register));

router.route('/login')
    .get(users.renderLogin)
    .post(passport.authenticate('local', { 
        failureFlash: true, 
        failureRedirect: '/login',
        keepSessionInfo: true 
    }), users.login);

router.get('/logout', users.logout);

router.get('/profile', isLoggedIn, users.renderProfile);
router.get('/profile/edit', isLoggedIn, users.renderEditProfile);
router.post('/profile', isLoggedIn, catchAsync(users.updateProfile));

// Add this route for creating an admin (should be protected in production)
router.post('/create-admin', catchAsync(async (req, res) => {
    const { username, email, password, phone } = req.body;
    const user = new User({ username, email, phone, role: 'admin' });
    const registeredUser = await User.register(user, password);
    req.flash('success', 'Successfully created admin account');
    res.redirect('/hotels');
}));

module.exports = router; 