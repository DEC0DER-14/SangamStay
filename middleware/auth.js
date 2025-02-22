const jwt = require('jsonwebtoken');
const User = require('../models/user');

exports.generateToken = (user) => {
    return jwt.sign(
        { id: user._id, username: user.username, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );
};

exports.verifyToken = async (req, res, next) => {
    try {
        const token = req.cookies.jwt || req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return next();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        
        if (!user) {
            return next();
        }

        req.jwtUser = user;
        next();
    } catch (error) {
        next();
    }
};

exports.requireJWT = async (req, res, next) => {
    try {
        const token = req.cookies.jwt || req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            req.flash('error', 'Please log in to continue');
            return res.redirect('/login');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        
        if (!user) {
            req.flash('error', 'User no longer exists');
            return res.redirect('/login');
        }

        req.jwtUser = user;
        next();
    } catch (error) {
        req.flash('error', 'Invalid token. Please log in again');
        res.redirect('/login');
    }
}; 