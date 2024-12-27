const express = require('express')
const path = require('path')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const auth = require('./utils/middlewares/auth')
const automate = require('./utils/helpers/fetchIncome')
require('dotenv')

const User = require('./utils/models/User')
const Income = require('./utils/models/Income')

const port = process.env.PORT || 8003

const app = express()
const publicDir = path.join(__dirname, '/public')
const viewsDir = path.join(__dirname, '/views')
const downloadDir = path.join(__dirname, '/downloads')

app.set('view engine', 'ejs')
app.set('views', viewsDir)
app.use(express.static(publicDir))
app.use(express.static(downloadDir))
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use('/static', express.static('node_modules/izitoast/dist'));


app.get('/', auth, async(req,res) => {

    try {

        const incomes = await Income.findAll({
            where: {
                user_id: req.user.id
            }
        })

        res.render('index', {user: req.user,incomes})
    } catch(e) {
        console.log(e)
    }

})

app.get('/login', (req,res) =>  {

    res.render('login')

})

app.get('/logout', (req,res) => {

    res.cookie('token', '', {expries: new Date(0)})
    res.redirect('/login')

})

app.post('/users/save', async(req,res) => {
    
    try {

        const { firstName, lastName, email, password, has_zus,key } = req.body

        if (key != process.env.SECRET_KEY) {
            return res.status(400).json({
                message: 'Incorrect key'
            })
        }

        const count = await User.count();

        if(count > 0) {
            return res.status(400).json({
                message: 'There is already a user exists with these credentials'
            })
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        await User.create({
            firstName: firstName,
            lastName, lastName,
            email:email,
            password:hashedPassword,
            has_zus: has_zus
        })

        res.status(200).send()


    } catch(e) {
        console.log(e)
    }
})

app.post('/login', async(req,res) => {
    const { email, password } = req.body;

    try {
        // Find the user by email
        const user = await User.findOne({
            where: { email: email }
        });

        if (!user) {
            return res.status(400).send({ message: 'User not found' });
        }

        // Compare the password with the hashed password in the database
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(400).send({ message: 'Invalid credentials' });
        }

        // Create a JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email }, // Payload (user data you want to encode)
            process.env.SECRET_KEY, // Secret key
            { expiresIn: '1h' } // Token expiration time (optional)
        );

        res.cookie('token', token, {httpOnly:true})

        // Send the token as the response
        res.status(200).send({
            message: 'Login successful',
            token: token // Send the JWT token to the client
        });

    } catch (e) {
        console.log(e);
        res.status(500).send({ message: 'An error occurred during login' });
    }
})

app.post('/get-income', auth, async(req,res) => {
    
    try {
        const username = 'turgutsalgin3455@gmail.com'
        const password = 'B@ck3nd!123'

        const allData = await automate(username,password)
    
        for (const data of allData) {

            const checkRecord = await Income.findOne({
                where: {
                    week: data.week
                }
            });

            if (checkRecord) {
               continue
            }

            const newIncome = await Income.create({
                user_id: req.user.id,
                week: data.week,
                price: data.price,
                net_price: data.net_price,
                file: data.file
            });
            console.log(`New income created for week ${data.week}: ${newIncome.price}`);
        }
        
        res.json({data:allData})
    } catch(e) {
        console.log(e)
    }

})

app.listen(port, (req,res) => {
    console.log(`Server is up on ${port}`)
})