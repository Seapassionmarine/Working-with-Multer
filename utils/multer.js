const multer = require('multer')

const storage = multer.diskStorage({
    destination:(req,file,callback)=>{
        callback(null,'./uploads')
    },
    filename:(req,file,callback)=>{
        callback(null,file.originalname)
    }
})

const fileFilter = (req,file,callback)=>{
    if(file.minetype.startsWith('image/')){
        callback(null,true)
    }else{
        callback(new Error('Image only'))
    }
}

const fileSize = {
    limits:1024 * 1024 * 10
}
const upload = multer({
    storage,
    fileFilter,
    limits:fileSize
})

module.exports = upload