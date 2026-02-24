// routes/adminroute.js

const express = require("express");
const router = express.Router();

const adminController = require("../controllers/admincontroller");
const { requireAuth } = require("../middleware/authMiddleware");
const Order = require("../models/Order");
const upload = require("../middleware/multer"); // ✅ multer middleware

/* ================= ADMIN CHECK ================= */
const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === "admin") {
        return next();
    }

    return res.status(403).render("error", {
        message: "Admin access required"
    });
};


/* ================= DASHBOARD ROUTES ================= */

// ✅ Admin Dashboard Page
router.get(
    "/dashboard",
    requireAuth,
    adminOnly,
    adminController.getAdminDashboard
);

// Dashboard API Data
router.get(
    "/dashboard-data",
    requireAuth,
    adminOnly,
    adminController.getDashboardData
);


/* ================= ADD PRODUCT ROUTES ✅ ================= */

// 👉 OPEN ADD PRODUCT PAGE
router.get(
    "/add-product",
    requireAuth,
    adminOnly,
    async (req, res) => {
        const Product = require("../models/Product");
        const products = await Product.find().sort({ createdAt: -1 });

        res.render("admin/addProduct", { products });
    }
);

// 👉 SAVE PRODUCT (FORM SUBMIT)
router.post(
    "/add-product",
    requireAuth,
    adminOnly,
    upload.single("image"),
    adminController.postAddProduct
);


/* ================= PRODUCT STATUS ================= */

router.patch(
    "/product/toggle-status/:id",
    requireAuth,
    adminOnly,
    adminController.toggleProductStatus
);


/* ================= ORDER STATUS UPDATE ================= */

router.post("/order/status", requireAuth, adminOnly, async (req, res) => {
    try {
        const { orderId, status } = req.body;

        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            { status },
            { new: true }
        );

        if (!updatedOrder) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        res.json({
            success: true,
            status: updatedOrder.status
        });

    } catch (err) {
        console.error("Order Update Error:", err);
        res.status(500).json({ success: false });
    }
});

module.exports = router;