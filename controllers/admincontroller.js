const Order = require("../models/Order");
const Product = require("../models/Product");

/* ================= HELPER: CALCULATE STATS ================= */

const calculateStats = (orders) => {

    const totalRevenue = orders
        .filter(order => order.status === "Delivered")
        .reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);

    const activeOrders = orders.filter(order =>
        ["Pending", "Preparing", "Out for Delivery"].includes(order.status)
    ).length;

    return {
        totalRevenue: totalRevenue.toFixed(2),
        orderCount: orders.length,
        activeOrders
    };
};


/* ================= ADMIN DASHBOARD PAGE ================= */

exports.getAdminDashboard = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate("user", "name email")
            .sort({ createdAt: -1 });

        const products = await Product.find().sort({ name: 1 });

        const stats = calculateStats(orders);

        res.render("admin/adminDashboard", {
            user: req.user,
            orders,
            products,
            stats
        });

    } catch (err) {
        console.error("Dashboard Error:", err);

        res.status(500).render("error", {
            message: "Error loading dashboard"
        });
    }
};


/* ================= DASHBOARD AUTO REFRESH DATA ================= */

exports.getDashboardData = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate("user", "name email")
            .sort({ createdAt: -1 });

        const stats = calculateStats(orders);

        res.json({
            success: true,
            orders,
            stats
        });

    } catch (err) {
        console.error("Dashboard Data Error:", err);
        res.status(500).json({ success: false });
    }
};


/* ================= UPDATE ORDER STATUS ================= */

exports.updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const orderId = req.params.id;

        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            { status },
            { new: true }
        );

        if (!updatedOrder) {
            return res.status(404).send("Order not found");
        }

        res.redirect("/admin/dashboard");

    } catch (err) {
        console.error("Order Status Update Error:", err);
        res.status(500).send("Failed to update order");
    }
};


/* ================= TOGGLE PRODUCT STATUS ================= */

exports.toggleProductStatus = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        // ✅ FIXED FIELD NAME
        product.isAvailable = !product.isAvailable;

        await product.save();

        res.json({
            success: true,
            isAvailable: product.isAvailable
        });

    } catch (err) {
        console.error("Toggle Product Error:", err);
        res.status(500).json({ success: false });
    }
};


/* ================= SHOW ADD PRODUCT PAGE ================= */

exports.getAddProduct = (req, res) => {
    res.render("admin/addProduct", {
        user: req.user
    });
};


/* ================= ADD PRODUCT ================= */

exports.postAddProduct = async (req, res) => {
    try {

        const { name, price, category, description } = req.body;

        const product = new Product({
            name,
            price,
            category,
            description,
            // ✅ safe image handling
            image: req.file
                ? req.file.filename
                : "default-food.jpg"
        });

        await product.save();

        // redirect back to dashboard
        res.redirect("/admin/dashboard");

    } catch (err) {
        console.error("Add Product Error:", err);

        res.status(500).render("error", {
            message: "Error adding product"
        });
    }
};