const tourController = require('../controller/tourController');
const express = require('express');

const router = express.Router();

router.route('/:slug').get(tourController.getTourBySlug)

module.exports = router