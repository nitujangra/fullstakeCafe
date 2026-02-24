// ================= ADMIN MIDDLEWARE (JWT BASED) =================

const isAdmin = (req, res, next) => {
    // User must be logged in
    if (!req.user) {
        return res.redirect("/login");
    }

    // Check role from JWT user
    if (req.user.role !== "admin") {
        return res.status(403).render("error", {
            message: "Access Denied: Admin Only"
        });
    }

    next();
};

module.exports = isAdmin;
