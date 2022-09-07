const mongoose = require('mongoose');

const tourLikeSchema = new mongoose.Schema({
    tour_id: {
        type: mongoose.Schema.ObjectId,
        ref: 'Tour',
        required: [true, 'Booking must belong to a tour']
    },

    user_id: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'Booking must belong to a user']

    },

    createdAt: {
        type: Date,
        default: Date.now()
    }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
})


const TourLike = mongoose.model('TourLike', tourLikeSchema)

module.exports = TourLike