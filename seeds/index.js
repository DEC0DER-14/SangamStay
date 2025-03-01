const mongoose = require('mongoose');
const Hotel = require('../models/hotel');
const User = require('../models/user');

if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        seedDB().then(() => {
            mongoose.connection.close();
        });
    })
    .catch(err => {
        console.error("MongoDB Connection Error:", err.message);
        process.exit(1);
    });

const sampleHotels = [
    {
        name: "The Taj Palace",
        location: "Mumbai, Maharashtra",
        price: 15000,
        description: "Experience luxury at its finest in the heart of Mumbai. The Taj Palace offers spectacular sea views, world-class amenities, and the legendary Taj hospitality.",
        pincode: "400001",
        availableRooms: 20,
        totalRooms: 20,
        facilities: ['AC Rooms', 'Free WiFi', 'Parking Facility', 'Elevator', 'Food Services (Chargeable)']
    },
    {
        name: "The Oberoi Udaivilas",
        location: "Udaipur, Rajasthan",
        price: 35000,
        description: "Set on the banks of Lake Pichola, this luxury palace hotel offers stunning views of the City Palace and the Aravalli Hills. Experience royal Rajasthani hospitality.",
        pincode: "313001",
        availableRooms: 20,
        totalRooms: 20,
        facilities: ['AC Rooms', 'Free WiFi', 'Parking Facility', 'Elevator', 'Food Services (Chargeable)']
    },
    {
        name: "Wildflower Hall",
        location: "Shimla, Himachal Pradesh",
        price: 25000,
        description: "A luxury mountain resort set in 23 acres of virgin woods, offering spectacular views of the Himalayas. Perfect for nature lovers and adventure enthusiasts.",
        pincode: "171005",
        availableRooms: 20,
        totalRooms: 20,
        facilities: ['AC Rooms', 'Free WiFi', 'Parking Facility', 'Food Services (Chargeable)']
    },
    {
        name: "Coconut Lagoon",
        location: "Kumarakom, Kerala",
        price: 18000,
        description: "Traditional Kerala architecture meets modern luxury in this backwater resort. Experience the tranquility of Kerala's famous backwaters and Ayurvedic treatments.",
        pincode: "686563",
        availableRooms: 20,
        totalRooms: 20,
        facilities: ['AC Rooms', 'Free WiFi', 'Parking Facility', 'Food Services (Chargeable)']
    },
    {
        name: "The Leela Palace",
        location: "Bengaluru, Karnataka",
        price: 22000,
        description: "A modern palace hotel combining old-world elegance with contemporary luxury. Located in the heart of Bangalore's business district.",
        pincode: "560008",
        availableRooms: 20,
        totalRooms: 20,
        facilities: ['AC Rooms', 'Free WiFi', 'Parking Facility', 'Elevator', 'Food Services (Chargeable)']
    }
];

const seedDB = async () => {
    try {
        // Delete existing data
        await Hotel.deleteMany({});

        // Create an admin user if it doesn't exist
        let adminUser = await User.findOne({ role: 'admin' });
        if (!adminUser) {
            adminUser = await User.register(new User({
                username: 'admin',
                email: 'admin@example.com',
                role: 'admin'
            }), 'adminpassword');
        }

        // Add hotels
        for (let hotelData of sampleHotels) {
            const hotel = new Hotel({
                ...hotelData,
                author: adminUser._id
            });
            await hotel.save();
        }

        console.log("Database seeded successfully!");
    } catch (err) {
        console.error("Database seeding failed:", err.message);
        process.exit(1);
    }
}; 