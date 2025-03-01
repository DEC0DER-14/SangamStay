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
        
        // Set initial total rooms and available rooms
        hotel.totalRooms = 20; // Default total rooms
        hotel.availableRooms = hotel.totalRooms; // Initially all rooms are available

        await hotel.save();
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
            });

        if (!hotel) {
            req.flash('error', 'Hotel not found');
            return res.redirect('/hotels');
        }

        res.render('hotels/show', { hotel });
    } catch (e) {
        console.error('Error loading hotel details:', e);
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
        const hotel = await Hotel.findById(req.params.id);
        if (!hotel) {
            req.flash('error', 'Hotel not found');
            return res.redirect('/hotels');
        }
        res.render('hotels/book', { 
            hotel,
            formData: null // Initialize formData as null for the initial render
        });
    } catch (e) {
        console.error('Error loading hotel details:', e);
        req.flash('error', 'Error loading hotel details');
        res.redirect('/hotels');
    }
};

module.exports.createBooking = async (req, res) => {
    try {
        const hotel = await Hotel.findById(req.params.id);
        if (!hotel) {
            req.flash('error', 'Hotel not found');
            return res.redirect('/hotels');
        }

        const { 
            numberOfRooms, 
            numberOfGuests, 
            specialRequests,
            checkInDate,
            checkOutDate,
            checkInTime,
            checkOutTime,
            guestDetails
        } = req.body;

        // Parse numbers
        const parsedNumberOfRooms = parseInt(numberOfRooms) || 1;
        const parsedNumberOfGuests = parseInt(numberOfGuests) || 1;

        // Validate required fields
        if (!checkInDate || !checkOutDate || !checkInTime || !checkOutTime || !guestDetails) {
            console.error('Missing required fields:', { checkInDate, checkOutDate, checkInTime, checkOutTime, guestDetails });
            req.flash('error', 'Please fill in all required fields');
            return res.render('hotels/book', { 
                hotel,
                formData: req.body
            });
        }

        // Validate guest details
        if (!guestDetails.name || !guestDetails.email || !guestDetails.phone) {
            console.error('Missing guest details:', guestDetails);
            req.flash('error', 'Please fill in all guest details');
            return res.render('hotels/book', { 
                hotel,
                formData: req.body
            });
        }
        
        // Validate number of guests per room
        const guestsPerRoom = parsedNumberOfGuests / parsedNumberOfRooms;
        if (guestsPerRoom > 2) {
            console.error('Too many guests per room:', { numberOfGuests: parsedNumberOfGuests, numberOfRooms: parsedNumberOfRooms, guestsPerRoom });
            req.flash('error', `Maximum 2 guests allowed per room. You have selected ${parsedNumberOfGuests} guests for ${parsedNumberOfRooms} rooms.`);
            return res.render('hotels/book', { 
                hotel,
                formData: req.body
            });
        }

        // Check if enough rooms are available
        if (parsedNumberOfRooms > hotel.availableRooms) {
            console.error('Not enough rooms:', { requested: parsedNumberOfRooms, available: hotel.availableRooms });
            req.flash('error', 'Not enough rooms available');
            return res.render('hotels/book', { 
                hotel,
                formData: req.body
            });
        }
        
        // Calculate number of nights
        const checkIn = new Date(checkInDate);
        const checkOut = new Date(checkOutDate);
        const numberOfNights = Math.max(1, Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24)));
        
        // Validate dates
        if (checkOut <= checkIn) {
            console.error('Invalid dates:', { checkIn, checkOut });
            req.flash('error', 'Check-out date must be after check-in date');
            return res.render('hotels/book', { 
                hotel,
                formData: req.body
            });
        }

        // Calculate total amount
        const totalAmount = hotel.price * parsedNumberOfRooms * numberOfNights;

        // Create new booking with pending status
        const booking = new Booking({
            userId: req.user._id,
            hotelId: hotel._id,
            checkInDate,
            checkOutDate,
            checkInTime,
            checkOutTime,
            numberOfNights,
            numberOfRooms: parsedNumberOfRooms,
            numberOfGuests: parsedNumberOfGuests,
            guestDetails,
            specialRequests,
            totalAmount,
            status: 'pending'
        });

        // Save the booking first
        await booking.save();

        // Update available rooms
        hotel.availableRooms -= parsedNumberOfRooms;
        await hotel.save();

        // Render the payment page
        res.render('payment/checkout', {
            booking,
            hotel,
            razorpayKeyId: process.env.RAZORPAY_KEY_ID
        });
    } catch (e) {
        console.error('Error creating booking:', e);
        let errorMessage = 'Sorry, there was a problem with your booking. Please try again.';
        
        // Check for validation errors
        if (e.name === 'ValidationError') {
            if (e.errors.numberOfGuests) {
                errorMessage = e.errors.numberOfGuests.message;
            }
        }
        
        req.flash('error', errorMessage);
        try {
            const hotel = await Hotel.findById(req.params.id);
            res.render('hotels/book', { 
                hotel,
                formData: req.body
            });
        } catch (err) {
            console.error('Error fetching hotel for error page:', err);
            res.redirect('/hotels');
        }
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

        // Create the base query
        const bookingsQuery = Booking.find(query);

        // Add population
        bookingsQuery.populate({
            path: 'hotelId',
            select: 'name location price pincode availableRooms'
        });

        // Add sorting
        if (sortBy === 'dateAsc') {
            bookingsQuery.sort({ createdAt: 1 });
        } else {
            bookingsQuery.sort({ createdAt: -1 }); // Default to newest first
        }

        // Execute the query
        const bookings = await bookingsQuery;

        // Check if we got any bookings
        if (!bookings) {
            req.flash('error', 'No bookings found');
            return res.redirect('/hotels');
        }

        // Render the bookings page
        res.render('bookings/index', { 
            bookings, 
            query: { search, sortBy } 
        });
    } catch (e) {
        console.error('Error loading bookings:', e);
        req.flash('error', 'Unable to load bookings. Please try again.');
        res.redirect('/hotels');
    }
};

// Add this helper function at the top of the file
const updateHotelRoomCount = async (hotelId, oldRoomCount, newRoomCount) => {
    try {
        const hotel = await Hotel.findById(hotelId);
        if (!hotel) {
            throw new Error('Hotel not found');
        }

        // Ensure we're working with valid numbers
        const currentAvailable = parseInt(hotel.availableRooms) || 0;
        const totalRooms = parseInt(hotel.totalRooms) || 20; // Default to 20 if not set
        const oldCount = parseInt(oldRoomCount) || 0;
        const newCount = parseInt(newRoomCount) || 0;

        let updatedAvailableRooms;

        if (status === 'confirmed') {
            // When confirming a booking, subtract rooms
            updatedAvailableRooms = currentAvailable - newCount;
        } else if (status === 'cancelled' || status === 'completed') {
            // When cancelling/completing, add rooms back
            updatedAvailableRooms = currentAvailable + oldCount;
        }

        // Ensure the value stays within valid bounds
        updatedAvailableRooms = Math.max(0, Math.min(totalRooms, updatedAvailableRooms));
        
        // Update the hotel
        hotel.availableRooms = updatedAvailableRooms;
        await hotel.save();
        
        return hotel;
    } catch (error) {
        throw new Error(`Failed to update room count: ${error.message}`);
    }
};

// Update the controller function
module.exports.updateBookingStatus = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { status } = req.body;

        const booking = await Booking.findById(bookingId).populate('hotelId');
        if (!booking) {
            req.flash('error', 'Booking not found');
            return res.redirect('/admin/bookings');
        }

        const oldRoomCount = parseInt(booking.numberOfRooms) || 0;
        const oldStatus = booking.status;
        
        try {
            // Update room count based on status change
            if ((status === 'completed' || status === 'cancelled') && oldStatus === 'confirmed') {
                // When cancelling or completing a confirmed booking, add rooms back
                const hotel = await Hotel.findById(booking.hotelId._id);
                if (hotel) {
                    const currentAvailable = parseInt(hotel.availableRooms) || 0;
                    const totalRooms = parseInt(hotel.totalRooms) || 20;
                    
                    // Calculate new available rooms
                    const newAvailable = currentAvailable + oldRoomCount;
                    
                    // Ensure it doesn't exceed total rooms
                    hotel.availableRooms = Math.min(totalRooms, newAvailable);
                    await hotel.save();
                }
            } else if (status === 'confirmed' && (oldStatus === 'cancelled' || oldStatus === 'completed')) {
                // When reactivating a cancelled/completed booking, subtract rooms
                const hotel = await Hotel.findById(booking.hotelId._id);
                if (hotel) {
                    const currentAvailable = parseInt(hotel.availableRooms) || 0;
                    
                    // Calculate new available rooms
                    const newAvailable = currentAvailable - oldRoomCount;
                    
                    // Ensure it doesn't go below 0
                    hotel.availableRooms = Math.max(0, newAvailable);
                    await hotel.save();
                }
            }

            // If marking as completed, update checkout details
            if (status === 'completed' && booking.status !== 'completed') {
                booking.isCheckedOut = true;
                booking.actualCheckOutTime = new Date();
            }

            booking.status = status;
            await booking.save();

            req.flash('success', 'Booking status updated successfully');
            res.redirect('/admin/bookings');
        } catch (error) {
            console.error('Error updating room count:', error);
            req.flash('error', 'Error updating room availability. Please try again.');
            res.redirect('/admin/bookings');
        }
    } catch (e) {
        console.error('Error in updateBookingStatus:', e);
        req.flash('error', 'Error updating booking status');
        res.redirect('/admin/bookings');
    }
};

module.exports.updateBookingDetails = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { numberOfRooms, numberOfGuests } = req.body;

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            req.flash('error', 'Booking not found');
            return res.redirect('/admin/dashboard');
        }

        // Check if number of guests per room is valid
        if (numberOfGuests / numberOfRooms > 2) {
            req.flash('error', 'Maximum 2 guests allowed per room');
            return res.redirect('/admin/dashboard');
        }

        // Update hotel room count based on the change in number of rooms
        await updateHotelRoomCount(booking.hotelId, booking.numberOfRooms, Number(numberOfRooms));

        // Update booking details
        booking.numberOfRooms = numberOfRooms;
        booking.numberOfGuests = numberOfGuests;
        await booking.save();

        req.flash('success', 'Booking updated successfully');
        res.redirect('/admin/dashboard');
    } catch (e) {
        req.flash('error', 'Error updating booking details');
        res.redirect('/admin/dashboard');
    }
}; 