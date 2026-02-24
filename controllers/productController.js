const Product = require("../models/Product");

/* =====================================================
   GET ALL PRODUCTS
===================================================== */
exports.getAllProducts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const perPage = 8;
        const search = req.query.search || "";
        const category = req.query.category || "all";

        let query = {};

        if (search.trim() !== "")
            query.name = { $regex: search, $options: "i" };

        if (category !== "all")
            query.category = category;

        const [products, totalProducts] = await Promise.all([
            Product.find(query)
                .skip((page - 1) * perPage)
                .limit(perPage),
            Product.countDocuments(query)
        ]);

        res.render("products", {
            foodItems: products,
            currentPage: page,
            totalPages: Math.ceil(totalProducts / perPage),
            search,
            category,
            user: req.user || null
        });

    } catch (error) {
        res.status(500).send("Error loading products.");
    }
};


/* =====================================================
   CART FUNCTIONS
===================================================== */

exports.getCart = (req, res) => {

    if (!req.session.cart) req.session.cart = [];

    const totalPrice = req.session.cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );

    res.render("cart", {
        cart: req.session.cart,
        totalPrice,
        user: req.user || null
    });
};


exports.addToCart = (req, res) => {

    if (!req.session.cart) req.session.cart = [];

    const { name, price, image } = req.body;

    const existing = req.session.cart.find(i => i.name === name);

    if (existing) existing.quantity++;
    else {
        req.session.cart.push({
            name,
            price: Number(price),
            image,
            quantity: 1
        });
    }

    req.session.save(() => {
        const cartCount = req.session.cart.reduce(
            (s, i) => s + i.quantity, 0
        );

        res.json({ success: true, cartCount });
    });
};


exports.updateQuantity = (req, res) => {

    const { index, action } = req.body;
    const cart = req.session.cart || [];

    if (cart[index]) {
        action === "add"
            ? cart[index].quantity++
            : cart[index].quantity--;
    }

    if (cart[index]?.quantity <= 0)
        cart.splice(index, 1);

    req.session.save(() => res.json({ success: true }));
};


exports.removeItem = (req, res) => {

    const { index } = req.body;

    if (req.session.cart[index])
        req.session.cart.splice(index, 1);

    req.session.save(() => res.json({ success: true }));
};