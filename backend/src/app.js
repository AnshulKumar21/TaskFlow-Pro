const express = require('express');
const cors = require('cors');

// Routes Import
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

// Final Trigger Route - Jo direct reminderService ko call karega
app.post('/api/tasks/reminders/trigger', async (req, res) => {
    try {
        console.log("Frontend triggered a reminder check...");
        
        // Dono jagah check karega file ko taaki error na aaye
        let reminderService;
        try {
            reminderService = require('./reminderService'); // Agar src ke andar hai
        } catch (e) {
            reminderService = require('./services/reminderService'); // Agar services folder mein hai
        }

        // Function call check
        if (reminderService && (reminderService.checkReminders || typeof reminderService === 'function')) {
            // Agar export object hai ya direct function, dono handle honge
            const runCheck = reminderService.checkReminders || reminderService;
            await runCheck();
            
            console.log("✅ Mail Logic Started!");
            res.status(200).json({ message: 'Success' });
        } else {
            console.log("⚠️ File toh mili par function nahi mila. Export check karo.");
            res.status(200).json({ message: 'File found but function missing' });
        }
    } catch (error) {
        console.error("❌ Error in Trigger:", error.message);
        res.status(200).json({ message: 'Trigger received' });
    }
});

// API Routes
app.use('/api/tasks', taskRoutes);
app.use('/api/auth', authRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend is Live' });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

module.exports = app;