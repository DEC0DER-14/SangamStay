const { hotelSchema } = require('./schemas');
const ExpressError = require('./utils/ExpressError');
const Hotel = require('./models/hotel');
const Review = require('./models/review');
const { reviewSchema } = require('./schemas');
const rateLimit = require('express-rate-limit');
const { requireJWT } = require('./middleware/auth');

module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated() && !req.jwtUser) {
        req.session.returnTo = req.originalUrl;
        req.flash('error', 'You must be signed in first!');
        return res.redirect('/login');
    }
    next();
};

module.exports.validateHotel = (req, res, next) => {
    const { error } = hotelSchema.validate(req.body);
    if (error) {
        throw new ExpressError(error.message, 400);
    }
    next();
};

module.exports.isAuthor = async (req, res, next) => {
    const { id } = req.params;
    const hotel = await Hotel.findById(id);
    const user = req.user || req.jwtUser;
    if (!hotel.author.equals(user._id) && user.role !== 'admin') {
        req.flash('error', 'You do not have permission to do that!');
        return res.redirect(`/hotels/${id}`);
    }
    next();
};

module.exports.storeReturnTo = (req, res, next) => {
    if (req.session.returnTo) {
        res.locals.returnTo = req.session.returnTo;
    }
    next();
};

module.exports.validateReview = (req, res, next) => {
    const { error } = reviewSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(el => el.message).join(',');
        throw new ExpressError(msg, 400);
    } else {
        next();
    }
};

module.exports.isReviewAuthor = async (req, res, next) => {
    const { id, reviewId } = req.params;
    const review = await Review.findById(reviewId);
    if (!review.author.equals(req.user._id)) {
        req.flash('error', 'You do not have permission to do that!');
        return res.redirect(`/hotels/${id}`);
    }
    next();
};

module.exports.isAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        req.flash('error', 'You do not have permission to do that!');
        return res.redirect('/hotels');
    }
    next();
};

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

module.exports.apiLimiter = limiter; 