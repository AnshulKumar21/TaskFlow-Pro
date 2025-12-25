const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    // The user who owns this task (needed for later when we add Auth)
    userId: {
      type: String,
      required: false // We will set this to true once we implement Auth
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    date: {
      type: String, // Storing as String to match frontend 'YYYY-MM-DD'
      required: true
    },
    time: {
      type: String, // 'HH:mm'
      default: null
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    category: {
      type: String,
      default: 'personal'
    },
    completed: {
      type: Boolean,
      default: false
    },
    // Matches the detailed reminder object from your frontend
    reminder: {
      enabled: { type: Boolean, default: false },
      beforeMinutes: { type: Number, default: 0 },
      browser: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      whatsapp: { type: Boolean, default: false },
      repeat: { type: String, default: 'none' }
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Task', taskSchema);