const express = require('express');
const Task = require('../models/Task');
const User = require('../models/User');
const nodemailer = require('nodemailer');
const router = express.Router();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'anshulkasyap118@gmail.com',
    pass: 'cvhn kdse lkvq pfdi'
  }
});

router.post('/reminders/trigger', async (req, res) => {
  const { taskId, userId } = req.body;
  try {
    const task = await Task.findById(taskId);
    const user = await User.findById(userId);

    if (!task || !user) {
      return res.status(404).json({ message: 'Task or User not found' });
    }

    const mailOptions = {
      from: 'anshulkasyap118@gmail.com',
      to: user.email,
      subject: `⏰ Task Reminder: ${task.title}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee;">
          <h2 style="color: #4f46e5;">Task Reminder</h2>
          <p>Hi ${user.name},</p>
          <p>This is a reminder for: <b>${task.title}</b></p>
          <p>Priority: ${task.priority}</p>
          <p>Due: ${task.date} ${task.time || ''}</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Email sent successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    let query = {};
    if (userId) query.userId = userId;
    const tasks = await Task.find(query).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const task = new Task(req.body);
    const savedTask = await task.save();
    res.status(201).json(savedTask);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;