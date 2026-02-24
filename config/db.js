const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // REMOVED quotes: process.env.MONGO_URI is a variable, not a string
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("❌ Connection Failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;