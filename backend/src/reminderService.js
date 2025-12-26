const nodemailer = require('nodemailer');
const Task = require('./models/Task'); // Check kar lena path sahi hai na
const User = require('./models/User');

const checkReminders = async () => {
    try {
        console.log("🔍 Running CheckReminders Logic...");
        const now = new Date();
        
        // Uncompleted tasks dhoond raha hai jinka reminder baki hai
        const tasks = await Task.find({ 
            completed: false, 
            'reminder.enabled': true,
            'reminder.sent': { $ne: true } 
        }).populate('user');

        for (const task of tasks) {
            const taskTime = new Date(task.startTime);
            const diffInMins = Math.round((taskTime - now) / 60000);

            if (diffInMins <= (task.reminder.beforeMinutes || 0)) {
                await sendEmail(task.user.email, task.title);
                task.reminder.sent = true;
                await task.save();
                console.log(`✅ Email sent to ${task.user.email} for task: ${task.title}`);
            }
        }
    } catch (error) {
        console.error("❌ Reminder Logic Error:", error);
    }
};

const sendEmail = async (email, taskTitle) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'anshulkashyap118@gmail.com',
            pass: process.env.EMAIL_PASS || 'nrdkluppscumudqf'
        }
    });

    await transporter.sendMail({
        from: '"TaskFlow Pro" <anshulkashyap118@gmail.com>',
        to: email,
        subject: `Reminder: ${taskTitle}`,
        text: `Bhai, tera task "${taskTitle}" shuru hone wala hai. Bhulna mat!`
    });
};

// YE SABSE ZAROORI HAI: Function export hona chahiye
module.exports = { checkReminders };