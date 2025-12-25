const express = require('express');
const cors = require('cors');

// Import Route Files
const taskRoutes = require('./routes/taskRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();

// Middleware
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// --- YE SECTION ADD KIYA HAI FRONTEND ERROR FIX KARNE KE LIYE ---
app.post('/api/tasks/reminders/trigger', (req, res) => {
    console.log("Frontend triggered a reminder check...");
    // Cron job background mein chal rahi hai, isliye yahan sirf Success bhej rahe hain
    res.status(200).json({ message: 'Reminder trigger received' });
});
// -----------------------------------------------------------

// API Routes
app.use('/api/tasks', taskRoutes);
app.use('/api/auth', authRoutes);

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    message: 'TaskFlow Pro Backend is running',
    timestamp: new Date().toISOString()
  });
});

// 404 Handler for undefined routes
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

module.exports = app;