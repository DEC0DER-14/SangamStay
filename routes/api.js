const express = require('express');
const router = express.Router();
const { generateToken } = require('../middleware/auth');
const passport = require('passport');
const User = require('../models/user');

router.post('/login', passport.authenticate('local'), (req, res) => {
    const token = generateToken(req.user);
    res.json({ token });
});

router.post('/register', async (req, res) => {
    try {
        const { email, username, password, phone } = req.body;
        const user = new User({ email, username, phone, role: 'user' });
        const registeredUser = await User.register(user, password);
        const token = generateToken(registeredUser);
        res.json({ token });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

module.exports = router; 