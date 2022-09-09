const tourController = require('../controller/tourController')
const authController = require('../controller/authController')
// const reviewController = require('../controller/reviewController')
const reviewRouter = require('./reviewRoutes')
const express = require('express')


const router = express.Router();

// router.route('/:tourId/reviews')
// .post(authController.protect, authController.restrictTo('user'), reviewController.createReview)
// router.route('/my-tours').get(authController.protect, tourController.getMyTours)
router.use('/:tourId/reviews', reviewRouter)
// router.use(authController.isLoggedIn)
// router.param('id', tourController.checkID);
router.route('/liked-tours').post(authController.protect, tourController.getTourLikeCount)
router.route('/top-5-cheap').get(tourController.aliasTopTours, tourController.getAllTours)

router.route('/tour-stats').get(tourController.getTourStats)
router.route('/monthly-plan/:year').get(authController.protect, authController.restrictTo('admin', 'lead-guide', 'guide'), tourController.getMonthlyPlan)

router.route('/tours-within/:distance/center/:latlng/unit/:unit').get(tourController.getToursWithin)

router.route('/distance/:latlng/unit/:unit').get(tourController.getDistances)

router.route('/').get(tourController.getAllTours).post(authController.protect, authController.restrictTo('admin', 'lead-guide'),tourController.createTour)
router.route('/:id').get(tourController.getTour)
                    .patch(tourController.updateTour)
                    .delete(authController.protect, authController.restrictTo('admin', 'lead-guide'), tourController.deleteTour)
                    

router.route('/:tour_id/toggle-like').post(authController.protect, tourController.toggleLike)


module.exports = router;

// authController.protect, authController.restrictTo('admin', 'lead-guide'), 