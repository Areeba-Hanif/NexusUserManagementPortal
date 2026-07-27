const path = require('path');

// Load .env relative to current directory (backend/.env)
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dns = require('dns');

// Force Google & Cloudflare DNS resolution for MongoDB Atlas SRV lookup
dns.setServers(['8.8.8.8', '1.1.1.1']);

const userRoutes = require('./routes/userRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();

const dbURI = process.env.dbURI;

// Security check log
if (!dbURI) {
    console.error(' CRITICAL ERROR: process.env.dbURI is undefined!');
    console.error(' Looking for .env at:', path.join(__dirname, '.env'));
}

// Global Middlewares
app.use(cors());
app.use(express.json());

// Serve Frontend Static Files (Go up one directory from 'backend' to reach 'frontend')
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// Main API Endpoints
app.use('/api/users', userRoutes);         
app.use('/api/dashboard', dashboardRoutes); 

// Page Routes & Fallbacks
app.get('/', (req, res) => {
    res.redirect('/pages/login.html');
});

app.get('/pages/login.html', (req, res) => {
    res.sendFile(path.join(frontendPath, 'pages', 'login.html'));
});

// Database Connection
async function connectToDatabase() {
    if (!dbURI) return;

    console.log('Attempting to connect to MongoDB Cloud...');
    try {
        await mongoose.connect(dbURI, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 5000
        });
        console.log('Database connection established successfully!');
    } catch (err) {
        console.error('Database connection error:');
        console.error(err.message);
    }
}

connectToDatabase();

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`[OK] Server running on http://localhost:${PORT}`);
    console.log(`[WEB] Open frontend live here: http://localhost:${PORT}/pages/login.html`);
});

// At the end of server.js / index.js
module.exports = app;