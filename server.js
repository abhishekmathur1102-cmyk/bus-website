require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const PORT = 3000; // Forced to 3000 to avoid macOS AirPlay conflict on 5000

// Middleware
app.use(express.json()); // Need this to parse JSON body in POST requests
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

const Testimonial = require('./models/Testimonial');
const Order = require('./models/Order');
const razorpayController = require('./controllers/razorpayController');
const authController = require('./controllers/authController');
const { protect } = require('./middleware/auth');

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

// Authentication Routes
app.post('/api/auth/signup', authController.register);
app.post('/api/auth/login', authController.login);
app.get('/api/auth/me', protect, authController.getMe);

// Get User's Bookings
app.get('/api/bookings/my', protect, async (req, res) => {
    try {
        const bookings = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: bookings });
    } catch (error) {
        console.error('Error fetching my bookings:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch bookings' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});