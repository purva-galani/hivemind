const express=require('express');
const mongoose=require('mongoose');
require('dotenv').config();
const cors=require('cors');
const app=express();
const User=require('./models/User.js');
const bcrypt=require('bcryptjs');
const jwt=require('jsonwebtoken')
app.use(express.json());
const cookieParser=require('cookie-parser');
const path = require('path');
app.use(cookieParser());
const Place=require('./models/Places.js')

const bcryptSalt = bcrypt.genSaltSync(10);
const jwtSecret = "asdfghjkl";
//const db = require('mongodb').MongoClient
//const url=process.env.MONGO_URL;
const imageDownloader = require('image-downloader')

app.use('/uploads',express.static(__dirname+'/uploads'))

app.use(cors({
    origin:'http://localhost:4200',
    credentials:true,
}));

// db.connect(process.env.MONGO_URL,(err)=>{
//     if(err){
//         throw err;

//     }
//     else{
//         console.log("Connected Successfully")
//     }
// }

mongoose.connect(process.env.MONGO_URL).then(() => {
  console.log("database connected")
})  

//connecting to the database
// try{
//     mongoose.connect(process.env.MONGO_URL);
// }catch(e){
//     console.log(e)
// }

let sessiontoken=null;

app.get('/', (req,res)=>{
    sessiontoken=req.cookies.token;
    
    console.log(sessiontoken);
});

app.get('/test',(req,res)=>{
    const cookie=req.cookies.token;
    if(cookie){
        jwt.verify(cookie,'asdfghjkl',{},async (err,userData)=>{
            if (err) throw err;
    
            res.json(userData)
            // console.log()
        })
        res.json(cookie);
    }
    else{
        res.json("no cookie");
    }

});

app.post('/register',async (req,res)=>{
   
    const {name,email,password} = req.body;
    // res.json({name,email,password});
    try{
        const userDoc=await User.create({
            name,
            email,
            password:bcrypt.hashSync(password, bcryptSalt)
        });
        console.log(userDoc)
        res.json(userDoc)
    }catch(e){
        res.status(422).json(e);
    }

})

app.post('/login',async(req,res)=>{
    mongoose.connect(process.env.MONGO_URL);
    const {email,password}=req.body;
    
        const userDoc=await User.findOne({email});
        if(userDoc){

            const passOk=bcrypt.compareSync(password,userDoc.password);
            if(passOk){
                jwt.sign({
                    name:userDoc.name,
                    email:userDoc.email,
                    id:userDoc._id
                },jwtSecret,{},(err,userData)=>{
                    if (err) throw err;
                    res.cookie('token',userData,{expires:new Date(Number(new Date()) + 315360000000)}).json(userDoc)
                    sessiontoken=userData;
                    console.log(sessiontoken);
                })
                
            }
            else{
                res.status(422).json("Password Incorrect")
            }
        }
        else{
            res.json('not found')
        }
        
        // sessiontoken=req.cookies.token;
})


app.get('/profile', (req,res) => {
    mongoose.connect(process.env.MONGO_URL);
   
    // const token = req.cookies;
const cookie = sessiontoken
// const cookie = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoicHJhdGhhbSIsImVtYWlsIjoidGVzdEBnbWFpbC5jb20iLCJpZCI6IjY1YjI4MGY3ZDZmMTViZWU3MGNiMDg0YyIsImlhdCI6MTcwNzE0OTgzOH0.bRfxRvED5s-euJjA0l1JH2XY2D-f4UbuYZ_arHkmF7s'
    console.log(cookie)
    // res.send(cookie)
    if (cookie) {
      jwt.verify(cookie, jwtSecret, {}, async (err, userData) => {
        if (err) throw err;
        const {name,email,_id} = await User.findById(userData.id);
        res.json({name,email,_id});
      });
    } else {
      res.json(null);
      console.log("no token")
    }
  });


  app.post('/logout',(req,res)=>{
    res.cookie('token','').json(true);
    // res.clearCookie();
    // console.log(req.cookies.token)
    sessiontoken='';
    
  })

  app.post('/place', (req,res) => {
    mongoose.connect(process.env.MONGO_URL);
    // const {token} = req.cookies;
    console.log()
    const {
      title,address,addedPhotos,description,
      perks,extraInfo,checkIn,checkOut,maxGuests,price
    } = req.body;
    jwt.verify(sessiontoken, jwtSecret, {}, async (err, userData) => {
      if (err) throw err;
      const placeDoc = await Place.create({
        owner:userData.id,
        title,address,photos:addedPhotos,description,
        perks,extraInfo,checkIn,checkOut,maxGuests,price
      });
      res.json(placeDoc);
    });
  });

  app.get('/places', async (req,res) => {
    mongoose.connect(process.env.MONGO_URL);
    console.log(await Place.find());
    res.json( await Place.find() );
  });

  app.get('/places/:id', async (req,res) => {
    mongoose.connect(process.env.MONGO_URL);
    const {id} = req.params;
    res.json(await Place.findById(id));
  });
  
  app.post('/upload-by-link',async (req,res)=>{
    const {link} = req.body;
    const newName=Date.now()+".jpg"
    await imageDownloader.image({
      url: link,
      dest : __dirname+'/uploads/'+newName
    });
    res.json(newName)
  })

  app.post('/api/bookings', async (req, res) => {
    mongoose.connect(process.env.MONGO_URL);
    const userData = await getUserDataFromReq(req);
    const {
      place,checkIn,checkOut,numberOfGuests,name,phone,price,
    } = req.body;
    Booking.create({
      place,checkIn,checkOut,numberOfGuests,name,phone,price,
      user:userData.id,
    }).then((doc) => {
      res.json(doc);
    }).catch((err) => {
      throw err;
    });
  });
  

  app.get('/api/bookings', async (req,res) => {
    mongoose.connect(process.env.MONGO_URL);
    const userData = await getUserDataFromReq(req);
    res.json( await Booking.find({user:userData.id}).populate('place') );
  });

app.listen(4000)