const UserModel = require('../Model/userModel.js');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sendMail = require('../Helpers/Email');
const { signUpTemplate, verifyTemplate, forgotPasswordTemplate} = require('../Helpers/HTML');

const fs = require('fs');

exports.signUp = async(req,res)=>{
    try {
        const {Name,Email,Password,Stack} = req.body
        const existingUser = await UserModel.findOne({Email});
        if (existingUser) {
            return res.status(400).json({
                message: 'User already exists'
            })
        }

        const saltedeRounds = await bcryptjs.genSalt(10);
        const hashedPassword = await bcryptjs.hash(Password, saltedeRounds);

        const user = new UserModel({
            Name,
            Email,
            Password: hashedPassword,
            Stack,
            Image:req.file.fileName
        })
        //get the token to verify if user signs up
        const userToken = jwt.sign({ 
        id: user._id, 
        // email: user.Email,
        Password:user.Password
        }, process.env.JWT_SECRET,
        { expiresIn: "1h" })

        const verifyLink = `${req.protocol}://${req.get("host")}/api/v1/user/verify/${userToken}`
        // console.log(userToken);

        let mailOptions = {
            email: user.Email,
            subject: 'Verification email',
            html: signUpTemplate(verifyLink, user.FullName),
        }
        console.log(user.Email);

        await user.save();
        await sendMail(mailOptions);

        res.status(200).json({
            message:`User created successfully`
        })
    } catch (err) {
        res.status(500).json(err.message)
    }
}

exports.logIn = async (req, res) => {
    try {
        const {Email,Password} = req.body;
        const checkMail = await UserModel.findOne({Email});
        if (!checkMail) {
            return res.status(404).json({
                message: 'User with email not found'
            })
        }

        const confirmPassword = await bcryptjs.compare(Password,checkMail.Password);
        if (!confirmPassword) {
            return res.status(404).json({
                message: 'Incorrect Password'
            })
        }

        if (!checkMail.isVerified) {
            return res.status(400).json({
                message: 'User not verified, Please check you email to verify your account.'
            })
        }

        const Token = await jwt.sign({
            userId: checkMail._id,
            Email: checkMail.Email
        }, process.env.JWT_SECRET, { expiresIn: '1h' })

        res.status(200).json({
            message: 'Login successfully',
            data: checkMail, 
            Token
        })
    } catch (err) {
        res.status(500).json(err.message)
    }
}

exports.logout = async(req,res)=>{
    try { 
        const {Email,Password} = req.body
        const checkEmail= await UserModel.findOne({Email})
        if(!checkEmail){
            return res.status(404).json({
                message:`Invalid email`
            })
        }
        if(checkEmail.Password != Password){
            res.status(400).json({
                message:`Invalid password`
            })
        }else{
            res.status(200).json({
                message:`Logout successful`,
                data:checkEmail
            })
        }
    } catch (err) {
        res.status(500).json(err.message)
    }
}

exports.verifyEmail = async (req, res) => {
    try {
        // Extract the token from the request params
        const {Token} = req.params;
        // Extract the email from the verified token
        const {Email} = jwt.verify(Token,process.env.JWT_SECRET);
        // Find the user with the email
        const user = await UserModel.findOne({Email});
        // Check if the user is still in the database
        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            })
        }
        // Check if the user has already been verified
        if (user.isVerified) {
            return res.status(400).json({
                message: 'User already verified'
            })
        }
        // Verify the user
        user.isVerified = true;
        // Save the user data
        await user.save();
        // Send a success response
        res.status(200).json({
            message: 'User verified successfully'
        })

    } catch (err) {
        if (err instanceof jwt.JsonWebTokenError) {
            return res.json({message: 'Link expired.'})
        }
        res.status(500).json(err.message)
    }
}

exports.resendVerificationEmail = async (req, res) => {
    try {
        const {Email} = req.body;
        // Find the user with the email
        const user = await UserModel.findOne({Email});
        // Check if the user is still in the database
        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            })
        }
        // Check if the user has already been verified
        if (user.isVerified) {
            return res.status(400).json({
                message: 'User already verified'
            })
        }

        const Token = jwt.sign({Email: user.Email }, process.env.JWT_SECRET, { expiresIn: '20mins' });
        const verifyLink = `${req.protocol}://${req.get('host')}/api/v1/user/verify/${Token}`
        let mailOptions = {
            Email: user.Email,
            subject: 'Verification email',
            HTML: verifyTemplate(verifyLink, user.FullName),
        }
        // Send the the email
        await sendMail(mailOptions);
        // Send a success message
        res.status(200).json({
            message: 'Verification email resent successfully'
        })

    } catch (err) {
        res.status(500).json(err.message)
    }
}

exports.ForgetPassword = async(req,res) =>{
    try {
        const {Email} = req.body
        // Find the user with the email
        const user = await UserModel.findOne({Email});
        // Check if the user is still in the database
        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            })
        }

        const ResetToken = jwt.sign({Email: user.Email }, process.env.JWT_SECRET, { expiresIn: '20mins' });

        const verifyLink = `${req.protocol}://${req.get('host')}/api/v1/user/reset password/${ResetToken}`
        const mailOptions = {
            Email: user.Email,
            subject: 'Reset password',
            HTML:forgotPasswordTemplate(verifyLink,user.FullName)
        }

        await sendMail(mailOptions)

        res.status(200).json({
            message:`Email for reset password sent successfully`
        })
    } catch (err) {
        res.status(500).json(err.message)
    }
}

exports.ResetPassword = async (req,res)=>{
    try {
        //get the token from params
        const {Token} = req.params
        const {Password} = req.body

        //confirm the new password
        const {Email} = jwt.verify(Token,process.env.JWT_SECRET)
        // Find the user with the email
        const user = await UserModel.findOne({Email});
        // Check if the user is still in the database
        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            })
        }

        const saltedeRounds = await bcryptjs.genSalt(10);
        const hashedPassword = await bcryptjs.hash(Password, saltedeRounds);

        user.Password = hashedPassword
        console.log(hashedPassword)

        await user.save()

        res.status(200).json({
            message:`Reset password successfully`
        })
    } catch (err) {
        if(err instanceof jwt.JsonWebTokenError){
            return res.status(400).json('Link has expired,Please request for a new link')
        }
        res.status(500).json(err.message)
    }
}

exports.changePassword = async(req,res)=>{
    try {
       const Token = req.params
       const {Password,OldPassword} = req.body
       const {Email} = jwt.verify(Token.process.env.JWT_SECRET) 
       //check for user
       const user = await UserModel.findOne({Email})
       if(!user){
        return res.status(400).json('User not found')
       }
       const verifyPassword = await bcryptjs.compare(OldPassword,user.Password)
       if(!verifyPassword){
        return res.status(400).json('Password does not correspond with  the previous password')
       }
       const saltedeRounds = await bcryptjs.genSalt(10)
       const hashedPassword = await bcryptjs.hash(Password,saltedeRounds)
       user.Password = hashedPassword

       await user.save()
       res.status(200).json('Password changed successfully')

    } catch (err) {
       res.status(500).json(err.message) 
    }
}

exports.getOne = async(req,res)=>{
    try {
        const {id} = req.params
        const oneUser = await UserModel.findOne({id})
        if(!oneUser){
            return res.status(404).json({
                message:`User not found`
            })
        }
        res.status(200).json({
            message:`User information`,
            data:oneUser
        })
    } catch (err) {
        res.status(500).json(err.message)
    }
}

exports.getAll = async(req,res)=>{
    try {
        const users = await UserModel.find()
        if(users.length === 0){
            return res.status(404).json({
                message:`No user found in the database`
            })
        }
        res.status(200).json({
            message:`User information`,
            data:users
        })
    } catch (err) {
        res.status(500).json(err.message)
    }
}

exports.updateUser = async(req,res)=>{
    try {
        const {Name,Stack} = req.body
        const oneUser = await UserModel.findOne({id})
        if(!oneUser){
            return res.status(404).json({
                message:`User not found`
            })
        }
        const data = {
            Name:Name || user.Name,
            Stack:Stack || user.Stack,
            Image:user.Image
        }

        //check if user is posting a image
        if(req.file && req.file.fileName){
            const oldFilePath = `uploads/${user.Image}`
            //check if the image exist inside of the path
            if(fs.existSync(oldFilePath)){
                //delete the existing image
                fs.unlinkSync(oldFilePath)
                //update the data object
                data.Image = req.file.originalname
            }
        }
        //update the change to our database
        const updateUser = await UserModel.findByIdAndUpdate(id,data,{new:true})
        //send a success response to the user
        res.status(200).json({
            message:`User updated successfully`,
            data:updateUser
        })
    } catch (err) {
        res.status(500).json(err.message)
    }
}