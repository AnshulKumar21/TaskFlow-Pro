const nodemailer = require('nodemailer');
const cron = require('node-cron');
const Task = require('./models/Task');
const User = require('./models/User');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'anshulkashyap118@gmail.com',
         pass: process.env.EMAIL_PASS || 'nrdkluppscumudqf'
    }
});

cron.schedule('* * * * *', async () => {
    // Current time ke seconds zero karo accurate matching ke liye
    const now = new Date();
    now.setSeconds(0, 0);

    try {
        const tasks = await Task.find({ completed: false, "reminder.enabled": true });

        for (const task of tasks) {
            if (!task.userId || !task.date || !task.time || !task.reminder.email) continue;

            const user = await User.findById(task.userId);
            if (!user) continue;

            // Task date aur time ko parse karo
            const taskTime = new Date(`${task.date}T${task.time}`);
            taskTime.setSeconds(0, 0);

            // Difference in minutes
            const diffInMins = Math.round((taskTime - now) / 60000);

            // Match logic
            if (diffInMins === task.reminder.beforeMinutes) {
                const mailOptions = {
                    from: 'anshulkashyap118@gmail.com',
                    to: user.email,
                    subject: `⏰ TaskFlow Reminder: ${task.title}`,
                   text: `Hello ${user.name},\n\nThis is a reminder for your task: "${task.title}".\nDue Time: ${task.time}\nCategory: ${task.category}\n\nPlease ensure it is completed on time.\n\nRegards,\nTaskFlow Pro Team`
                };

                try {
                    await transporter.sendMail(mailOptions);
                    console.log(`✅ Email sent to ${user.email} for task: ${task.title}`);
                } catch (mailErr) {
                    console.log(`❌ Mail Error for ${user.email}:`, mailErr.message);
                }
            }
        }
    } catch (err) { 
        console.log("❌ Cron Error:", err.message); 
    }
});