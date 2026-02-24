// controllers/authcontroller.js

const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const SECRET_KEY = process.env.SECRET_KEY || "supersecretkey";


/* ================= 1. CHECK AUTH ================= */

exports.checkAuth = async (req, res, next) => {
    try {
        const token = req.cookies?.token;

        if (!token) {
            req.user = null;
            res.locals.user = null;
            return next();
        }

        const decoded = jwt.verify(token, SECRET_KEY);

        const user = await User.findById(decoded.id).select("-password");

        if (!user) {
            res.clearCookie("token");
            req.user = null;
            res.locals.user = null;
            return next();
        }

        req.user = user;
        res.locals.user = user;

        next();

    } catch (err) {
        res.clearCookie("token");
        req.user = null;
        res.locals.user = null;
        next();
    }
};


/* ================= 2. REQUIRE AUTH ================= */

exports.requireAuth = (req, res, next) => {
    if (!req.user) {
        return res.redirect("/login");
    }
    next();
};


/* ================= 3. SIGNUP ================= */

exports.signup = async (req, res) => {
    try {
        let { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).send("All fields are required.");
        }

        email = email.trim().toLowerCase();

        const existingUser = await User.findOne({ email });
        if (existingUser)
            return res.status(400).send("Email already registered.");

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name: name.trim(),
            email,
            password: hashedPassword,
            role: "user"
        });

        await newUser.save();

        res.redirect("/login?message=Account created! Please log in.");

    } catch (err) {
        console.error("Signup Error:", err);
        res.status(500).send("Error creating account.");
    }
};


/* ================= 4. LOGIN (✅ FIXED REDIRECT) ================= */

exports.login = async (req, res) => {
    try {
        let { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).send("Please provide both email and password.");
        }

        email = email.trim().toLowerCase();

        const user = await User.findOne({ email });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).send("Invalid email or password.");
        }

        // Create JWT
        const token = jwt.sign(
            { id: user._id, role: user.role },
            SECRET_KEY,
            { expiresIn: "1d" }
        );

        res.cookie("token", token, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production"
        });

        /* ===== ROLE BASED REDIRECT (MAIN FIX) ===== */

        if (user.role === "admin") {
            return res.redirect("/admin/dashboard"); // ✅ FIXED
        }

        return res.redirect("/products");

    } catch (err) {
        console.error("Detailed Login Error:", err);
        res.status(500).send("Login error occurred.");
    }
};


/* ================= 5. LOGOUT ================= */

exports.logout = (req, res) => {
    res.clearCookie("token");
    res.redirect("/products");
};