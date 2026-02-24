/* ================= ENVIRONMENT ================= */
require("dotenv").config();

/* ================= IMPORTS ================= */
const express = require("express");
const path = require("path");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const connectDB = require("./config/db");
const sessionMiddleware = require("./middleware/session");
const { checkAuth } = require("./controllers/authcontroller");

/* ================= APP INIT ================= */
const app = express();
const PORT = process.env.PORT || 3000;

/* ================= DATABASE ================= */
connectDB();

/* ================= VIEW ENGINE ================= */
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

/* ================= GLOBAL MIDDLEWARE ================= */
app.use(morgan("dev"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

/* ================= STATIC FILES ================= */

// public assets (css/js/images)
app.use(express.static(path.join(__dirname, "public")));

// ✅ serve uploaded images (IMPORTANT)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ================= SESSION ================= */
app.use(sessionMiddleware);

/* ================= AUTH CHECK ================= */
app.use(checkAuth);

/* ================= GLOBAL EJS VARIABLES ================= */
app.use((req, res, next) => {

    // create cart if not exists
    if (!req.session.cart) {
        req.session.cart = [];
    }

    res.locals.session = req.session;
    res.locals.user = req.user || null;

    next();
});

/* ================= ROUTES ================= */

// Auth routes
app.use("/", require("./routes/authroutes"));

// Home redirect
app.get("/", (req, res) => {
    res.redirect("/products");
});

// Support routes
app.use("/support", require("./routes/supportroutes"));

// Product routes
app.use("/products", require("./routes/productRoutes"));

// ✅ Admin routes (ADD PRODUCT WORKS HERE)
app.use("/admin", require("./routes/adminroute"));

/* ================= 404 HANDLER ================= */
app.use((req, res) => {
    res.status(404).render("error", {
        message: "Page Not Found"
    });
});

/* ================= GLOBAL ERROR HANDLER ================= */
app.use((err, req, res, next) => {
    console.error("Server Error:", err);

    res.status(500).render("error", {
        message: "Something went wrong!"
    });
});

/* ================= SERVER ================= */
app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});