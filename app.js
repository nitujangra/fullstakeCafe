/* ================= ENVIRONMENT ================= */
require("dotenv").config();

/* ================= IMPORTS ================= */
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const session = require("express-session");

let MongoStore = require("connect-mongo");
if (typeof MongoStore !== "function" && MongoStore.default) {
    MongoStore = MongoStore.default;
}

const connectDB = require("./config/db");
const { checkAuth } = require("./controllers/authcontroller"); 
const { verifyConnection } = require("./utils/mailer"); 

/* ================= APP & SERVER INIT ================= */
const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

/* ================= DATABASE ================= */
connectDB();

/* ================= VERIFY MAIL SERVER ================= */
verifyConnection(); 

/* ================= VIEW ENGINE ================= */
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

/* ================= GLOBAL MIDDLEWARE ================= */
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* ================= STATIC FILES ================= */
// 1. Standard public folder (CSS, JS, images)
app.use(express.static(path.join(__dirname, "public")));

// 2. FIXED: Pointing to the root 'uploads' folder 
// (Based on your VS Code sidebar, 'uploads' is a root folder, not inside 'public')
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ================= SESSION ================= */
app.use(session({
    secret: process.env.SESSION_SECRET || "cafe_secret_key",
    resave: false,
    saveUninitialized: false, // Recommended: false to comply with cookie laws
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        collectionName: "sessions",
        ttl: 24 * 60 * 60 // 1 day
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production" // Only use HTTPS in production
    }
}));

/* ================= SOCKET.IO ================= */
app.set("socketio", io);

io.on("connection", (socket) => {
    socket.on("join", (userId) => {
        if (userId) {
            socket.join(userId);
            console.log(`User connected: ${userId}`);
        }
    });

    socket.on("disconnect", () => {
        console.log("User disconnected");
    });
});

/* ================= AUTH MIDDLEWARE ================= */
// Important: checkAuth must come AFTER session middleware
app.use(checkAuth);

/* ================= GLOBAL VARIABLES ================= */
app.use((req, res, next) => {
    // Initialize cart if it doesn't exist
    if (!req.session.cart) {
        req.session.cart = [];
    }

    // Make variables available to all EJS templates
    res.locals.session = req.session;
    res.locals.user = req.user || null;
    res.locals.cartCount = req.session.cart.reduce((total, item) => total + (item.quantity || 1), 0);
    
    // Pass current URL for active state in nav
    res.locals.path = req.path;

    next();
});

/* ================= ROUTES ================= */
app.use("/", require("./routes/authroutes"));
app.get("/", (req, res) => res.redirect("/products"));
app.use("/support", require("./routes/supportroutes"));
app.use("/products", require("./routes/productRoutes"));
app.use("/admin", require("./routes/adminroute"));
app.use("/cart", require("./routes/cartRoutes"));

/* ================= ERROR HANDLING ================= */
app.use((req, res) => {
    res.status(404).render("error", { 
        message: "Page Not Found",
        user: req.user || null // Added user context for error page header
    });
});

app.use((err, req, res, next) => {
    console.error("❌ Server Error:", err.stack);
    res.status(500).render("error", { 
        message: "Something went wrong on our end!",
        user: req.user || null
    });
});

/* ================= SERVER START ================= */
server.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});

/* ================= HANDLE PORT ERROR ================= */
server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
        console.error(`❌ Port ${PORT} is already in use`);
        const newPort = parseInt(PORT) + 1;
        server.listen(newPort, () => {
            console.log(`✅ Server switched to http://localhost:${newPort}`);
        });
    } else {
        console.error("❌ Server error:", err);
    }
});