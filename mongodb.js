require('dotenv').config();
const mongoose = require('mongoose');

//mongoDB setup
const DB = process.env.REACT_APP_URI;

mongoose.connect(DB,{
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(()=>{
    console.log(`Database has been successfully connected!`);
}).catch(err => console.log("no connection!"));

const Schema =  mongoose.Schema;
const objectSchema = new Schema({
    fname: {type: String, required: true},
    lname: {type: String, required: true},
    username: {type: String, required: true, unique: true},
    email: {type: String, required: true, unique: true},
    pasword: {type: String, required: true},
    confirm_pasword: {type: String, required: true},
    online: {type: String, default: 'Offline'},
    recentTab: [{
        username: {type: String},
        fname: {type: String},
        lname: {type: String}
    }],
    messages: [{
        username: {type: String},
        data: [{
            msg:  {type: String},
            sent: {type: String},
            unique: {type: String}
        }]
    }],
    tokens: [{
        token: {type: String, required: true}
    }]
})

const student = mongoose.model("student",objectSchema);

module.exports = {student,objectSchema};