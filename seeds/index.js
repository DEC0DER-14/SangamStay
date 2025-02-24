const mongoose = require('mongoose');
const Hotel = require('../models/hotel');
const Room = require('../models/room');
const User = require('../models/user');

if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("Database Connected for Seeding!");
    })
    .catch(err => {
        console.log("Seeding Connection Error!");
        console.log(err);
    });

const sampleHotels = [
    {
        name: "The Taj Palace",
        location: "Mumbai, Maharashtra",
        price: 15000,
        description: "Experience luxury at its finest in the heart of Mumbai. The Taj Palace offers spectacular sea views, world-class amenities, and the legendary Taj hospitality.",
        amenities: ["Swimming Pool", "Spa", "24/7 Room Service", "Restaurant", "Free Wi-Fi", "Beach Access", "Fitness Center"],
        availableRooms: 50
    },
    {
        name: "The Oberoi Udaivilas",
        location: "Udaipur, Rajasthan",
        price: 35000,
        description: "Set on the banks of Lake Pichola, this luxury palace hotel offers stunning views of the City Palace and the Aravalli Hills. Experience royal Rajasthani hospitality.",
        amenities: ["Private Pool", "Spa", "Lake View", "Fine Dining", "Butler Service", "Heritage Tours", "Yoga Classes"],
        availableRooms: 30
    },
    {
        name: "Wildflower Hall",
        location: "Shimla, Himachal Pradesh",
        price: 25000,
        description: "A luxury mountain resort set in 23 acres of virgin woods, offering spectacular views of the Himalayas. Perfect for nature lovers and adventure enthusiasts.",
        amenities: ["Mountain Views", "Spa", "Indoor Pool", "Adventure Sports", "Restaurant", "Bar", "Hiking Trails"],
        availableRooms: 25
    },
    {
        name: "Coconut Lagoon",
        location: "Kumarakom, Kerala",
        price: 18000,
        description: "Traditional Kerala architecture meets modern luxury in this backwater resort. Experience the tranquility of Kerala's famous backwaters and Ayurvedic treatments.",
        amenities: ["Backwater Views", "Ayurveda Center", "Pool", "Houseboat Tours", "Cultural Shows", "Organic Farm", "Yoga"],
        availableRooms: 40
    },
    {
        name: "The Leela Palace",
        location: "Bengaluru, Karnataka",
        price: 22000,
        description: "A modern palace hotel combining old-world elegance with contemporary luxury. Located in the heart of Bangalore's business district.",
        amenities: ["Rooftop Pool", "Spa", "Multiple Restaurants", "Business Center", "Art Gallery", "Garden", "Fitness Center"],
        availableRooms: 35
    }
];

const seedDB = async () => {
    try {
        // Delete existing data
        await Hotel.deleteMany({});
        await Room.deleteMany({});

        // Create an admin user if it doesn't exist
        let adminUser = await User.findOne({ role: 'admin' });
        if (!adminUser) {
            adminUser = await User.register(new User({
                username: 'admin',
                email: 'admin@example.com',
                role: 'admin'
            }), 'adminpassword');
        }

        // Add hotels with rooms
        for (let hotelData of sampleHotels) {
            const hotel = new Hotel({
                ...hotelData,
                author: adminUser._id
            });

            // Create room types for each hotel
            const roomTypes = [
                {
                    roomType: 'Deluxe',
                    capacity: 2,
                    pricePerNight: hotelData.price * 0.8
                },
                {
                    roomType: 'Super Deluxe',
                    capacity: 3,
                    pricePerNight: hotelData.price
                },
                {
                    roomType: 'Suite',
                    capacity: 4,
                    pricePerNight: hotelData.price * 1.5
                }
            ];

            for (let roomType of roomTypes) {
                const room = new Room({
                    hotelId: hotel._id,
                    ...roomType
                });
                await room.save();
                hotel.rooms.push(room._id);
            }

            await hotel.save();
        }

        console.log("Database seeded!");
    } catch (err) {
        console.error("Seeding Error!", err);
    } finally {
        mongoose.connection.close();
    }
};

seedDB(); 