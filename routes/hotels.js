const express = require('express');
const router = express.Router();
const catchAsync = require('../utils/catchAsync');
const hotelsController = require('../controllers/hotels');
const { isLoggedIn, validateHotel, isAuthor, isAdmin } = require('../middleware');

router.route('/')
    .get(catchAsync(hotelsController.index))
    .post(isLoggedIn, isAdmin, validateHotel, catchAsync(hotelsController.createHotel));

router.get('/new', isLoggedIn, isAdmin, hotelsController.renderNewForm);

router.route('/:id')
    .get(catchAsync(hotelsController.showHotel))
    .put(isLoggedIn, isAuthor, validateHotel, catchAsync(hotelsController.updateHotel))
    .delete(isLoggedIn, isAuthor, catchAsync(hotelsController.deleteHotel));

router.get('/:id/edit', isLoggedIn, isAuthor, catchAsync(hotelsController.renderEditForm));

module.exports = router; 