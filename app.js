if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

const express = require("express");
const path = require("path");
const ejsMate = require("ejs-mate");
const methodOverride = require("method-override");
const session = require("express-session");
const mongoose = require("mongoose");
const flash = require("connect-flash");
const passport = require("passport");
const localStrategy = require("passport-local");
const User = require("./models/user");
const ExpressError = require('./utils/ExpressError');
const hotelRoutes = require('./routes/hotels');
const userRoutes = require('./routes/users');
const reviewRoutes = require('./routes/reviews');
const { verifyToken } = require('./middleware/auth');
const cookieParser = require('cookie-parser');
const apiRoutes = require('./routes/api');
const open = require('open').default;
const helmet = require('helmet');
const Room = require('./models/room');
const adminRoutes = require('./routes/admin');
const bookingRoutes = require('./routes/bookings');
const paymentRoutes = require('./routes/payment');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const logger = require('./utils/logger');
const fs = require('fs');

// Create logs directory if it doesn't exist
if (!fs.existsSync('logs')) {
    fs.mkdirSync('logs');
}

// Create a write stream for Morgan access logs
const accessLogStream = fs.createWriteStream(
    path.join(__dirname, 'logs/access.log'),
    { flags: 'a' }
);

// Configure rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Import Google OAuth configuration
require('./config/passport-google');

// Connect to MongoDB using environment variable
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("Connected to MongoDB");
    })
    .catch((err) => {
        console.log("Error connecting to MongoDB", err);
    });

const app = express();

// Setup Morgan logger
if (process.env.NODE_ENV === 'production') {
    app.use(morgan('combined', { stream: accessLogStream }));
} else {
    app.use(morgan('dev'));
}

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Session configuration with secure settings
const sessionConfig = {
    secret: process.env.SESSION_SECRET,
    name: 'session',
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Only use secure in production
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7,
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
    }
};

app.use(session(sessionConfig));
app.use(flash());

// Update CSP for Google OAuth and Razorpay
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                "'unsafe-eval'",
                "https://checkout.razorpay.com",
                "https://*.razorpay.com",
                "https://cdn.jsdelivr.net",
                "https://accounts.google.com",
                "https://apis.google.com"
            ],
            connectSrc: [
                "'self'",
                "https://api.razorpay.com",
                "https://*.razorpay.com",
                "https://accounts.google.com",
                "https://www.googleapis.com"
            ],
            frameSrc: [
                "'self'",
                "https://api.razorpay.com",
                "https://*.razorpay.com",
                "https://accounts.google.com",
                "https://apis.google.com"
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://cdn.jsdelivr.net",
                "https://fonts.googleapis.com",
                "https://cdnjs.cloudflare.com"
            ],
            fontSrc: [
                "'self'",
                "https://fonts.gstatic.com",
                "https://cdnjs.cloudflare.com"
            ],
            imgSrc: [
                "'self'",
                "data:",
                "https:",
                "http:",
                "blob:"
            ],
            formAction: ["'self'", "https://accounts.google.com"],
            objectSrc: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

app.use(passport.initialize());
app.use(passport.session());

// Custom Local Strategy to handle both username and email
passport.use(new localStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, async (email, password, done) => {
    try {
        // Find user by email only
        const user = await User.findOne({ email });
        
        if (!user) {
            return done(null, false, { message: 'Invalid email or password' });
        }

        // Use the authenticate method properly
        const { user: authenticatedUser } = await user.authenticate(password);
        
        if (!authenticatedUser) {
            return done(null, false, { message: 'Invalid email or password' });
        }
        
        return done(null, user);
    } catch (err) {
        return done(err);
    }
}));

// Add serialization
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
});

// Add cookie parser middleware
app.use(cookieParser());

// Add JWT verification middleware
app.use(verifyToken);

// Apply rate limiting to all routes
app.use(limiter);

// Routes
app.use('/hotels', hotelRoutes);
app.use('/hotels/:id/reviews', reviewRoutes);
app.use('/', userRoutes);
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);
app.use('/bookings', bookingRoutes);
app.use('/payment', paymentRoutes);

app.get("/", (req, res) => {
    res.render("home");
});

app.all("*", (req, res, next) => {
    next(new ExpressError("Page not found", 404));
});

// Error handler
app.use((err, req, res, next) => {
    const { statusCode = 500, message = "Something went wrong" } = err;
    
    // Log error details
    logger.error('Error:', {
        statusCode,
        message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip
    });

    if (!err.message) err.message = "Oh No, Something Went Wrong!";
    res.status(statusCode).render("error", { err });
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    logger.info(`Server started on port ${port} in ${process.env.NODE_ENV || 'development'} mode`);
    if (process.env.NODE_ENV !== 'production') {
        open(`http://localhost:${port}`);
    }
}); 