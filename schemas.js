const Joi = require('joi');

module.exports.hotelSchema = Joi.object({
    hotel: Joi.object({
        name: Joi.string().required(),
        location: Joi.string().required(),
        price: Joi.number().required().min(0),
        amenities: Joi.array().items(Joi.string()),
        availableRooms: Joi.number().required().min(0),
        description: Joi.string().required()
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