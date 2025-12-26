const nodemailer = require('nodemailer');
const Task = require('./models/Task'); 
const User = require('./models/User');

const checkReminders = async () => {
    try {
        console.log("🔍 Running CheckReminders Logic (Fixed Version)...");
        const now = new Date();
        
        // Populate hata diya taaki StrictPopulateError na aaye
        const tasks = await Task.find({ 
            completed: false, 
            'reminder.enabled': true,
            'reminder.sent': { $ne: true } 
        });

        for (const task of tasks) {
            const taskTime = new Date(task.startTime);
            const diffInMins = Math.round((taskTime - now) / 60000);

            // Agar reminder ka waqt ho gaya hai
            if (diffInMins <= (task.reminder.beforeMinutes || 0)) {
                // Direct User dhoondो task ki userId se
                const user = await User.findById(task.user || task.userId);
                
                if (user && user.email) {
                    await sendEmail(user.email, task.title);
                    
                    // Mark as sent taaki baar baar mail na jaye
                    task.reminder.sent = true;
                    await task.save();
                    console.log(`✅ Email sent to ${user.email} for task: ${task.title}`);
                }
            }
        }
    } catch (error) {
        console.error("❌ Reminder Logic Error:", error.message);
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
        text: `Bhai, tera task "${taskTitle}" shuru hone wala hai. Check kar lo!`
    });
};

module.exports = { checkReminders };