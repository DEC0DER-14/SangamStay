const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user');

// Function to generate a unique username
async function generateUniqueUsername(baseUsername) {
    try {
        // Always ensure we have a base username
        if (!baseUsername || baseUsername.trim() === '') {
            baseUsername = 'user' + Date.now().toString().slice(-6);
        }
        
        // Remove any special characters and spaces
        baseUsername = baseUsername.replace(/[^a-zA-Z0-9]/g, '');
        
        // Ensure minimum length
        if (baseUsername.length < 4) {
            baseUsername = 'user' + baseUsername;
        }
        
        let username = baseUsername;
        let counter = 1;
        
        while (true) {
            try {
                // Check if username exists
                const existingUser = await User.findOne({ username });
                if (!existingUser) {
                    return username;
                }
                // If username exists, append counter and try again
                username = `${baseUsername}${counter}`;
                counter++;
            } catch (error) {
                // If there's an error, generate a timestamp-based username
                return 'user' + Date.now().toString().slice(-6);
            }
        }
    } catch (error) {
        // Fallback username with timestamp
        return 'user' + Date.now().toString().slice(-6);
    }
}

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
            // Ensure existing user has a username
            if (!user.username) {
                user.username = await generateUniqueUsername(profile.displayName || profile.emails[0].value.split('@')[0]);
                await user.save();
            }
            return done(null, user);
        }

        // Check if user exists with same email
        user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
            // Link Google account to existing user and ensure username exists
            user.googleId = profile.id;
            user.isVerified = true;
            if (!user.username) {
                user.username = await generateUniqueUsername(profile.displayName || profile.emails[0].value.split('@')[0]);
            }
            if (!user.displayName) user.displayName = profile.displayName;
            if (!user.firstName) user.firstName = profile.name.givenName;
            if (!user.lastName) user.lastName = profile.name.familyName;
            if (!user.profilePicture) user.profilePicture = profile.photos[0].value;
            await user.save();
            return done(null, user);
        }

        // Generate a unique username based on display name or email prefix
        let baseUsername = profile.displayName ? 
            profile.displayName.toLowerCase().replace(/\s+/g, '') : 
            profile.emails[0].value.split('@')[0];
        
        const uniqueUsername = await generateUniqueUsername(baseUsername);

        // Create new user with unique username
        const newUser = new User({
            email: profile.emails[0].value,
            username: uniqueUsername, // This will never be null now
            googleId: profile.id,
            displayName: profile.displayName || uniqueUsername,
            firstName: profile.name.givenName,
            lastName: profile.name.familyName,
            profilePicture: profile.photos[0].value,
            isVerified: true
        });

        // Save the user
        await newUser.save();
        return done(null, newUser);
    } catch (err) {
        console.error('Google Strategy Error:', err);
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