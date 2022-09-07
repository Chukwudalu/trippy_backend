const Tour = require('../models/tourModel');
const TourLike = require('../models/tourLikeModel')
// const Booking = require('../models/bookingModel')
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');
const mongoose = require('mongoose');

exports.aliasTopTours = (req, res, next) => {
    req.query.limit = '5'
    req.query.sort = '-ratingsAverage,price'
    req.query.fields = 'name,price,ratingsAverage,summary,difficulty'
    next()
}


// exports.getAllTours = catchAsync(async (req, res, next) => {
    
//     // ---------------EXECUTE QUERY---------------
//     const features = new APIFeatures(Tour.find(), req.query)
//     .filter()
//     .sort()
//     .limitFields()
//     .paginate()
//     const tours = await features.query;
    
//     // ---------------SEND RESPONSE---------------
//     res.status(200).json({
//         status: 'success',
//         results: tours.length,
//         data: {
//             tours
//         }
//     })
// })

// exports.getTour = catchAsync(async (req, res, next) => {
//     const tour = await Tour.findById(req.params.id).populate('reviews')
    
//     if(!tour) {
//         return next(new AppError('No tour found with that ID', 404))
//     }

//     res.status(200).json({
//         status: 'success',
//         data: {
//             tour
//         }
//     });
// })

// exports.createTour = catchAsync(async (req, res, next) => {
//     const newTour = await Tour.create(req.body)

//     res.status(201).json({
//         status: 'success',
//         data: {
//             tour: newTour
//         }
//     })
// })
exports.getAllTours = factory.getAll(Tour, 'tour')
exports.getTour = factory.getOne(Tour, {path: 'reviews', fields: 'review rating user'}, 'tour')
exports.createTour = factory.createOne(Tour)
exports.updateTour = factory.updateOne(Tour)
exports.deleteTour = factory.deleteOne(Tour);



// DATA HANDLING
// MATCHING AND GROUPING USING THE AGGREGATION PIPELINE
exports.getTourStats = catchAsync (async (req, res, next) => {
    const stats = await Tour.aggregate([
        {
            $match: {ratingsAverage: { $gte: 4.5 }}
        },
        {
            $group: {
                _id: {$toUpper: '$difficulty'},
                numTours: { $sum: 1},
                numRatings: { $sum: '$ratingsQuantity'},
                averageRating: { $avg: '$ratingsAverage'},
                avgPrice: { $avg: '$price' },
                minPrice: { $min: '$price'},
                maxPrice: { $max: '$price'}
            }
        },
        {
            $sort: { avgPrice: 1 }
        }
        // {
        //     $match: { _id: { $ne: 'EASY'}}
        // }

    ])
    res.status(200).json({
        status: 'success',
        data: {
            stats
        }
    })
})
// DATA HANDLING
// UNWINDING AND PROJECTING
exports.getMonthlyPlan = catchAsync (async (req, res, next) => {
    const year = req.params.year * 1;
    const plan = await Tour.aggregate([
        {
            $unwind: '$startDates'
        },
        {
            $match: {
                startDates: { 
                    $gte: new Date(`${year}-01-01`),
                    $lte: new Date(`${year}-12-31`)
                }
            }
        },
        {
            $group:{
                _id: { $month: '$startDates'},
                numTourStarts: { $sum: 1 },
                tours: { $push: '$name' },
            }
        },
        {
            $addFields: {
                month: '$_id'
            }
        },
        {
            $project: {
                _id: 0
            }
        },
        {
            $sort: {
                numTourStarts: -1
            }
        },
        {
            $limit: 12
        }
    ]);
    res.status(200).json({
        status: 'success',
        data: {
            plan
        }
    })
})

// /tours-within/:distance/center/:latlng/:unit'

exports.getToursWithin = async (req, res, next) => {
    const { distance, latlng, unit } = req.params;
    const [lat, lng] = latlng.split(',');

    const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

    if(!lat || !lng) next(new AppError('Please provide latitude and longitude in the format lat,lng', 400))

    const tours = await Tour.find({ startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius]}}})

    res.status(200).json({
        status: 'success',
        results: tours.length,
        data: {
            data: tours
        }
    })
}

exports.getDistances = catchAsync( async(req, res, next) => {
    const { latlng, unit } = req.params;
    const [ lat, lng ] = latlng.split(',');

    // const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

    const multiplier = unit === 'mi' ? 0.000621371 : 0.001;
    if(!lat || !lng){
        next(
            new AppError('Please provide latitude and longitude in the format lat, lng.', 400)
        )
    }
    
    const distances = await Tour.aggregate([
        {
            $geoNear: {
                near: {
                    type: 'Point',
                    coordinates: [lng * 1, lat * 1]
                },

                distanceField: 'distance',
                distanceMultiplier: multiplier
            }
        },
        {
            $project: {
                distance: 1,
                name: 1
            }
        }
    ])

    res.status(200).json({
        status: 'success',
        data: {
            data: distances
        }
    })
})

exports.getTourBySlug = catchAsync(async (req, res, next) => {
    const tour = await Tour.findOne({slug: req.params.slug}).populate({
        path: 'reviews',
        fields: 'review rating user'
    });
    
    if(!tour) return next(new AppError('Tour not found', 404))

    res.status(200).json({
        status: 'success',
        tour
    })
})  


exports.toggleLike = catchAsync(async (req, res, next) => {
    let tour_id = req.params.tour_id;
    if(!mongoose.Types.ObjectId.isValid(tour_id)){
        return next(new AppError('Tour not found', 404))
    }
    const tour = await Tour.findOne({_id: tour_id})
    if(!tour) return next(new AppError('Tour not found', 404))
    let currentUser = req.user
    let likedTourCheck = await TourLike.findOne({ tour_id, user_id: currentUser.id});
    let userLikedTour;
    let statusCode;
    if(!likedTourCheck){
        userLikedTour = await TourLike.create({tour_id, user_id: currentUser.id})
        // userLikedTour = await TourLike.create({tour_id, user_id: currentUser._id})
        await Tour.updateOne({ id: tour_id, 
            $push: { tourLikes: userLikedTour.id}
        })
        statusCode = 201
    }else {
        userLikedTour = await TourLike.deleteOne({ _id: likedTourCheck._id})
        await Tour.updateOne({ id: tour.id, $pull: {tourLikes: likedTourCheck.id }})
        statusCode = 204
    }
    res.status(statusCode).json({
        status: statusCode === 201 ? 'success' : statusCode === 204 ? 'deleted' : null,
        data: statusCode === 201 ? userLikedTour : null 
    })
    
})

exports.getTourLikeCount = catchAsync(async ( req, res, next) => {
    const likedTours = await TourLike.find({ user_id: req.user.id})
    const likedToursId = likedTours.map(likedTour => likedTour.tour_id)
    const data = { likedToursId, count: likedToursId.length}
    if(likedToursId.length){
        res.status(200).json({
            status: 'success',
            data
        })
    }else{
        res.status(200).json({
            status: 'success',
            data: null
        })
    }
    
})

// exports.toggleLike = catchAsync(async (req, res, next) => {
//     const likeTourCheck = await TourLike.findOne(req.body);
//     let likeTour;
//     let statusCode;
//     if(!likeTourCheck){
//         likeTour = await TourLike.create(req.body);
//         statusCode = 201
//     }else{
//         likeTour = await TourLike.findOneAndDelete(req.body)
//         statusCode = 204
//     }
//     res.status(statusCode).json({
//         status: statusCode === 201 ? 'success' : statusCode === 204 ? 'deleted' : null,
//         data: statusCode === 201 ? likeTour : null 
//     })
// })
