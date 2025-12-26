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

// API Route for Frontend Trigger (Safe Version)
app.post('/api/tasks/reminders/trigger', async (req, res) => {
    try {
        console.log("Frontend triggered a reminder check...");
        
        // Try to require the service inside the route to prevent boot-up crash
        try {
            const reminderService = require('./reminderService');
            if (reminderService && typeof reminderService.checkReminders === 'function') {
                await reminderService.checkReminders();
                console.log("✅ Reminder Service executed successfully");
            }
        } catch (serviceError) {
            console.error("⚠️ Reminder Service execution failed:", serviceError.message);
            // We still send 200 to frontend so user doesn't see an error
        }
        
        res.status(200).json({ message: 'Trigger processed' });
    } catch (error) {
        console.error("Critical Trigger Error:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// API Routes
app.use('/api/tasks', taskRoutes);
app.use('/api/auth', authRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'TaskFlow Pro Backend is running' });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

module.exports = app;