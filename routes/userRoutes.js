const express = require('express')

const userController = require('../controller/userController');
const authController = require('../controller/authController')
const cors = require('cors')



const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/logout', authController.logout)

router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

// Protect all routes after this middleware
router.use(authController.protect)

router.patch('/updatePassword', authController.updatePassword);

router.post('/me', userController.getMe, userController.getUser)
router.patch('/updateMe', cors() ,userController.uploadUserPhoto, userController.updateMe)
router.delete('/deleteMe', userController.deleteMe)

router.use(authController.restrictTo('admin'))

router.route('/').get(userController.getAllUsers)
router.route('/:id').patch(userController.updateUser).delete(userController.deleteUser)

module.exports = router

