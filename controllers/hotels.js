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
        const { 
            roomType, 
            numberOfRooms, 
            numberOfGuests, 
            specialRequests,
            checkInDate,
            checkOutDate,
            checkInTime,
            checkOutTime,
            guestDetails
        } = req.body;

        // Validate required fields
        if (!checkInDate || !checkOutDate || !checkInTime || !checkOutTime) {
            req.flash('error', 'Please fill in all required fields');
            return res.redirect(`/hotels/${req.params.id}/book`);
        }
        
        const selectedRoom = await Room.findById(roomType);
        if (!selectedRoom) {
            req.flash('error', 'Invalid room type selected');
            return res.redirect(`/hotels/${req.params.id}/book`);
        }
        
        // Calculate number of nights
        const checkIn = new Date(checkInDate);
        const checkOut = new Date(checkOutDate);
        const numberOfNights = Math.max(1, Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24)));
        
        // Calculate total amount
        const totalAmount = selectedRoom.pricePerNight * numberOfRooms * numberOfNights;

        // Create new booking
        const booking = new Booking({
            userId: req.user._id,
            hotelId: hotel._id,
            roomId: roomType,
            checkInDate,
            checkOutDate,
            checkInTime,
            checkOutTime,
            numberOfNights,
            numberOfRooms,
            numberOfGuests,
            guestDetails,
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
        res.redirect('/bookings');
    } catch (e) {
        console.error('Booking error:', e);
        req.flash('error', 'Sorry, there was a problem with your booking. Please try again.');
        res.redirect(`/hotels/${req.params.id}/book`);
    }
};

module.exports.showBookings = async (req, res) => {
    try {
        const { search, sortBy } = req.query;
        
        // Build query
        let query = { userId: req.user._id };

        // Add search functionality
        if (search) {
            query.$or = [
                { 'guestDetails.name': { $regex: search, $options: 'i' } },
                { 'guestDetails.email': { $regex: search, $options: 'i' } }
            ];
        }

        let bookings = Booking.find(query)
            .populate('hotelId')
            .populate('roomId');

        // Apply sorting
        switch (sortBy) {
            case 'dateAsc':
                bookings = bookings.sort({ createdAt: 1 });
                break;
            case 'dateDesc':
                bookings = bookings.sort({ createdAt: -1 });
                break;
            default:
                bookings = bookings.sort({ createdAt: -1 }); // Default to newest first
        }

        bookings = await bookings.exec();
        res.render('bookings/index', { 
            bookings, 
            query: { search, sortBy } 
        });
    } catch (e) {
        console.error('Error fetching bookings:', e);
        req.flash('error', 'Unable to load bookings');
        res.redirect('/hotels');
    }
}; 