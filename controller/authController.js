const { promisify } = require('util')
const crypto = require('crypto')
const catchAsync = require('../utils/catchAsync');
const User = require('./../models/userModel');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

const signToken = id => {
    return jwt.sign({id}, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    })
}

const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id)
    
    const cookieOptions = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
        httpOnly: true,
        sameSite: 'none'
    }

    if(process.env.NODE_ENV === 'production'){
        cookieOptions.secure = true
    }
    res.cookie('jwt', token, cookieOptions)

    // Remove the password from the output
    user.password = undefined;

    res.status(statusCode).json({
        status: 'success',
        token,
        isLoggedIn: true,
        data: {
            user
        }
    })
}

exports.signup = catchAsync(async (req, res, next) => {
    const newUser = await User.create({ 
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
        passwordChangedAt: req.body.passwordChangedAt,
        role: req.body.role || undefined
    });
    // const url = `${req.protocol}://${req.get('host')}/profile/me`;
    const url = `${process.env.CLIENT_URL}/profile/me`;
    await new Email(newUser, url).sendWelcome()

    createSendToken(newUser, 201, res)
})   

exports.login = catchAsync (async (req, res, next) => {
    
    const { email, password } = req.body;
    
    // 1) Check if email and password exist in req.body
    if(!email || !password){
        return next(new AppError('Please provide email and password', 400))
    }
    // 2) Check if user exist and password is correct
    const user = await User.findOne({email}).select('+password');
    
    if(!user || !(await user.correctPassword(password, user.password))){
        return next(new AppError('Incorrect email or password', 401))
    }
    // 3) If everything is ok, send token to client
    createSendToken(user, 200, res)
})

exports.logout = (req, res) => {
    
    res.cookie('jwt', 'loggedOut', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });
    if(req.body.token){
        res.status(200).json({status: 'success'});
    }
    
}

exports.protect = catchAsync( async (req, res, next) => {
    
    // 1) Getting token and check if it exist
    let token;
    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer')){
        token = req.headers.authorization.split(' ')[1];
    }else if(req.cookies.jwt){
        token = req.cookies.jwt
    }else{
        token = req.body.token
    }
    
    
    // console.log(req.cookies)
    if(!token){
        return next(new AppError('You are not logged in!. PLease log in to get access', 401))
    }

    // 2) Validate the token (Verification)
    // takes in a callback, but we can use node built in promisify function. 
    // so we can await the result of the verification and store the result
    // This below is a curried function
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET)
    // USing callbacks
    // let decoded;
    // jwt.verify(token, process.env.JWT_SECRET, (err, value) => {
    //     decoded = value
    // })
    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if(!currentUser){
        return next(new AppError('The user belonging to the token no longer exists', 401))
    }
    // 4) Check if the user changed passwords after the jwt was issued
    if(currentUser.changedPasswordAfter(decoded.iat)){
        return next(new AppError('User recently changed password. Please log in again', 401))
    }
    // Grant access to protected route
    req.user = currentUser
    next()
})

exports.isLoggedIn = async (req, res, next) => {
    if(req.cookies.jwt){
        try {
            // 1) Verify token
            const decoded = await promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRET);

            // 2) Check if user still exists
            const currentUser = await User.findById(decoded.id);
            if(!currentUser){
                return next()
            }

            // 3) Check if user changed password after the token was issued
            if(currentUser.changedPasswordAfter(decoded.iat)){
                return next( new AppError('User recently changed password', 401))
            }
            // There is a logged in user
            // req.locals.user = currentUser
            req.isLoggedIn = true;
            
            return next()
        } catch (error) {
            return next()
        }
        
    }else{
        req.isLoggedIn = false;
        return next()
    }
    
}


exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        // roles ['admin', 'lead-guide']. role='user'
        if(!roles.includes(req.user.role)){
            return next(new AppError('You do not have permission to perform this action', 403))
        }
        next()
    }
}

exports.forgotPassword = catchAsync(async (req, res, next) => {
    // 1) Get User based on posted email
    const user = await User.findOne({email: req.body.email})
    if(!user){
        return next(new AppError('There is no user with email address', 404))
    }
    // 2) Generate the random token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false })

    // 3) Send it back as an email
    try{
        const resetURL = `${process.env.CLIENT_URL}/resetPassword/${resetToken}`;
        await new Email(user, resetURL).sendPasswordReset()
        
        res.status(200).json({
            status: 'success',
            message: 'Token sent to email'
        })
    }catch{
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });

        return next(new AppError('There was an error sending the email. Try again later!', 500))
    }
})

exports.resetPassword = catchAsync (async (req, res, next) => {
    // 1) get user based on the token
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex')
    const user = await User.findOne({
        passwordResetToken: hashedToken, 
        passwordResetExpires: {$gt: Date.now()}
    });
    // 2) If token has not expired and there is a user, set the new password
    if(!user) return next(new AppError('Token is invalid or has expired', 400))

    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();
    // 3) Update changedPasswordAt property for the user
    // 4) Log the user in, send JWT
    createSendToken(user, 200, res)
})

exports.updatePassword = catchAsync (async (req, res, next) => {
    // 1) Get the user from the collection
    const user = await User.findById(req.user.id).select('+password');
    // 2) Check if the Posted password is correct
    if(!user.correctPassword(req.body.oldPassword, user.password)){
        return next(new AppError('Your current password is wrong', 401))
    }
    // 3) If so, update password
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();
    // 4) Log user in, send jwt\
    createSendToken(user, 200, res)
})



