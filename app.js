const express = require('express')
const path = require('path')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const auth = require('./utils/middlewares/auth')
const automate = require('./utils/helpers/fetchIncome')
const validator = require('validator')
require('dotenv')
const { Op } = require('sequelize');

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
app.use('/static', express.static('node_modules/sweetalert2/dist'));

app.get('/', auth, async(req,res) => {

    try {

        title= 'Bolt Income Tracker'
        const incomes = await Income.findAll({
            where: {
                user_id: req.user.id
            }
        })

        res.render('index', {user: req.user,incomes, title})
    } catch(e) {
        console.log(e)
    }

})

app.get('/profile', auth, async(req,res) => {

    const title = 'Profile'
    try {
        res.render('profile', {user: req.user, title})
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

        const user = await User.findOne({
            where: {
                email: email
            }
        })

        if(user) {
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

app.post('/users/update', auth, async(req,res) => {
    
    try {

        const { firstName, lastName, email, password, repassword, age } = req.body

        if(validator.isEmpty(firstName) || validator.isEmpty(lastName) ||validator.isEmpty(email) ) {
            return res.status(400).json({
                message: 'First Name, Last Name, and Email are required.'
            });
        }

        const user = await User.findByPk(req.user.id)
        
        if(!user) {
            return res.status(400).json({
                message: 'You need to log in again'
            })
        }

        if(password) {

            const isMatch = password.trim() === repassword.trim()

            if(!isMatch) {
                return res.status(400).json({
                    message: 'Password does not match'
                })
            }

            const hashedPassword = await bcrypt.hash(password, 10)
            user.password = hashedPassword
        }

        if(age) {
            user.age= age
        }
        user.firstName = firstName
        user.lastName = lastName
        user.email = email

        await user.save()

        res.status(200).json({
            user,
            message: 'Successfully updated!'
        })


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
            { expiresIn: '12h' } // Token expiration time (optional)
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
        const password = req.body.password

        const allData = await automate(username,password)

        if(!allData) {
            return res.status(404).json({
                message: 'Incorrect password'
            })
        }
    
        for (const data of allData) {

            const checkRecord = await Income.findOne({
                where: {
                    from: data.from
                }
            });

            if (checkRecord) {
               continue
            }

            const newIncome = await Income.create({
                user_id: req.user.id,
                cash: data.cash,
                total: data.total,
                from: data.from,
                to: data.to,
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


app.post('/income/update', auth, async(req,res) => {

    try {

        const { id, from, to, cash, price} = req.body
            
        const existingIncome = await Income.findByPk(id)

        const fromDate = new Date(from);
        const toDate = new Date(to);

        if (toDate <= fromDate) {
            return res.status(400).json({
                message: "'To' date must be greater than 'From' date."
            });
        }

        if(!existingIncome) {
            return res.status(404).json({
                message: 'Income record not found'
            });
        }

        existingIncome.cash= cash
        existingIncome.price = price
        existingIncome.total = parseFloat(cash)+ parseFloat(price)
        existingIncome.from = from
        existingIncome.to = to
        existingIncome.net_price = parseFloat(price)-170

        await existingIncome.save()
        
        res.send(existingIncome)

    } catch(e) {
        console.log(e)
        return res.status(404).json({
            message: 'An error occurred'
        })
    }

})

app.post('/income/save', auth, async(req,res) => {

    try {
        const {from, to, cash, price, zus} = req.body

        if(validator.isEmpty(from) || validator.isEmpty(to) ||validator.isEmpty(price) ) {
            return res.status(400).json({
                message: 'All fields are required. Please provide valid from, to, and price values.'
            });
        }
            
        // Convert dates to a comparable format
        const fromDate = new Date(from);
        const toDate = new Date(to);

        if (toDate <= fromDate) {
            return res.status(400).json({
                message: "'To' date must be greater than 'From' date."
            });
        }
        // Check if the date range overlaps with any existing records
        const conflictingIncome = await Income.findOne({
            where: {
                user_id: req.user.id, // Ensure only the user's records are checked
                [Op.or]: [
                    {
                        from: {
                            [Op.lte]: toDate // Existing 'from' date is less than or equal to the new 'to' date
                        },
                        to: {
                            [Op.gte]: fromDate // Existing 'to' date is greater than or equal to the new 'from' date
                        }
                    }
                ]
            }
        });

        if (conflictingIncome) {
            return res.status(409).json({
                message: 'You already have an income between those dates'
            });
        }

        const total = parseFloat(price)+ parseFloat(cash)
        var net_price = parseFloat(price)-170
        var has_zus = false

        if (zus) {
            has_zus = true
            if(req.user.age && req.user.age >=26) {
                net_price -= 179.95
            }else {
                net_price -= 145.95
            }
        }

        const newIncome = await Income.create({
            user_id: req.user.id,
            from: from,
            to:to,
            price: price,
            cash: cash,
            total:total,
            net_price:net_price,
            has_zus: has_zus
        })
        
        res.send(newIncome)

    } catch(e) {
        console.log(e)
        return res.status(404).json({
            message: 'An error occurred'
        })
    }

})


app.delete('/income/delete', auth, async(req,res) => {

    try {

        const id = req.body.id
            
        const income= await Income.findByPk(id)

        if (!income) {
            return res.status(404).json({ message: 'Record not found' });
        }

        await income.destroy();
        
        res.status(200).send()

    } catch(e) {
        console.log(e)
        return res.status(404).json({
            message: 'An error occurred'
        })
    }

})


app.listen(port, (req,res) => {
    console.log(`Server is up on ${port}`)
})