const Hotel = require('../models/hotel');
const Booking = require('../models/booking');

module.exports.renderNewForm = (req, res) => {
    res.render('hotels/new');
};

module.exports.index = async (req, res) => {
    const hotels = await Hotel.find({});
    res.render('hotels/index', { hotels });
};

module.exports.createHotel = async (req, res) => {
    const hotel = new Hotel(req.body.hotel);
    hotel.author = req.user._id;
    await hotel.save();
    req.flash('success', 'Successfully added a new hotel!');
    res.redirect(`/hotels/${hotel._id}`);
};

module.exports.showHotel = async (req, res) => {
    try {
        const hotel = await Hotel.findById(req.params.id)
            .populate('author')
            .populate('rooms');
            
        if (!hotel) {
            req.flash('error', 'Hotel not found');
            return res.redirect('/hotels');
        }
        res.render('hotels/show', { hotel });
    } catch (e) {
        req.flash('error', 'Something went wrong');
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
    const hotel = await Hotel.findById(req.params.id);
    if (!hotel) {
        req.flash('error', 'Hotel not found');
        return res.redirect('/hotels');
    }

    if (hotel.availableRooms < 1) {
        req.flash('error', 'No rooms available');
        return res.redirect(`/hotels/${hotel._id}`);
    }

    const { checkInDate, checkOutDate } = req.body;
    const days = (new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24);
    const totalAmount = hotel.price * days;

    const booking = new Booking({
        userId: req.user._id,
        hotelId: hotel._id,
        checkInDate,
        checkOutDate,
        totalAmount
    });

    await booking.save();
    
    // Update available rooms
    hotel.availableRooms -= 1;
    await hotel.save();

    req.flash('success', 'Booking successful!');
    res.redirect(`/hotels/${hotel._id}`);
}; 