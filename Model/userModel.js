const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    Name:{type:String,required:true},
    Stack:{type:String,required:true},
    Email:{type:String,require:true,unique:true},
    Password:{type:String,require:true},
    Image:{type:String,required:true}
},{timestamps:true})

const UserModel = mongoose.model('user',userSchema)
module.exports = UserModel