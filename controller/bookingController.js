const Tour = require('../models/tourModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');
const { request } = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
    // 1) Get currently booked tour
    const tour = await Tour.findById(req.params.tourId)
    // 2) Create checkout session
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        success_url: `${process.env.CLIENT_URL}/checkout-success/?tour=${req.params.tourId}&user=${req.user._id}&price=${tour.price}`,
        cancel_url: `${process.env.CLIENT_URL}/tours/${tour.slug}`,
        customer_email: req.user.email,
        client_reference_id: req.params.tourId,
        mode: 'payment',
        line_items: [
            {
                price_data: {
                    currency: 'cad',
                    product_data: {
                        name: `${tour.name} Tour`,
                        description: tour.summary,
                        // images: [`https://www.natours.dev/img/tours/tour-1-cover.jpg`]
                        images: [tour.imageCover]
                    },
                    unit_amount: tour.price * 100,
                },
                quantity: 1
            }
        ]
    })
    
    // 3) Send it to the client
    res.status(200).json({
        status: 'success',
        session
    })
})

exports.createBookingCheckout = catchAsync(async (req, res, next) => {
    // This is only temporaty
    const { tour, user, price } = req.body;

    if(!tour && !user && !price) return next();
    await Booking.create({tour, user, price});
    

    res.send({booked: true})
})

exports.getMyTours = catchAsync(async (req, res, next) => {
    
    // 1) Find all bookings
    const bookings = await Booking.find({ user: req.user._id})
   
    // 2) Find tours with the returned ID
    const tourIds = bookings.map(el => el.tour);
    const tours = await Tour.find({ _id: {$in: tourIds}})
    
    res.status(200).json({
        tours
    })
})



