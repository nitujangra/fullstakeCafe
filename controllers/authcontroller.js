const User = require('../models/User');
const Cart = require("../models/Cart");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const SECRET_KEY = process.env.SECRET_KEY || "supersecretkey";

// --- ULTIMATE Nodemailer Transporter Configuration ---
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, 
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // Use your 16-digit App Password here
    },
    family: 4, // CRITICAL: Forces IPv4 to bypass Render's network timeout errors
    connectionTimeout: 10000, 
    greetingTimeout: 10000,
    tls: {
        rejectUnauthorized: false, 
        minVersion: 'TLSv1.2'
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

/* ================= 4. SIGNUP (FIXED) ================= */
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

        // --- 10 MINUTE VALIDATION LOGIC ---
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = Date.now() + 10 * 60 * 1000; // Current time + 10 mins
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

        // --- NON-BLOCKING BACKGROUND EMAIL ---
        // This stops the page from timing out/showing errors to the user
        transporter.sendMail({
            from: `"FullStack Cafe" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Verify your FullStack Cafe Account",
            html: `<h3>Your OTP is: ${otp}</h3><p>Valid for 10 minutes.</p>`
        }).then(() => {
            console.log("OTP Email sent successfully to:", email);
        }).catch(e => {
            console.error("Email failed in background:", e.message);
        });

        // Always respond success to the browser immediately
        return res.json({ 
            success: true, 
            message: "OTP sent! Please check your email.", 
            email 
        });

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

        // Checks if OTP matches AND if current time is less than expiration time
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