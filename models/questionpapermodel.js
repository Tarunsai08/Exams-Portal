const mongoose=require('mongoose')
const QuestionpaperSchema=new mongoose.Schema({
    subject:String,
    selected:{type:String, default:"no"},
    qpArray: {
        type: Array,
        default: []
    }
})
module.exports=mongoose.model('questionpaper',QuestionpaperSchema)