const mongoose=require('mongoose')
const teacherSchema=new mongoose.Schema({
    name:String,
    password:String,
    subject:String,
    section:String,
    questionpaperstatus:String,
})
module.exports=mongoose.model('teacher',teacherSchema)