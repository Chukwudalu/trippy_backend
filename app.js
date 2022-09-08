const express = require('express');
const morgan = require('morgan');
const path = require('path')
const rateLimit = require('express-rate-limit')
const helmet = require('helmet')
const mongoSanitize = require('express-mongo-sanitize')
const xss = require('xss-clean')
const hpp = require('hpp')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const comression = require('compression')


const AppError = require('./utils/appError')
const globalErrorHandler = require('./controller/errorController')

const tourRouter = require('./routes/tourRoutes')
const userRouter = require('./routes/userRoutes')
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes')
const tourSlugRouter = require('./routes/tourSlugRoute');
const compression = require('compression');



const app = express();
__dirname = path.resolve();
if(process.env.NODE_ENV === 'production'){
    app.use(express.static(path.join(__dirname + "/public")));

    app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, 'public', 'index.html'))
    })
}


// 1) Middlewares
const corsConfig = {
    origin: true,
    credentials: true,
};
app.use(cors(corsConfig))
app.options('*', cors(corsConfig));
// set Security http headers
app.use(helmet())

// Development logging
if(process.env.NODE_ENV === 'development'){
    app.use(morgan('dev'))
}

// limit request from same api
const limiter = rateLimit({
    max: 100,
    windowMs: 60 * 60 * 1000,
    message: 'Too many requests from this IP, please try again in an hour'
});

app.use('/api', limiter)

// Body parser, reading data from body into req.body
app.use(express.json({
    limit: '10kb'
}))

app.use(cookieParser())

// Data sanitization against nosql query injection 
app.use(mongoSanitize());

// Data sanitization against XSS (Cross site scripting attacks)
app.use(xss())

// Prevent parameter pollution
app.use(hpp({
    whitelist: [ 'duration', 'ratingsQuantity', 'ratingsAverage', 'maxGroupSize', 'difficulty', 'price' ]
}))

// app.use(express.static(`${__dirname}/public`))

app.use(compression())

// Test middleware

app.use((req, res, next) => {
    req.requestTime = new Date().toISOString();
    next();
})

// ROUTES
app.use('/api/v1/tourFromSlug', tourSlugRouter)
app.use('/api/v1/tours', tourRouter)
app.use('/api/v1/users', userRouter)
app.use('/api/v1/reviews', reviewRouter)
app.use('/api/v1/bookings', bookingRouter)


app.all('*', (req, res, next) => {
    // If the next() recieves an arg, express will automatically know that there was an error
    next(new AppError(`Cant find ${req.originalUrl} on this server`, 404))
})

app.use(globalErrorHandler)

module.exports = app;
