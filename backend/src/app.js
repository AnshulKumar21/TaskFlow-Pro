const express = require('express');
const cors = require('cors');

// Import Route Files
const taskRoutes = require('./routes/taskRoutes');
const authRoutes = require('./routes/authRoutes');

// Import Reminder Service (Isse mail trigger hogi)
const reminderService = require('./services/reminderService');

const app = express();

// Middleware
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// API Route for Frontend Trigger
app.post('/api/tasks/reminders/trigger', async (req, res) => {
    try {
        console.log("Frontend triggered a reminder check. Calling Reminder Service...");
        
        // Asli mail bhejane wala function call ho raha hai
        await reminderService.checkReminders(); 
        
        res.status(200).json({ message: 'Reminder check completed and email sent if due' });
    } catch (error) {
        console.error("Mail trigger error in app.js:", error);
        res.status(500).json({ error: 'Internal Server Error during mail trigger' });
    }
});

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

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

module.exports = app;