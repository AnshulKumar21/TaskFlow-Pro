const express = require('express');
const router = express.Router();
// IMPORTANT: Ensure the 'U' is capitalized to match your file name User.js
const User = require('../models/User'); 

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, enableReminders } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email or phone' });
    }

    const user = new User({ name, email, phone, password, enableReminders });
    await user.save();

    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    const user = await User.findOne({
      $and: [
        { $or: [{ email: identifier }, { phone: identifier }] },
        { password: password }
      ]
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;