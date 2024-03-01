const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');

const app = express();
const port = 3000;

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/myapp', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Error connecting to MongoDB:', err));

// Define user schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    country: { type: String, required: true }, // Add country field
    gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true }, // Add gender field
    age: { type: Number, required: true } // Add age field
});
userSchema.pre('save', async function(next) {
    const user = this;
    if (!user.isModified('password')) return next(); // Only hash the password if it's modified (or new)
    const hash = await bcrypt.hash(user.password, 10); // 10 is the number of salt rounds
    user.password = hash;
    next();
});
const user = mongoose.model('user', userSchema);

const itemSchema = new mongoose.Schema({
    itemId: String,
    pictures: [String],
    names: [{ locale: String, name: String }],
    descriptions: [{ locale: String, description: String }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    deletedAt: { type: Date }
});

const Portfolio = require('./portfolio'); // Import the Portfolio model from portfolio.js
const Item = mongoose.model('Item', itemSchema);
const User = mongoose.model('User', userSchema);

const portfolioSchema = new mongoose.Schema({
    city: { type: String, required: true },
    items: [itemSchema]
});


app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
    }
});

const upload = multer({ storage: storage });
app.get('/portfolios', async (req, res) => {
    try {
        // Fetch portfolios from the database
        const portfolios = await Portfolio.find();
        
        // Fetch items from the database
        const items = await Item.find();

        // Render the 'portfolios.ejs' view and pass the fetched portfolios and items to it
        res.render('portfolios', { portfolios, items });
    } catch (error) {
        console.error('Error fetching portfolios:', error);
        res.status(500).send('Error fetching portfolios');
    }
});

app.get('/admin_panel', async (req, res) => {
    try {
        const items = await Item.find();
        res.render('admin_panel', { items });
    } catch (error) {
        console.error('Error fetching items:', error);
        res.status(500).send('Error fetching items');
    }
});

app.post('/admin/add-item', upload.single('picture'), async (req, res) => {
    try {
        const { itemId, name, description } = req.body;

        // Check if file was uploaded
        if (!req.file) {
            throw new Error('No file uploaded');
        }

        // Get the filename of the uploaded picture
        const picture = '/uploads/' + req.file.filename;

        // Create a new Item instance with the provided data
        const newItem = new Item({
            itemId,
            pictures: [picture],
            names: [{ name }],
            descriptions: [{ description }]
        });

        // Save the new item to the database
        await newItem.save();

        res.redirect('/admin_panel');
    } catch (error) {
        console.error('Error adding item:', error);
        res.status(500).send('Error adding item');
    }
});

app.post('/admin/edit-item/:id', upload.array('pictures', 5), async (req, res) => {
    try {
        const { names, descriptions } = req.body;
        const pictures = req.files.map(file => '/uploads/' + file.filename);
        const updatedItem = {
            pictures,
            names: JSON.parse(names),
            descriptions: JSON.parse(descriptions),
            updatedAt: new Date()
        };
        const item = await Item.findByIdAndUpdate(req.params.id, updatedItem, { new: true });
        res.redirect('/admin_panel');
    } catch (error) {
        console.error('Error editing item:', error);
        res.status(500).send('Error editing item');
    }
});

app.post('/admin/delete-item/:id', async (req, res) => {
    try {
        await Item.findByIdAndDelete(req.params.id);
        res.redirect('/admin_panel');
    } catch (error) {
        console.error('Error deleting item:', error);
        res.status(500).send('Error deleting item');
    }
});

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user) {
        const match = await bcrypt.compare(password, user.password);
        if (match) {
            res.redirect('/islamabad');
        } else {
            res.send('Incorrect password');
        }
    } else {
        res.send('User not found');
    }
});

app.get('/signup', (req, res) => {
    res.render('signup');
});

app.post('/signup', async (req, res) => {
    try {
        const { username, email, password, country, gender, age, role } = req.body;
        if (role !== 'user' && role !== 'admin') {
            throw new Error('Invalid role specified');
        }
        const user = new User({ username, email, password, country, gender, age, role });
        await user.save();

        const transporter = nodemailer.createTransport({
            service: 'hotmail',
            auth: {
                user: '222291@astanait.edu.kz', // Enter your outlook email
                pass: '3710508978969' // Enter your pass
            }
        });
        const mailOptions = {
            from: '222291@astanait.edu.kz', // Enter your email
            to: email,
            subject: 'Welcome to Our Platform',
            text: 'Congratulations! You have successfully signed up for our platform.'
        };
        await transporter.sendMail(mailOptions);

        res.redirect('/islamabad');
    } catch (err) {
        console.error('Error signing up user:', err);
        res.status(500).send('Error signing up user');
    }
});
app.get('/islamabad', (req, res) => {
    res.render('islamabad');
});

app.post('/admin/login', async (req, res) => {
    const { username, password } = req.body;
    console.log("Username:", username); // Add this line
    console.log("Password:", password); // Add this line
    const user = await User.findOne({ username });
    console.log("User:", user); // Add this line
    if (user && user.role === 'admin') {
        const match = await bcrypt.compare(password, user.password);
        if (match) {
            res.redirect('/admin_panel');
        } else {
            res.send('Incorrect password');
        }
    } else {
        res.send('Admin login failed!');
    }
});

app.get('/admin', (req, res) => {
    res.render('admin');
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
