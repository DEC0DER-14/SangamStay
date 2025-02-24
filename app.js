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

// Session configuration with secure settings
const sessionConfig = {
    secret: process.env.SESSION_SECRET,
    name: 'session', // default is 'connect.sid'
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // Only send cookies over HTTPS in production
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7,
        sameSite: 'strict'
    }
};

app.use(session(sessionConfig));
app.use(flash());

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
        }
    },
    crossOriginEmbedderPolicy: false
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));
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

// Routes
app.use('/hotels', hotelRoutes);
app.use('/hotels/:id/reviews', reviewRoutes);
app.use('/', userRoutes);
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);

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