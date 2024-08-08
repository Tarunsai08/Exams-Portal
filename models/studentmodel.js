const mongoose = require('mongoose');

const newSchema = new mongoose.Schema({
    rollno: String,
    section:String,
    password:String,
    marks: {
        oose: { type: Number, default: 0 },
        wt: { type: Number, default: 0 },
        ml: { type: Number, default: 0 },
        ire: { type: Number, default: 0 },
        nndl: { type:Number, default:0 },
        cns: { type:Number, default:0 }
    }
});
const NewModel = mongoose.model('student', newSchema);
module.exports = NewModel;
