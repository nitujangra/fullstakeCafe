const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.SECRET_KEY || "supersecretkey";
const { requireAuth } = require("../controllers/authcontroller");

// ================= 2. REQUIRE AUTH (Protection Middleware) =================
exports.requireAuth = (req, res, next) => {
    if (!req.user) {
        return res.redirect("/login");
    }
    next();
};

// ================= 3. SIGNUP (Your Existing Code) =================
exports.signup = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).send("User already exists with this email.");
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            role: "user"
        });

        await newUser.save();

        const token = jwt.sign({ id: newUser._id, role: newUser.role }, SECRET_KEY, {
            expiresIn: "1d",
        });

        res.cookie("token", token, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000,
        });

        res.redirect("/");

    } catch (err) {
        console.error(err);
        res.status(500).send("Error creating account.");
    }
};

// ================= 4. LOGIN =================
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(401).send("Invalid email or password");

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).send("Invalid email or password");

        const token = jwt.sign({ id: user._id, role: user.role }, SECRET_KEY, {
            expiresIn: "1d",
        });

        res.cookie("token", token, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000,
        });

        // Redirect Admin to Dashboard, others to Products/Home
        if (user.role === "admin") return res.redirect("/admin");
        res.redirect("/products");

    } catch (err) {
        console.error(err);
        res.status(500).send("Login error");
    }
};

// ================= 5. LOGOUT =================
exports.logout = (req, res) => {
    res.clearCookie("token");
    res.redirect("/login");
};