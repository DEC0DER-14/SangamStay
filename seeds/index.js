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

const seedDB = async () => {
    try {
        // Clear existing data
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

        const hotels = [
            {
                name: 'Luxury Palace Hotel',
                location: 'Mumbai',
                price: 5000,
                description: 'A luxurious 5-star hotel in the heart of Mumbai',
                amenities: ['WiFi', 'Pool', 'Spa', 'Restaurant'],
                availableRooms: 10,
                author: adminUser._id
            },
            {
                name: 'Green Valley Resort',
                location: 'Pune',
                price: 3500,
                description: 'Peaceful resort surrounded by nature',
                amenities: ['WiFi', 'Garden', 'Restaurant'],
                availableRooms: 15,
                author: adminUser._id
            }
            // Add more hotels as needed
        ];

        for (const hotelData of hotels) {
            const hotel = new Hotel({
                name: hotelData.name,
                location: hotelData.location,
                price: hotelData.price,
                description: hotelData.description,
                amenities: hotelData.amenities,
                availableRooms: hotelData.availableRooms,
                author: hotelData.author,
                rooms: []
            });
            
            // Create rooms for each hotel
            const roomTypes = [
                {
                    roomType: 'Deluxe',
                    capacity: 2,
                    pricePerNight: hotelData.price
                },
                {
                    roomType: 'Suite',
                    capacity: 4,
                    pricePerNight: hotelData.price * 1.5
                }
            ];

            for (const roomType of roomTypes) {
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