const { sendMail } = require("../utils/mailer"); // ✅ your own mailer
const User = require('../models/User');
const Cart = require("../models/Cart");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const SECRET_KEY = process.env.SECRET_KEY || "supersecretkey";

/* ================= SEND OTP EMAIL ================= */
const sendOTPEmail = async (email, otp) => {
    try {
        await sendMail({
            to: email,
            subject: "Verify your FullStack Cafe Account",
            html: `
                <h2>Email Verification</h2>
                <p>Your OTP is:</p>
                <h1>${otp}</h1>
                <p>This OTP will expire in 10 minutes.</p>
            `
        });

        console.log("✅ OTP email sent to:", email);

    } catch (error) {
        console.error("❌ Error sending OTP:", error);
        throw new Error("Email not sent");
    }
};

/* ================= HELPER LOGIN ================= */
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

/* ================= AUTH MIDDLEWARE ================= */
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

    } catch {
        res.clearCookie("token");
        req.user = null;
        res.locals.user = null;
        next();
    }
};

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

    } catch {
        res.clearCookie("token");
        return res.redirect("/login");
    }
};

const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== "admin") {
        return res.redirect("/login");
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
            existingUser.name = name.trim();
            existingUser.password = hashedPassword;
            existingUser.otp = otp;
            existingUser.otpExpires = otpExpires;
            await existingUser.save();
        } else {
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

        await sendOTPEmail(email, otp);

        return res.json({
            success: true,
            message: "OTP sent successfully",
            email
        });

    } catch (err) {
        console.error("❌ Signup Error:", err);
        res.status(500).json({ success: false, message: "Error creating account." });
    }
};

/* ================= VERIFY OTP ================= */
const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        if (user.otp !== otp || user.otpExpires < Date.now()) {
            return res.status(400).json({ success: false, message: "Invalid or expired OTP." });
        }

        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;

        await user.save();

        res.json({ success: true, message: "Verified successfully!" });

    } catch {
        res.status(500).json({ success: false, message: "Verification error." });
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
            return res.status(401).json({ success: false, message: "Invalid email or password." });
        }

        if (!user.isVerified && user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Please verify your email first.",
                isUnverified: true,
                email: user.email
            });
        }

        return await proceedToLogin(user, req, res);

    } catch {
        res.status(500).json({ success: false, message: "Login error occurred." });
    }
};

/* ================= LOGOUT ================= */
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