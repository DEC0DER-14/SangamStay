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
    name: 'session', // default is 'connect.sid'
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        // Only use secure cookies in production
        secure: false, // Set to true in production
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7,
        sameSite: 'lax' // Changed from strict to lax for OAuth
    }
};

app.use(session(sessionConfig));
app.use(flash());

// Update CSP for Google OAuth
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'", "https:", "http:", "data:", "blob:"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://accounts.google.com", "https://apis.google.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:", "http:", "blob:"],
            connectSrc: ["'self'", "https://accounts.google.com", "https://www.googleapis.com"],
            frameSrc: ["'self'", "https://accounts.google.com", "https://apis.google.com"],
            formAction: ["'self'", "https://accounts.google.com"],
            objectSrc: ["'none'"],
        }
    },
    crossOriginEmbedderPolicy: false
}));

app.use(passport.initialize());
app.use(passport.session());

// Custom Local Strategy to handle both username and email
passport.use(new localStrategy({
    usernameField: 'username', // this is the name of the form field
    passwordField: 'password'
}, async (username, password, done) => {
    try {
        // Try to find user by username or email
        const user = await User.findOne({
            $or: [
                { username: username },
                { email: username }
            ]
        });
        
        if (!user) {
            return done(null, false, { message: 'Incorrect username/email or password' });
        }

        // Use the passport-local-mongoose authenticate method
        const isValid = await user.authenticate(password);
        
        if (!isValid) {
            return done(null, false, { message: 'Incorrect username/email or password' });
        }

        return done(null, user);
    } catch (err) {
        return done(err);
    }
}));

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

// Routes
app.use('/hotels', hotelRoutes);
app.use('/hotels/:id/reviews', reviewRoutes);
app.use('/', userRoutes);
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);
app.use('/bookings', bookingRoutes);

app.get("/", (req, res) => {
    res.render("home");
});

app.all("*", (req, res, next) => {
    next(new ExpressError("Page not found", 404));
});

// Error handler
app.use((err, req, res, next) => {
    const { statusCode = 500, message = "Something went wrong" } = err;
    if (!err.message) err.message = "Oh No, Something Went Wrong!";
    res.status(statusCode).render("error", { err });
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Serving on port ${port}`);
    if (process.env.NODE_ENV !== 'production') {
        open(`http://localhost:${port}`);
    }
}); 