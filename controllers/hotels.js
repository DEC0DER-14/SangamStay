const Hotel = require('../models/hotel');

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
    const hotel = await Hotel.findById(req.params.id).populate('author');
    if (!hotel) {
        req.flash('error', 'Hotel not found');
        return res.redirect('/hotels');
    }
    res.render('hotels/show', { hotel });
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