const express = require("express");
const router = express.Router();
const authController = require("../controllers/authcontroller");
const { requireAuth } = require("../controllers/authcontroller");

/* ================= VIEW ROUTES ================= */

// Signup Page
router.get("/signup", (req, res) => {
    res.render("signup");
});

// Login Page
router.get("/login", (req, res) => {
    res.render("login");
});

/* ================= AUTH LOGIC ================= */

// Signup
router.post("/signup", authController.signup);

// Login
router.post("/login", authController.login);

// Logout (only logged-in users)
router.get("/logout", requireAuth, authController.logout);

/* ================= DEFAULT ================= */

router.get("/auth", (req, res) => {
    res.redirect("/products");
});

module.exports = router;
