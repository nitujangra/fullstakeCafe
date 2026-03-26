const Product = require("../models/product");
const Cart = require("../models/Cart");
const Order = require("../models/order");

/* ================= ADD TO CART ================= */
exports.addToCart = async (req, res) => {
    try {
        const { id, name, price, image } = req.body;
        const productName = name.trim();

        const newItem = {
            productId: id, 
            name: productName,
            price: Number(price),
            image: image || "/images/default-food.png",
            quantity: 1
        };

        if (req.user) {
            // 1. Update Database Cart
            let userCart = await Cart.findOne({ user: req.user._id });

            if (!userCart) {
                userCart = new Cart({ user: req.user._id, items: [newItem] });
            } else {
                const existingIndex = userCart.items.findIndex(
                    item => item.name.trim().toLowerCase() === productName.toLowerCase()
                );

                if (existingIndex > -1) {
                    userCart.items[existingIndex].quantity += 1;
                } else {
                    userCart.items.push(newItem);
                }
            }
            
            userCart.markModified('items');
            await userCart.save();
            
            // 2. Sync Session with Database state
            req.session.cart = userCart.items;
            
            // Explicitly save session before responding to AJAX
            req.session.save((err) => {
                if (err) console.error("Session Save Error:", err);
                const cartCount = userCart.items.reduce((s, i) => s + i.quantity, 0);
                return res.json({ success: true, cartCount });
            });

        } else {
            // GUEST LOGIC
            if (!req.session.cart) req.session.cart = [];
            
            const existing = req.session.cart.find(
                i => i.name.trim().toLowerCase() === productName.toLowerCase()
            );

            if (existing) {
                existing.quantity += 1;
            } else {
                req.session.cart.push(newItem);
            }

            req.session.save(() => {
                const cartCount = req.session.cart.reduce((s, i) => s + i.quantity, 0);
                res.json({ success: true, cartCount });
            });
        }
    } catch (err) {
        console.error("Add To Cart Error:", err);
        res.status(500).json({ success: false, message: "Error adding to cart" });
    }
};

/* ================= GET CART ================= */
exports.getCart = async (req, res) => {
    try {
        let cartItems = [];

        if (req.user) {
            // Priority 1: Pull from DB
            const dbCart = await Cart.findOne({ user: req.user._id });
            
            if (dbCart) {
                cartItems = dbCart.items;
            } else if (req.session.cart && req.session.cart.length > 0) {
                // Priority 2: If DB is empty but session has items (user just logged in)
                // Migrate session items to DB
                const newCart = new Cart({ user: req.user._id, items: req.session.cart });
                await newCart.save();
                cartItems = req.session.cart;
            }
            
            // Keep session in sync for the header count
            req.session.cart = cartItems; 
        } else {
            // Guest items from session
            cartItems = req.session.cart || [];
        }

        const totalPrice = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        res.render("cart", {
            cart: cartItems,
            totalPrice: totalPrice.toFixed(2),
            user: req.user || null,
            pageTitle: "Your Cart"
        });
    } catch (err) {
        console.error("Get Cart Error:", err);
        res.status(500).send("Error loading cart");
    }
};

/* ================= GET ALL PRODUCTS ================= */
exports.getAllProducts = async (req, res) => {
    try {
        const search = req.query.search || "";
        const category = req.query.category || "all";

        let query = {};
        if (search.trim() !== "") {
            query.name = { $regex: search, $options: "i" };
        }
        
        if (category !== "all") {
            query.category = category;
        }

        const products = await Product.find(query);

        // Header sync: ensure session cart exists if user is logged in
        if (req.user && (!req.session.cart || req.session.cart.length === 0)) {
            const dbCart = await Cart.findOne({ user: req.user._id });
            if (dbCart) req.session.cart = dbCart.items;
        }

        res.render("products", {
            foodItems: products,
            search,
            category,
            user: req.user || null
        });
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).send("Error loading products.");
    }
};

/* ================= UPDATE QUANTITY ================= */
exports.updateQuantity = async (req, res) => {
    try {
        const { name, action } = req.body;
        let cartItems = req.session.cart || [];

        const item = cartItems.find(i => i.name === name);
        if (item) {
            if (action === 'inc') item.quantity += 1;
            else if (action === 'dec' && item.quantity > 1) item.quantity -= 1;
        }

        if (req.user) {
            await Cart.findOneAndUpdate(
                { user: req.user._id },
                { items: cartItems },
                { upsert: true }
            );
        }

        req.session.cart = cartItems;
        req.session.save(() => res.json({ success: true }));
    } catch (err) {
        res.status(500).json({ success: false });
    }
};

/* ================= REMOVE ITEM ================= */
exports.removeItem = async (req, res) => {
    try {
        const { name } = req.body;
        let cartItems = (req.session.cart || []).filter(i => i.name !== name);

        if (req.user) {
            await Cart.findOneAndUpdate(
                { user: req.user._id },
                { items: cartItems }
            );
        }

        req.session.cart = cartItems;
        req.session.save(() => res.json({ success: true }));
    } catch (err) {
        res.status(500).json({ success: false });
    }
};