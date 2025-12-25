const mongoose = require('mongoose');
const app = require('./app');

const MONGO_URI =
  "mongodb+srv://anshulkashyap118_db_user:mongo12345@cluster0.qkhhi4y.mongodb.net/taskflow?retryWrites=true&w=majority";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(5000, () => {
      console.log("Server running on port 5000");
    });
  })
  .catch((err) => {
    console.error("MongoDB error:", err.message);
    process.exit(1);
  });
// server.js ke bilkul niche
require('./reminderService');