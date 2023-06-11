require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const {student} = require('./mongodb');
// const jwt = require('jsonwebtoken');


const app = express();
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cors());

app.get('/',(req,res)=>{
    res.send("hello");
})

app.post('/getlogindata', async (req,res)=>{
    try{
        const {login_username, login_pasword} = req.body.list;
        // console.log(login_username+" -> "+login_pasword);
        const studentRecord = await student.find({'username': login_username});
        let bool = false;
        if(studentRecord.length!==0) bool = await bcrypt.compare(login_pasword, studentRecord[0].pasword);
        // console.log("record -> ",studentRecord);
        // console.log("bool -> ",bool);
        res.json({studentRecord,bool});
    }catch(err){
        throw err;
    }
})

app.post('/submitLoginData',async(req,res)=>{
    try{
        const {login_username, login_pasword} = req.body.list;
        const studentRecord = await student.find({'username': login_username, 'pasword': login_pasword});
        
        /*
        const token =  jwt.sign({_id: studentRecord._id}, process.env.REACT_APP_SECRET_KEY);
        console.log("login_token -> ", token);
        res.cookie("jwt", token, {
            path: 'http://localhost:3000',
            httpOnly: true,
            expires: new Date(Date.now() + 60*60*24*1000),
            secure: false
        })
        await student.updateOne({username: login_username}, {$push:{tokens:{token: token, _id: studentRecord._id}}});
        */
    }catch(err){
        console.log(err);
    }
})

app.post('/getdata',async(req,res)=>{
    try{
        const data = await student.find({[req.body.name]: req.body.value});
        res.json(data);
    }catch(err){
        throw err;
    }
})

app.post('/signup', async (req,res)=>{
    try{
        const {fname, lname, username, email, pasword, confirm_pasword} = req.body.data;
        // console.log(`${fname} -> ${lname} -> ${username} -> ${email} -> ${pasword} -> ${confirm_pasword}`)
        const valid1 = req.body.valid1;
        const valid2 = req.body.valid2;
        // console.log(`valid1 -> ${valid1} && valid2 -> ${valid2}`);
        // console.log("valid1 && valid2 -> ",valid1&&valid2);
        if(valid1&&valid2){
            //hash
            const salt = parseInt(process.env.REACT_APP_SALT);
            const hashPassword = await bcrypt.hash(pasword,salt);
            const hashConfirmPassword = await bcrypt.hash(confirm_pasword,salt);
            // console.log("hash -> ",hashPassword);

            const instance = new student({fname, lname, username, email, pasword: hashPassword, confirm_pasword: hashConfirmPassword});
            await instance.save();

            /*
            const studentRecord = await student.findOne({username: username});
            // console.log(studentRecord);
            const token = jwt.sign({_id: studentRecord._id},process.env.REACT_APP_SECRET_KEY);
            // console.log("token -> ",token);
            res.cookie("jwt",token,{
                expires: new Date(Date.now() + 60*60*24*1000),
                httpOnly: true
            })
            await student.updateOne({_id: studentRecord._id},{$push:{tokens: {token: token}}});
            */
        }
    }catch(e){throw e}
})

app.post('/logout',(req,res)=>{
    const {id} = req.body;
    console.log(`id: ${id}`);
    res.json();
})

module.exports = {app};