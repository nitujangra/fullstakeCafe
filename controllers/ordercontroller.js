const Order = require("../models/Order");


/* =====================================================
   1. CHECKOUT
===================================================== */
exports.checkout = async (req, res) => {
    try {

        const cart = req.session.cart;

        if (!cart || cart.length === 0) {
            return res.json({
                success: false,
                message: "Cart empty"
            });
        }

        if (!req.user) {
            return res.json({
                success: false,
                message: "Login required"
            });
        }

        const totalAmount = cart.reduce(
            (sum, item) => sum + Number(item.price) * item.quantity,
            0
        );

        const order = new Order({
            user: req.user._id,
            items: cart,
            totalAmount,
            status: "Pending"
        });

        await order.save();

        // clear cart
        req.session.cart = [];

        req.session.save(() => {
            res.json({ success: true });
        });

    } catch (err) {
        console.error("Checkout Error:", err);
        res.status(500).json({ success: false });
    }
};


/* =====================================================
   2. MY ORDERS PAGE
===================================================== */
exports.getMyOrders = async (req, res) => {
    try {

        const orders = await Order.find({
            user: req.user._id
        }).sort({ createdAt: -1 });

        res.render("myorders", {
            orders,
            user: req.user
        });

    } catch (err) {
        console.error("Fetch Orders Error:", err);
        res.status(500).send("Error loading orders");
    }
};


/* =====================================================
   3. ⭐ LIVE DATA API (VERY IMPORTANT)
   Used for auto-refresh status updates
===================================================== */
exports.getMyOrdersData = async (req, res) => {
    try {

        const orders = await Order.find({
            user: req.user._id
        }).sort({ createdAt: -1 });

        res.json({
            success: true,
            orders
        });

    } catch (err) {
        console.error("Orders Data Error:", err);
        res.status(500).json({ success: false });
    }
};


/* =====================================================
   4. ADMIN UPDATE ORDER STATUS
===================================================== */
exports.updateOrderStatus = async (req, res) => {
    try {

        const { status } = req.body;

        await Order.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        res.redirect("/admin/dashboard");

    } catch (err) {
        console.error("Update Status Error:", err);
        res.status(500).send("Status update failed");
    }
};


/* =====================================================
   5. REORDER
===================================================== */
exports.reorder = async (req, res) => {
    try {

        const oldOrder = await Order.findById(req.params.orderId);

        if (!oldOrder) {
            return res.status(404).send("Order not found");
        }

        if (!req.session.cart) req.session.cart = [];

        oldOrder.items.forEach(item => {

            const exist = req.session.cart.find(
                i => i.name === item.name
            );

            if (exist) {
                exist.quantity += item.quantity;
            } else {
                req.session.cart.push({
                    name: item.name,
                    price: item.price,
                    image: item.image,
                    quantity: item.quantity
                });
            }
        });

        req.session.save(() =>
            res.redirect("/products/cart")
        );

    } catch (err) {
        console.error("Reorder Error:", err);
        res.status(500).send("Reorder failed");
    }
};