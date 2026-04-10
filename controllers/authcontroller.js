const { sendMail } = require("../utils/mailer"); 
const User = require('../models/User');
const Cart = require("../models/Cart");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const SECRET_KEY = process.env.SECRET_KEY || "supersecretkey";

/* ================= SEND OTP EMAIL ================= */
const sendOTPEmail = async (email, otp) => {
    try {
        // This calls your Gmail API mailer logic
        await sendMail({
            to: email,
            subject: "Verify your FullStack Cafe Account",
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee;">
                    <h2 style="color: #333;">Email Verification</h2>
                    <p>Thank you for joining FullStack Cafe! Use the code below to verify your account:</p>
                    <h1 style="background: #f4f4f4; padding: 10px; display: inline-block; letter-spacing: 5px;">${otp}</h1>
                    <p>This OTP will expire in 10 minutes.</p>
                    <p style="font-size: 0.8em; color: #888;">If you didn't request this, please ignore this email.</p>
                </div>
            `
        });
        console.log("✅ Gmail API: OTP email sent to:", email);
    } catch (error) {
        // Detailed log to see if it's a Token issue or Network issue
        console.error("❌ Gmail API Error in sendOTPEmail:", error.message);
        throw new Error("We couldn't send the verification email. Please try again later.");
    }
};

/* ================= HELPER LOGIN ================= */
const proceedToLogin = async (user, req, res) => {
    // Merge session cart into database cart
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
        req.session.cart = []; // Clear session cart after merging
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

/* ================= AUTH MIDDLEWARE ================= */
const checkAuth = async (req, res, next) => {
    const token = req.cookies?.token;
    res.locals.isAuthenticated = false; // Default for frontend

    if (!token) {
        req.user = null;
        res.locals.user = null;
        return next();
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        const user = await User.findById(decoded.id).select("-password");

        if (!user) {
            res.clearCookie("token");
            req.user = null;
            res.locals.user = null;
        } else {
            req.user = user;
            res.locals.user = user;
            res.locals.isAuthenticated = true;
        }
        next();
    } catch (err) {
        res.clearCookie("token");
        req.user = null;
        res.locals.user = null;
        next();
    }
};

const requireAuth = (req, res, next) => {
    if (req.user) return next();
    res.redirect("/login");
};

const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).send("Unauthorized: Admins only.");
    }
    next();
};

/* ================= SIGNUP ================= */
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
            // Update existing unverified user
            existingUser.name = name.trim();
            existingUser.password = hashedPassword;
            existingUser.otp = otp;
            existingUser.otpExpires = otpExpires;
            await existingUser.save();
        } else {
            // Create new unverified user
            await new User({
                name: name.trim(),
                email,
                password: hashedPassword,
                role: "user",
                otp,
                otpExpires,
                isVerified: false
            }).save();
        }

        // Send OTP using the Gmail API mailer
        await sendOTPEmail(email, otp);

        return res.json({
            success: true,
            message: "A verification code has been sent to your email.",
            email
        });

    } catch (err) {
        console.error("❌ Signup Flow Error:", err.message);
        res.status(500).json({ success: false, message: err.message || "Internal Server Error" });
    }
};

/* ================= VERIFY OTP ================= */
const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await User.findOne({ email: email?.toLowerCase() });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        if (user.otp !== otp || user.otpExpires < Date.now()) {
            return res.status(400).json({ success: false, message: "Invalid or expired OTP." });
        }

        user.isVerified = true;
        user.otp = undefined; // Clear OTP after use
        user.otpExpires = undefined;
        await user.save();

        res.json({ success: true, message: "Email verified! You can now log in." });
    } catch (err) {
        res.status(500).json({ success: false, message: "Verification failed." });
    }
};

/* ================= LOGIN ================= */
const login = async (req, res) => {
    try {
        let { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Provide email and password." });
        }

        email = email.trim().toLowerCase();
        const user = await User.findOne({ email });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ success: false, message: "Invalid credentials." });
        }

        // Logic: Require verification unless it's an admin (to make your testing easier)
        if (!user.isVerified && user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Email not verified.",
                isUnverified: true,
                email: user.email
            });
        }

        return await proceedToLogin(user, req, res);
    } catch (err) {
        res.status(500).json({ success: false, message: "Login error occurred." });
    }
};

/* ================= LOGOUT ================= */
const logout = (req, res) => {
    res.clearCookie("token");
    res.redirect("/login"); // Redirect to login after logout
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