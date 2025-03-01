const Joi = require('joi');

module.exports.hotelSchema = Joi.object({
    hotel: Joi.object({
        name: Joi.string().required(),
        location: Joi.string().required(),
        pincode: Joi.string().length(6).pattern(/^[0-9]{6}$/).required(),
        price: Joi.number().required().min(0),
        description: Joi.string().required(),
        availableRooms: Joi.number().required().min(0),
        facilities: Joi.array().items(Joi.string().valid('AC Rooms', 'Free WiFi', 'Parking Facility', 'Elevator', 'Food Services (Chargeable)', 'Daily House Keeping'))
    }).required()
});

module.exports.reviewSchema = Joi.object({
    review: Joi.object({
        rating: Joi.number().required().min(1).max(5),
        body: Joi.string().required()
    }).required()
});

module.exports.userSchema = Joi.object({
    username: Joi.string().required(),
    email: Joi.string().email().required(),
    phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
    password: Joi.string().required()
}); 