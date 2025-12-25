const express = require('express');
const cors = require('cors');

// Import Route Files
const taskRoutes = require('./routes/taskRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();

// Middleware
// CORS allows your frontend (e.g., Live Server or local file) to talk to this backend
app.use(cors()); 

// Allows the server to understand JSON data sent in the request body
app.use(express.json());

// API Routes
// All task-related requests will start with /api/tasks
app.use('/api/tasks', taskRoutes);

// All authentication-related requests (login/signup) will start with /api/auth
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