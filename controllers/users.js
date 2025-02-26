const User = require('../models/user');
const passport = require('passport');
const { userSchema } = require('../schemas');
const { ExpressError } = require('../utils/ExpressError');
const jwt = require('jsonwebtoken');
const { generateToken } = require('../middleware/auth');
const crypto = require('crypto');
const { sendVerificationEmail } = require('../utils/email');
const PendingUser = require('../models/pendingUser');
const transporter = require('../utils/emailTransporter');

module.exports.renderRegister = (req, res) => {
    res.render('users/register');
}

module.exports.register = async (req, res) => {
    try {
        const { email, username, password } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            req.flash('error', 'Email is already registered');
            return res.redirect('/register');
        }

        // Create verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        
        // Store in pending users
        const pendingUser = new PendingUser({
            username,
            email,
            password,
            verificationToken,
            verificationTokenExpires: Date.now() + 24 * 60 * 60 * 1000
        });

        await pendingUser.save();
        
        // Send verification email
        await sendVerificationEmail(email, verificationToken);

        req.flash('success', 'Please verify your email to sign in');
        res.redirect('/login');
    } catch (e) {
        req.flash('error', e.message);
        res.redirect('/register');
    }
};

module.exports.renderLogin = (req, res) => {
    res.render('users/login', { 
        pendingVerificationEmail: req.session.pendingVerificationEmail 
    });
}

module.exports.login = (req, res) => {
    req.flash('success', 'Welcome back!');
    const redirectUrl = req.session.returnTo || '/hotels';
    delete req.session.returnTo;
    
    // Clear browser history and redirect
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    if (req.user.role === 'admin') {
        return res.redirect('/admin/dashboard');
    } else {
        return res.redirect(redirectUrl);
    }
}

module.exports.logout = (req, res, next) => {
    req.logout(function(err) {
        if (err) {
            return next(err);
        }
        // Clear JWT cookie
        res.clearCookie('jwt');
        req.flash('success', "Goodbye!");
        res.redirect('/');
    });
}

module.exports.renderProfile = (req, res) => {
    res.render('users/profile', { user: req.user });
}

module.exports.renderEditProfile = (req, res) => {
    res.render('users/editProfile', { user: req.user });
}

module.exports.updateProfile = async (req, res) => {
    const { username, email, phone } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { username, email, phone }, { new: true });
    
    // Update the session with the new user information
    req.login(user, (err) => {
        if (err) {
            req.flash('error', 'There was an issue updating your session');
            return res.redirect('/profile');
        }
        req.flash('success', 'Profile updated successfully!');
        res.redirect('/hotels');
    });
}

module.exports.showProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate({
                path: 'bookings',
                populate: {
                    path: 'hotelId',
                    model: 'Hotel'
                }
            });
        res.render('users/profile', { user });
    } catch (e) {
        req.flash('error', 'Error loading profile');
        res.redirect('/');
    }
};

// Add verification endpoint
module.exports.verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;
        
        const pendingUser = await PendingUser.findOne({
            verificationToken: token,
            verificationTokenExpires: { $gt: Date.now() }
        });

        if (!pendingUser) {
            req.flash('error', 'Verification link is invalid or has expired');
            return res.redirect('/register');
        }

        // Create actual user
        const user = new User({
            username: pendingUser.username,
            email: pendingUser.email,
            isVerified: true
        });

        // Register user with passport
        const registeredUser = await User.register(user, pendingUser.password);
        
        // Delete pending user
        await PendingUser.findByIdAndDelete(pendingUser._id);

        req.flash('success', 'Email verified successfully! You can now login.');
        res.redirect('/login');
        
    } catch (e) {
        req.flash('error', 'Something went wrong during verification');
        res.redirect('/register');
    }
};

module.exports.resendVerification = async (req, res) => {
    try {
        const { email } = req.body;
        
        // Check pending verifications
        const pendingUser = await PendingUser.findOne({ email });
        
        if (!pendingUser) {
            return res.status(404).json({ message: 'No pending verification found for this email' });
        }

        // Create new verification token
        pendingUser.verificationToken = crypto.randomBytes(32).toString('hex');
        pendingUser.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
        await pendingUser.save();

        // Resend verification email
        await sendVerificationEmail(email, pendingUser.verificationToken);

        res.status(200).json({ message: 'Verification email has been resent' });
    } catch (e) {
        res.status(500).json({ message: 'Failed to resend verification email' });
    }
};

module.exports.renderChangePassword = (req, res) => {
    res.render('users/change-password');
}

module.exports.changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword, confirmPassword } = req.body;
        
        // Check if new password and confirm password match
        if (newPassword !== confirmPassword) {
            req.flash('error', 'New passwords do not match');
            return res.redirect('/change-password');
        }

        // Change password using passport-local-mongoose method
        const user = await User.findById(req.user._id);
        await user.changePassword(oldPassword, newPassword);
        
        // Log out of all sessions
        req.logout((err) => {
            if (err) {
                return next(err);
            }
            req.flash('success', 'Password changed successfully. Please log in with your new password');
            res.redirect('/login');
        });
    } catch (e) {
        req.flash('error', 'Current password is incorrect');
        res.redirect('/change-password');
    }
}

module.exports.renderForgotPassword = (req, res) => {
    res.render('users/forgot-password');
};

module.exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            req.flash('error', 'No account exists with that email address');
            return res.redirect('/forgot-password');
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        // Send reset email
        const resetLink = `${process.env.BASE_URL}/reset-password/${resetToken}`;
        const mailOptions = {
            from: `"SangamStay" <${process.env.EMAIL_USERNAME}>`,
            to: email,
            subject: 'Reset Your SangamStay Password',
            html: `
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
                    <h2 style="color: #3498db; text-align: center;">Reset Your Password</h2>
                    <p>You are receiving this email because you (or someone else) requested a password reset for your account.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetLink}" 
                           style="background-color: #3498db; color: white; padding: 12px 30px; 
                                  text-decoration: none; border-radius: 5px; font-weight: bold;">
                            Reset Password
                        </a>
                    </div>
                    <p style="color: #666; font-size: 14px;">
                        If you did not request this, please ignore this email and your password will remain unchanged.
                    </p>
                    <p style="color: #666; font-size: 14px;">
                        This password reset link will expire in 1 hour.
                    </p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        req.flash('success', 'An email has been sent with password reset instructions');
        res.redirect('/login');
    } catch (e) {
        req.flash('error', 'Error sending password reset email');
        res.redirect('/forgot-password');
    }
};

module.exports.renderResetPassword = async (req, res) => {
    try {
        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            req.flash('error', 'Password reset token is invalid or has expired');
            return res.redirect('/forgot-password');
        }

        res.render('users/reset-password', { token: req.params.token });
    } catch (e) {
        req.flash('error', 'Error loading reset password page');
        res.redirect('/forgot-password');
    }
};

module.exports.resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password, confirmPassword } = req.body;

        if (password !== confirmPassword) {
            req.flash('error', 'Passwords do not match');
            return res.redirect(`/reset-password/${token}`);
        }

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            req.flash('error', 'Password reset token is invalid or has expired');
            return res.redirect('/forgot-password');
        }

        // Set the new password
        await user.setPassword(password);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        req.flash('success', 'Your password has been changed successfully');
        res.redirect('/login');
    } catch (e) {
        req.flash('error', 'Error resetting password');
        res.redirect('/forgot-password');
    }
}; 