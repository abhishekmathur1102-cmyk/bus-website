require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(express.json()); // Need this to parse JSON body in POST requests
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

const Testimonial = require('./models/Testimonial');
const razorpayController = require('./controllers/razorpayController');

const users = [{
    id: 1,
    username: "admin",
    password: "password123"
}];

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Razorpay Payment Routes
app.post('/api/payment/create-order', razorpayController.createOrder);
app.post('/api/payment/verify', razorpayController.verifyPayment);
app.get('/api/payment/order/:orderId', razorpayController.getOrderStatus);

// Testimonials fetch route
app.get('/api/testimonials', async (req, res) => {
    try {
        const testimonials = await Testimonial.find().sort({ createdAt: -1 });
        res.status(200).json(testimonials);
    } catch (error) {
        res.status(500).json({ error: 'Failed to properly fetch testimonials' });
    }
});

// Testimonial create route
app.post('/api/testimonials', async (req, res) => {
    try {
        const { name, rating, comment } = req.body;

        if (!name || !rating || !comment) {
            return res.status(400).json({ error: 'Name, rating, and comment are required fields.' });
        }

        const newTestimonial = new Testimonial({
            name,
            rating,
            comment
        });

        const savedTestimonial = await newTestimonial.save();
        res.status(201).json(savedTestimonial);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create testimonial' });
    }
});

// Google Maps Distance Route
app.get('/api/distance', async (req, res) => {
    try {
        const { origins, destinations } = req.query;
        if (!origins || !destinations) {
            return res.status(400).json({ error: 'Origins and destinations are required.' });
        }

        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Google Maps API key is missing on the server.' });
        }

        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origins)}&destinations=${encodeURIComponent(destinations)}&key=${apiKey}`;

        // Node 18+ has native fetch
        const response = await fetch(url);
        const data = await response.json();

        res.status(200).json(data);
    } catch (error) {
        console.error('Distance calculation error:', error);
        res.status(500).json({ error: 'Failed to calculate distance' });
    }
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        // NOTE: The original logic sent "Login Failed" here.
        // Assuming this was a mistake, but keeping it as is per plan unless I decide to fix it implicitly.
        // Plan said: "fix logic... unless clearly a bug". It IS clearly a bug.
        // I'll change it to "Login Successful" to be helpful, or just standard response.
        // The user asked "what do I need to do to connect to it". The login logic is secondary.
        // I'll just change the message to be correct as it's a "backend file".
        res.send('<h1>Login Successful</h1><a href="/">Go back</a>');
    } else {
        res.send('<h1>Login Failed. Invalid username or password.</h1><a href="/">Try again</a>');
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});