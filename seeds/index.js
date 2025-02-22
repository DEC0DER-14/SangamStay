const mongoose = require('mongoose');
const Hotel = require('../models/hotel');
const Room = require('../models/room');

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
        amenities: ["Swimming Pool", "Spa", "24/7 Room Service", "Restaurant", "Fitness Center", "Free Wi-Fi"],
        availableRooms: 50,
        description: "Experience luxury at its finest in the heart of Mumbai with spectacular sea views."
    },
    {
        name: "The Oberoi Grand",
        location: "Kolkata, West Bengal",
        price: 12000,
        amenities: ["Heritage Building", "Fine Dining", "Spa", "Business Center", "Pool"],
        availableRooms: 35,
        description: "A heritage luxury hotel featuring classic architecture and modern amenities."
    },
    {
        name: "ITC Windsor",
        location: "Bangalore, Karnataka",
        price: 8500,
        amenities: ["Golf Course", "Multiple Restaurants", "Spa", "Conference Rooms"],
        availableRooms: 45,
        description: "Victorian-inspired architecture meets modern luxury in the garden city."
    },
    {
        name: "The Leela Palace",
        location: "New Delhi, Delhi",
        price: 18000,
        amenities: ["Rooftop Pool", "Luxury Spa", "Multiple Restaurants", "Art Gallery"],
        availableRooms: 40,
        description: "Modern palace hotel offering world-class luxury in the capital city."
    },
    {
        name: "Radisson Blu",
        location: "Pune, Maharashtra",
        price: 6500,
        amenities: ["Business Center", "Gym", "Restaurant", "Free Wi-Fi"],
        availableRooms: 60,
        description: "Contemporary hotel perfect for business and leisure travelers."
    },
    {
        name: "The Gateway Resort",
        location: "Corbett, Uttarakhand",
        price: 9500,
        amenities: ["Wildlife Tours", "Swimming Pool", "Adventure Sports", "Spa"],
        availableRooms: 25,
        description: "Luxury resort nestled in the foothills of the Himalayas."
    },
    {
        name: "Ginger Hotel",
        location: "Jaipur, Rajasthan",
        price: 3500,
        amenities: ["Restaurant", "Free Wi-Fi", "Business Center"],
        availableRooms: 75,
        description: "Smart, budget-friendly hotel in the pink city."
    },
    {
        name: "The Zuri White Sands",
        location: "Goa",
        price: 11000,
        amenities: ["Beach Access", "Casino", "Water Sports", "Spa", "Multiple Pools"],
        availableRooms: 55,
        description: "Beachfront resort offering the best of Goan hospitality."
    }
];

// Sample room types for each hotel
const roomTypes = [
    {
        roomType: "Deluxe",
        capacity: 2,
        pricePerNight: 5000
    },
    {
        roomType: "Super Deluxe",
        capacity: 3,
        pricePerNight: 7500
    },
    {
        roomType: "Suite",
        capacity: 4,
        pricePerNight: 12000
    }
];

const seedDB = async () => {
    try {
        // Delete existing data
        await Hotel.deleteMany({});
        await Room.deleteMany({});

        // Create an admin user if needed
        const adminUser = {
            _id: '123456789012345678901234' // Sample ObjectId
        };

        // Add hotels with rooms
        for (let hotel of sampleHotels) {
            const newHotel = new Hotel({
                ...hotel,
                author: adminUser._id // Associate with admin user
            });
            await newHotel.save();

            // Add rooms for each hotel
            for (let roomType of roomTypes) {
                const room = new Room({
                    hotelId: newHotel._id,
                    ...roomType
                });
                await room.save();
            }
        }

        console.log("Database seeded!");
    } catch (err) {
        console.log("Seeding Error!");
        console.log(err);
    } finally {
        mongoose.connection.close();
    }
};

seedDB(); 