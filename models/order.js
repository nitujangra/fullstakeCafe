const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({

    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: true 
    },

    items: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product"
        },
        name: String,
        price: Number,
        quantity: Number,
        image: String
    }],

    totalAmount: { 
        type: Number, 
        required: true 
    },

    status: {
        type: String,
        enum: ["Pending", "Preparing", "Delivered", "Cancelled"],
        default: "Pending"
    },

    paymentStatus: {
        type: String,
        enum: ["Pending", "Paid"],
        default: "Pending"
    },

    deliveredAt: {
        type: Date
    }

}, { timestamps: true });

module.exports =
  mongoose.models.Order || mongoose.model("Order", orderSchema);