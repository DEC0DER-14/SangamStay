const nodemailer = require('nodemailer');

// Create a transporter using Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Verify the transporter configuration
transporter.verify(function(error, success) {
    if (error) {
        console.log('Error verifying email transporter:', error);
    } else {
        console.log('Email transporter is ready to send messages');
    }
});

module.exports = transporter; 