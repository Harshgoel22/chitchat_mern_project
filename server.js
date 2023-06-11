require('dotenv').config();
const express = require('express');
const {student} = require('./mongodb');
const {app} = require('./nodemailer.js');
const http = require("http")
const {Server} = require("socket.io");

const uniqueId = () => {
  const dateString = Date.now().toString(36);
  const randomness = Math.random().toString(36).substring(0,2);
  return dateString + randomness;
};

const server = http.createServer(app);

app.post('/onChangeSearch',async (req,res)=>{
    const {searchTag, id} = req.body;
    // console.log(`searching: ${searchTag}`);
    let data = (searchTag==="") ? 
        await student.find({username: id}) : 
        await student.find({$and: [
            {username: new RegExp(searchTag, 'i')},
            {username: {$ne: id}}
        ]});
    // console.log(`search_output: ${data[0].fname}`);
    if(searchTag==="" && data.length!==0) res.json(data[0].recentTab);
    else res.json(data);
})

app.post('/updateRecentTab',async (req,res)=>{
    const {username, id, addition} = req.body;
    const item = await student.find({username: id, 'recentTab.username': username});
    // console.log(`item: ${item}`);

    if(item.length===0){
        // console.log('running');
        const {fname, lname} = await student.findOne({username});
        await student.findOneAndUpdate({username: id},{$push: {recentTab: {username:username, fname:fname, lname:lname}}});
    }
    let uname = username;
    if(addition!=='yes') uname = addition;

    const data = await student.findOne({$and: [
        {username: uname},
        {username: {$ne: id}}
    ]});
    // console.log(`msgData: ${data}`);
    res.json(data);
})

//socket io connection
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET","POST"]
    }
});

io.on("connection",(socket)=>{
    // console.log(`user connected: ${socket.id}`);

    socket.on("send_message",(data)=>{
        console.log("message: ",data);
        socket.broadcast.emit("receive_message",data.sender);
    });

    socket.on("delMessage",(data)=>{
        console.log(`index: ${data.itr}`);
        socket.broadcast.emit("delMsgReceiver",(data.itr));
    })

    socket.on("disconnect",()=>{
        // console.log("User disconnected: ",socket.id);
    })
});

app.post('/sendMsg',async (req,res)=>{
    const data = req.body;
    //updating database
    const filter1 = {'username': data.sender, 'messages.username': data.receiver};
    const filter2 = {'username': data.receiver, 'messages.username': data.sender};
    const items1 = await student.find(filter1);
    const items2 = await student.find(filter2);
    const unique = uniqueId();

    //updating msg at sender side
    if(Object.keys(items1).length===0){
        await student.findOneAndUpdate({username: data.sender},{$push: {
            messages: {username: data.receiver, data: [{msg: data.msg, sent: 'send',unique}]}
        }})
    }else{
        await student.findOneAndUpdate(filter1,{$push: {'messages.$.data': {msg: data.msg, sent: 'send',unique}}});
    }
    
    //updating msg at receiver side
    if(Object.keys(items2).length===0){
        await student.findOneAndUpdate({username: data.receiver},{$push: {
            messages: {username: data.sender, data: [{msg: data.msg, sent: 'receive',unique}]}
        }})
    }else{
        await student.findOneAndUpdate(filter2,{$push: {'messages.$.data': {msg: data.msg, sent: 'receive',unique}}});
    }
    
    // const element = await student.findOne({username: data.receiver});
    console.log(`${data.sender} joined room ${data.receiver}`);
    // element.messages.filter((items)=>{return (items.username===data.sender)});
    // console.log(`receiver data: ${element.messages.data}`);

    const item = await student.find({username: data.receiver, 'recentTab.username': data.sender});
    // console.log(`item: ${item}`);

    if(item.length===0){
        console.log('running in socket');
        const {fname, lname} = await student.findOne({username: data.sender});
        await student.findOneAndUpdate({username: data.receiver},{$push: {recentTab: {username: data.sender, fname:fname, lname:lname}}});
    }

    const element = await student.find({username: data.sender});
    if(element.length===0) res.json([]);
    else res.json(element[0].messages);
})

app.post('/getSenderData',async (req,res)=>{
    const {sender} = req.body;
    const element = await student.find({username: sender});
    // console.log(`sender-receiver data: `,element);
    if(element.length===0) res.json([]);
    else res.json(element[0].messages);
})

app.post('/updateOnline',async (req,res)=>{
    const {id,text} = req.body;
    await student.findOneAndUpdate({username: id},{online: text});
    const data = await student.findOne({username: id});
    res.json(data);
})

app.post('/deleteCard',async (req,res)=>{
    const {username,id,fname, lname, active} = req.body;
    await student.findOneAndUpdate({username: id},{$pull: {recentTab: {username, fname, lname}}});
    const data = await student.findOne({username: id});
    let msgData = {};
    if(username!==active){
        msgData = await student.findOne({username: active});
    }
    res.json([data.recentTab,msgData]);
});

app.post('/deleteMsg',async (req,res)=>{
    const {id,username,condition,index} = req.body;
    let messages1 = await student.find({username: id});
    let unique_id;
    // console.log(`index: ${index}`)
    if(messages1.length!==0){
        messages1 = messages1[0].messages;
        messages1 = messages1.filter((items)=> (items.username===username));

        if(messages1.length!==0){
            messages1 = messages1[0].data;
            for(var i=0;i<messages1.length;i++){
                if(i===index) unique_id = messages1[i].unique;
            }
            messages1 = messages1.filter((item,itr)=>(itr!==index));
            // console.log(`messages after deleting: ${messages1}`);
            // console.log(`unique_id: ${unique_id}`);
            await student.findOneAndUpdate(
                {username: id, 'messages.username': username},
                {$set: {'messages.$.data': [...messages1]}}
            )
            if(condition==='everyone'){
                let messages2 = await student.find({username: username});
                if(messages2.length!==0){
                    messages2 = messages2[0].messages;
                    messages2 = messages2.filter((items)=> (items.username===id));
                    messages2 = messages2[0].data;
                    messages2 = messages2.filter((item)=>(item.unique!==unique_id));
                    // console.log(`messages after deleting: ${messages2}`);
                    await student.findOneAndUpdate(
                        {username: username, 'messages.username': id},
                        {$set: {'messages.$.data': [...messages2]}}
                    )
                }
            }
        }
        const data = await student.find({username: id});
        if(data[0].length===0) res.json([]);
        else res.json(data[0].messages);
    }
    else{
        res.json([]);
    }
})

if(process.env.NODE_ENV == "production"){
    app.use(express.static("frontend/build"));
}

const port = process.env.PORT || 5000;

server.listen(port, ()=>{
    console.log(`port is running on server ${port}`);
})
