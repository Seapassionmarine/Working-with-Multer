const express = require('express')
const { signUpValidator, logInValidator } = require('../middleware/validator')
const upload = require('../utils/multer')
const {signUp, getOne, getAll, updateUser, logIn, verifyEmail, resendVerificationEmail, ForgetPassword, ResetPassword, changePassword} = require('../Controller/userController')
const { Authenticate } = require('../middleware/auth');

const router = express.Router()

router.post('/sign-up',upload.single('image'),signUpValidator,signUp)
router.get('/one/:id',getOne)
router.get('/all',Authenticate,getAll)
router.put('/update/:id',upload.single('image,',updateUser))
router.post('/sign-in', logInValidator, logIn);
router.get('/verify/:token', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);
router.post('/forgot-password',ForgetPassword)
router.post('/reset-password/:token',ResetPassword)
router.put('/change-password/:token',changePassword)

module.exports = router 