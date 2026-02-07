require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

const users = [{
    id: 1,
    username: "admin",
    password: "password123"
}];

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
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