const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
    }
});

module.exports.sendVerificationEmail = async (email, token) => {
    try {
        const verificationLink = `${process.env.BASE_URL}/verify-email/${token}`;
        
        const mailOptions = {
            from: `"SangamStay" <${process.env.EMAIL_USERNAME}>`,
            to: email,
            subject: 'Verify your SangamStay account',
            html: `
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
                    <h2 style="color: #3498db; text-align: center;">Welcome to SangamStay!</h2>
                    <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${verificationLink}" 
                           style="background-color: #3498db; color: white; padding: 12px 30px; 
                                  text-decoration: none; border-radius: 5px; font-weight: bold;">
                            Verify Email
                        </a>
                    </div>
                    <p style="color: #666; font-size: 14px;">
                        If you didn't create an account, you can safely ignore this email.
                    </p>
                    <p style="color: #666; font-size: 14px;">
                        This verification link will expire in 24 hours.
                    </p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Email sending failed:', error);
        throw new Error('Failed to send verification email');
    }
}; 