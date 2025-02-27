const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    scope: ['profile', 'email']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Check if user already exists with Google ID
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
            return done(null, user);
        }

        // Check if user exists with same email
        user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
            // Link Google account to existing user
            user.googleId = profile.id;
            user.isVerified = true;
            if (!user.displayName) user.displayName = profile.displayName;
            if (!user.firstName) user.firstName = profile.name.givenName;
            if (!user.lastName) user.lastName = profile.name.familyName;
            if (!user.profilePicture) user.profilePicture = profile.photos[0].value;
            await user.save();
            return done(null, user);
        }

        // Create new user with both username and email set to Google email
        const newUser = new User({
            email: profile.emails[0].value,
            username: profile.emails[0].value, // Set username same as email
            googleId: profile.id,
            displayName: profile.displayName,
            firstName: profile.name.givenName,
            lastName: profile.name.familyName,
            profilePicture: profile.photos[0].value,
            isVerified: true
        });

        // Save the user
        await newUser.save();
        return done(null, newUser);
    } catch (err) {
        return done(err, null);
    }
}));

// Serialize user for the session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
}); 