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
            req.flash('error', 'Hotel not found');
            return res.redirect('/hotels');
        }

        res.render('hotels/show', { hotel });
    } catch (e) {
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
    try {
        const hotel = await Hotel.findById(req.params.id).populate('rooms');
        if (!hotel) {
            req.flash('error', 'Hotel not found');
            return res.redirect('/hotels');
        }
        res.render('hotels/book', { hotel });
    } catch (e) {
        req.flash('error', 'Error loading hotel details');
        res.redirect('/hotels');
    }
};

module.exports.createBooking = async (req, res) => {
    try {
        const hotel = await Hotel.findById(req.params.id).populate('rooms');
        const { roomType, numberOfRooms, numberOfGuests, specialRequests } = req.body;
        
        const selectedRoom = await Room.findById(roomType);
        const totalAmount = selectedRoom.pricePerNight * numberOfRooms;

        // Check if hotel exists and has availableRooms field
        if (!hotel || typeof hotel.availableRooms !== 'number') {
            req.flash('error', 'Invalid hotel data');
            return res.redirect('/hotels');
        }

        // Check if enough rooms are available
        if (hotel.availableRooms < numberOfRooms) {
            req.flash('error', `Only ${hotel.availableRooms} rooms available`);
            return res.redirect(`/hotels/${req.params.id}/book`);
        }

        const booking = new Booking({
            userId: req.user._id,
            hotelId: hotel._id,
            roomId: roomType,
            numberOfRooms,
            numberOfGuests,
            specialRequests,
            totalAmount,
            status: 'confirmed'
        });

        // Update available rooms count
        hotel.availableRooms = Math.max(0, hotel.availableRooms - numberOfRooms);
        
        // Save both the booking and updated hotel
        await Promise.all([
            booking.save(),
            hotel.save()
        ]);

        req.flash('success', 'Thank you for your booking! Your reservation is confirmed.');
        res.redirect('/hotels');
    } catch (e) {
        console.error('Booking error:', e);
        req.flash('error', 'Sorry, there was a problem with your booking. Please try again.');
        res.redirect(`/hotels/${req.params.id}/book`);
    }
};

module.exports.showBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ userId: req.user._id })
            .populate('hotelId')
            .populate('roomId')
            .exec();

        res.render('bookings/index', { bookings });
    } catch (e) {
        console.error('Error fetching bookings:', e);
        req.flash('error', 'Unable to load bookings');
        res.redirect('/hotels');
    }
}; 