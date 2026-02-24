const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
{
    name: {
        type: String,
        required: [true, "Please provide a food name"],
        trim: true,
        unique: true
    },

    price: {
        type: Number,
        required: [true, "Price is required"],
        min: 0
    },

    category: {
        type: String,
        required: [true, "Category is required"],
        enum: [
            "junkfood",
            "coffee",
            "drinks",
            "icecream",
            "southindian",
            "snacks",
            "dessert",
            "meal"
        ],
        lowercase: true,
        trim: true
    },

    // image filename stored from multer
    image: {
        type: String,
        default: "default-food.jpg"
    },

    // ✅ DESCRIPTION (for Add Product form)
    description: {
        type: String,
        trim: true,
        maxlength: [500, "Description cannot exceed 500 characters"],
        default: ""
    },

    // admin toggle availability
    isAvailable: {
        type: Boolean,
        default: true
    }

},
{
    timestamps: true
});

module.exports =
    mongoose.models.Product ||
    mongoose.model("Product", productSchema);