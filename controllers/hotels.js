const Hotel = require('../models/hotel');
const Booking = require('../models/booking');
const Room = require('../models/room');

module.exports.renderNewForm = (req, res) => {
    res.render('hotels/new');
};

module.exports.index = async (req, res) => {
    try {
        const { search } = req.query;
        let hotels;

        if (search) {
            // Create a case-insensitive search query for name or location
            hotels = await Hotel.find({
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { location: { $regex: search, $options: 'i' } }
                ]
            });
        } else {
            hotels = await Hotel.find({});
        }

        res.render('hotels/index', { hotels, search });
    } catch (e) {
        req.flash('error', 'Error loading hotels');
        res.redirect('/');
    }
};

module.exports.createHotel = async (req, res) => {
    try {
        const hotel = new Hotel(req.body.hotel);
        hotel.author = req.user._id;
        
        // Create default rooms for the hotel
        const defaultRooms = [
            {
                roomType: 'Standard',
                capacity: 2,
                pricePerNight: hotel.price
            },
            {
                roomType: 'Deluxe',
                capacity: 3,
                pricePerNight: hotel.price * 1.5
            }
        ];

        for (const roomData of defaultRooms) {
            const room = new Room({
                hotelId: hotel._id,
                ...roomData
            });
            await room.save();
            hotel.rooms.push(room._id);
        }

        await hotel.save();
        console.log('Created hotel:', hotel);
        req.flash('success', 'Successfully added a new hotel!');
        res.redirect(`/hotels/${hotel._id}`);
    } catch (e) {
        console.error('Error creating hotel:', e);
        req.flash('error', 'Error creating hotel');
        res.redirect('/hotels');
    }
};

module.exports.showHotel = async (req, res) => {
    try {
        const hotel = await Hotel.findById(req.params.id)
            .populate({
                path: 'author',
                select: 'username email'
            })
            .populate({
                path: 'reviews',
                populate: {
                    path: 'author',
                    select: 'username'
                }
            })
            .populate({
                path: 'rooms',
                model: 'Room'
            });

        if (!hotel) {
            console.log('Hotel not found:', req.params.id);
            req.flash('error', 'Hotel not found');
            return res.redirect('/hotels');
        }

        // Debug logging
        console.log('Hotel details:', {
            id: hotel._id,
            name: hotel.name,
            authorId: hotel.author?._id,
            roomCount: hotel.rooms?.length,
            reviewCount: hotel.reviews?.length
        });

        res.render('hotels/show', { hotel });
    } catch (e) {
        console.error('Error in showHotel:', e);
        req.flash('error', 'Error loading hotel details');
        res.redirect('/hotels');
    }
};

module.exports.renderEditForm = async (req, res) => {
    const { id } = req.params;
    const hotel = await Hotel.findById(id);
    if (!hotel) {
        req.flash('error', 'Cannot find that hotel!');
        return res.redirect('/hotels');
    }
    res.render('hotels/edit', { hotel });
};

module.exports.updateHotel = async (req, res) => {
    const { id } = req.params;
    const hotel = await Hotel.findByIdAndUpdate(id, { ...req.body.hotel });
    req.flash('success', 'Successfully updated hotel!');
    res.redirect(`/hotels/${hotel._id}`);
};

module.exports.deleteHotel = async (req, res) => {
    const { id } = req.params;
    await Hotel.findByIdAndDelete(id);
    req.flash('success', 'Successfully deleted hotel!');
    res.redirect('/hotels');
};

module.exports.renderBookingForm = async (req, res) => {
    const hotel = await Hotel.findById(req.params.id);
    if (!hotel) {
        req.flash('error', 'Hotel not found');
        return res.redirect('/hotels');
    }
    res.render('hotels/book', { hotel });
};

module.exports.createBooking = async (req, res) => {
    try {
        const hotel = await Hotel.findById(req.params.id).populate('rooms');
        const { roomType, numberOfRooms, numberOfGuests, specialRequests } = req.body;
        
        const selectedRoom = await Room.findById(roomType);
        const totalAmount = selectedRoom.pricePerNight * numberOfRooms;

        const booking = new Booking({
            userId: req.user._id,
            hotelId: hotel._id,
            roomId: roomType,
            numberOfRooms,
            numberOfGuests,
            specialRequests,
            totalAmount
        });

        await booking.save();
        req.flash('success', 'Booking confirmed successfully!');
        res.redirect('/bookings');
    } catch (e) {
        console.error('Booking error:', e);
        req.flash('error', 'Error creating booking');
        res.redirect(`/hotels/${req.params.id}`);
    }
}; 