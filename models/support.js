const mongoose = require("mongoose");

const supportSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    product_name: { type: String, required: true }, // Matches your EJS input name
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Support", supportSchema);