const User = require('../models/User');
const Cart = require("../models/Cart");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const SECRET_KEY = process.env.SECRET_KEY || "supersecretkey";

// --- FIXED Nodemailer Transporter Configuration ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    // Fix for Render's IPv6 connectivity issues (ENETUNREACH)
    family: 4, 
    tls: {
        // Helps avoid handshake issues on some cloud servers
        rejectUnauthorized: false 
    }
});

/* ================= HELPER: COMPLETE LOGIN PROCESS ================= */
const proceedToLogin = async (user, req, res) => {
    if (req.session.cart && req.session.cart.length > 0) {
        let userCart = await Cart.findOne({ user: user._id });
        if (!userCart) {
            userCart = new Cart({ user: user._id, items: req.session.cart });
        } else {
            req.session.cart.forEach(sessionItem => {
                const exist = userCart.items.find(item => item.name === sessionItem.name);
                if (exist) exist.quantity += sessionItem.quantity;
                else userCart.items.push(sessionItem);
            });
        }
        await userCart.save();
        req.session.cart = [];
    }

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

    const redirectUrl = user.role === "admin" ? "/admin/dashboard" : "/products";
    return res.json({ success: true, redirectUrl });
};

/* ================= 1. CHECK AUTH ================= */
const checkAuth = async (req, res, next) => {
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
const requireAuth = async (req, res, next) => {
    try {
        if (req.user) return next();
        const token = req.cookies?.token;
        if (!token) return res.redirect("/login");

        const decoded = jwt.verify(token, SECRET_KEY);
        const user = await User.findById(decoded.id).select("-password");

        if (!user) {
            res.clearCookie("token");
            return res.redirect("/login");
        }

        req.user = user;
        res.locals.user = user;
        next();
    } catch (err) {
        res.clearCookie("token");
        return res.redirect("/login");
    }
};

/* ================= 3. REQUIRE ADMIN ================= */
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== "admin") {
        return res.redirect("/login");
    }
    next();
};

/* ================= 4. SIGNUP (FIXED EMAIL ERROR HANDLING) ================= */
const signup = async (req, res) => {
    try {
        let { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: "All fields are required." });
        }

        email = email.trim().toLowerCase();
        const existingUser = await User.findOne({ email });
        
        if (existingUser && existingUser.isVerified) {
            return res.status(400).json({ success: false, message: "Email already registered." });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = Date.now() + 10 * 60 * 1000;
        const hashedPassword = await bcrypt.hash(password, 10);

        if (existingUser && !existingUser.isVerified) {
            existingUser.name = name.trim();
            existingUser.password = hashedPassword;
            existingUser.otp = otp;
            existingUser.otpExpires = otpExpires;
            await existingUser.save();
        } else {
            const newUser = new User({
                name: name.trim(),
                email,
                password: hashedPassword,
                role: "user",
                otp,
                otpExpires,
                isVerified: false
            });
            await newUser.save();
        }

        // --- FIXED: Send email inside nested try/catch ---
        // This ensures that even if the email service fails, the page doesn't hang forever
        try {
            await transporter.sendMail({
                from: `"FullStack Cafe" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: "Verify your FullStack Cafe Account",
                html: `<h3>Your OTP is: ${otp}</h3>`
            });
            res.json({ success: true, message: "OTP sent!", email });
        } catch (emailErr) {
            console.error("Nodemailer Error:", emailErr);
            // Even if email fails, we tell the user to try checking their mail 
            // or provide a specific error so they know it's a mail issue.
            res.status(500).json({ 
                success: false, 
                message: "User saved, but failed to send OTP email. Please check your email settings." 
            });
        }

    } catch (err) {
        console.error("Signup DB Error:", err);
        res.status(500).json({ success: false, message: "Error creating account." });
    }
};

/* ================= 5. VERIFY OTP ================= */
const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) return res.status(404).json({ success: false, message: "User not found." });

        if (user.otp !== otp || user.otpExpires < Date.now()) {
            return res.status(400).json({ success: false, message: "Invalid or expired OTP." });
        }

        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        res.json({ success: true, message: "Verified!" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Verification error." });
    }
};

/* ================= 6. LOGIN ================= */
const login = async (req, res) => {
    try {
        let { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Provide email and password." });
        }

        email = email.trim().toLowerCase();
        const user = await User.findOne({ email });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ success: false, message: "Invalid email or password." });
        }

        if (!user.isVerified && user.role !== "admin") {
            return res.status(403).json({ 
                success: false, 
                message: "Please verify your email before logging in.",
                isUnverified: true 
            });
        }

        return await proceedToLogin(user, req, res);

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Login error occurred." });
    }
};

/* ================= 7. LOGOUT ================= */
const logout = (req, res) => {
    res.clearCookie("token");
    res.redirect("/products");
};

module.exports = {
    checkAuth,
    requireAuth,
    requireAdmin,
    signup,
    verifyOTP,
    login,
    logout
};