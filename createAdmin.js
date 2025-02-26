if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

const mongoose = require('mongoose');
const User = require('./models/user');

const adminData = {
    username: 'arnav',
    email: 'pandeyarnav19@gmail.com',
    role: 'admin',
    isVerified: true
};

async function createAdmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: adminData.email });
        if (existingAdmin) {
            console.log('Admin user already exists!');
            process.exit(0);
        }

        // Create new admin user
        const user = new User(adminData);
        const registeredUser = await User.register(user, 'admin123'); // Replace 'admin123' with your desired password
        
        console.log('Admin user created successfully!');
        console.log('Username:', adminData.username);
        console.log('Email:', adminData.email);
        console.log('Password: admin123'); // Show the password you set
        console.log('\nPlease change the password after first login!');
    } catch (e) {
        console.error('Error creating admin:', e);
    } finally {
        await mongoose.connection.close();
    }
}

createAdmin(); 