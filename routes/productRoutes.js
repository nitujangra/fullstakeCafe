const express = require("express");
const router = express.Router();

const productController = require("../controllers/productController");
const orderController = require("../controllers/ordercontroller");
const { checkAuth } = require("../controllers/authcontroller");


/* =====================================================
   PRODUCTS
===================================================== */
router.get("/", checkAuth, productController.getAllProducts);


/* =====================================================
   CART
===================================================== */
router.get("/cart", checkAuth, productController.getCart);

router.post("/add-to-cart", productController.addToCart);
router.post("/remove-item", productController.removeItem);
router.post("/update-quantity", productController.updateQuantity);


/* =====================================================
   ORDERS (Moved to orderController)
===================================================== */

// ✅ place order
router.post("/checkout", checkAuth, orderController.checkout);

// ✅ customer orders page
router.get("/my-orders", checkAuth, orderController.getMyOrders);

// ⭐ NEW — LIVE STATUS UPDATE API (IMPORTANT)
router.get("/my-orders-data", checkAuth, orderController.getMyOrdersData);

// ✅ reorder
router.post("/reorder/:orderId", checkAuth, orderController.reorder);


module.exports = router;