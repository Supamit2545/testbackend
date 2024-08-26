const { Client } = require('pg');
const express = require('express')
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt')
const app = express()
const session = require('express-session')
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer')
require('dotenv').config();



const port = 3001

// Middle Ware
app.use(bodyParser.json())
app.use(cors({
    origin: ['https://myfamshops.vercel.app'],
    methods:["POST","GET",],
    credentials: true
}))
app.use(express.json())
app.use(cookieParser())
app.use(session({
   secret: 'secret',
   resave: true,
   saveUninitialized: true,
}))

const secret = 'mysecret'
const user = process.env.DB_USER
const host = process.env.DB_HOST
const datab = process.env.DB_DATABASE
const pass = process.env.DB_PASSWORD


const connection = new Client({
    user: `${user}`,
    host: `${host}`,
    database: `${datab}`,
    password: `${pass}`,
    port: 5432,
    ssl: {
        rejectUnauthorized: false
    }
});

connection.connect()
.then(() => console.log('Connected to PostgreSQL'))
.catch(err => console.error('Connection error', err.stack))

app.get('/', (req , res) => {
   res.send('From Server Side')
});
app.get('/user', async (req , res) => {
   try{
        const AuthToken = req.cookies.token
        // console.log("AuthToken" , AuthToken)
        const user = jwt.verify(AuthToken , secret)
       
        const results = await connection.query("SELECT * FROM users");

        res.json({
           users : user.username
        })

   }catch(err){

   }
});

app.get('/read', (req,res)=>{
    connection.query("SELECT * FROM users " ,(err, result) =>{
        if(err){
            console.log(err);
        }else{
            res.send(result.rows)
        }
    })
})

app.post('/Register', async(req,res)=>{
    const username = req.body.username
    const password = req.body.password
    let hashedpassword = await bcrypt.hash(password ,10)
    const sql ={
        text:"INSERT INTO users (username,password) VALUES ($1, $2)",
        values: [username , hashedpassword]
    }
    
    connection.query(sql),(err , result)=>{
        if(err){
            console.log(err)
        }else{
            res.send({ message: 'User created successfully', user: result.rows[0] })
        }
    }
})

app.post('/login', async (req, res) => {
    try{
        const { username, password } = req.body;
        const result = await connection.query("SELECT * FROM users WHERE username = $1",[username])
        
        if(result.rows.length === 0){
            return res.status(404).json({message:"Username don't have in database"})
        }

        const user = result.rows[0]
        const isMatch = await bcrypt.compare(password , user.password)


        if(!isMatch){
            return res.status(400).json({
                message: "Invalid Password"
            })
            return false
        }

        const token = jwt.sign({username}, secret ,{expiresIn:'1h'})

        res.cookie('token',token,{
            maxAge: 3600 * 1000,
            sameSite:'none',
            secure: true,
            httpOnly: false,
        })

        res.json({
            message:"Login Successful",
        })
    }catch(err){
        console.log("Error",err)
        res.status(401).json({
            message : "Login Failed",
            err
        })
    }
});

app.get('/logout', async(req, res) => {
    res.clearCookie('token'); // ปรับ path และ domain ตามที่คุณใช้
    req.session = null;
    req.cookies.token = null;
    res.status(200).json({ message: 'Logged out and cookies cleared' });
});

app.get('/GetReviewps', async(req, res)=>{
    connection.query("SELECT * FROM psreview " ,(err, result) =>{
        if(err){
            console.log(err);
        }else{
            res.send(result.rows)
        }
    })
})

app.post('/SendReviewps', async(req,res)=>{
    const displayname  = req.body.displayname
    const content = req.body.content
    
    const sql ={
        text:"INSERT INTO psreview (displayname,content) VALUES ($1, $2)",
        values: [displayname , content]
    }
    
    connection.query(sql),(err , result)=>{
        if(err){
            console.log(err)
        }else{
            res.send({ message: 'User created successfully', user: result.rows[0] })
        }
    }
})


app.post('/save-rating', (req, res) => {
    const displayname = req.body.displayname;
    const content = req.body.content;
    const rate = req.body.rate;
    

        const sql = {
            text:"INSERT INTO resreview (displayname,content,rate) VALUES ($1 , $2 , $3)",
            values:[displayname,content,rate]
        };
    
        connection.query(sql),(err,result)=>{
            if(err){
                console.log(err)
            }else{
                res.send({ message: 'successfully'})
            }
        }
    
        res.status(200).json({ success: true,});
});
app.get('/getRating',(req,res)=>{
    connection.query("SELECT * FROM resreview " ,(err, result) =>{
        if(err){
            console.log(err);
        }else{
            res.send(result.rows)
        }
    })
})
// 