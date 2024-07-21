const express = require('express')
require('./Config/dbConfig')
const router = require('./Router/userRouter')

const app = express()
app.use(express.json())
app.use('/uploads',express.static)
app.use('/api/v1/user',router)
const PORT = process.env.PORT || 4040;  

app.listen(PORT,()=>{
    console.log(`Server is listening to port: 4040`);
})