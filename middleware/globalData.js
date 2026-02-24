/* ================= GLOBAL DATA MIDDLEWARE ================= */

module.exports = (req, res, next) => {

    /* Ensure cart exists */
    if (!req.session.cart) {
        req.session.cart = [];
    }

    /* Make session available in ALL EJS views */
    res.locals.session = req.session;

    /* Make logged user available globally */
    res.locals.user = req.user
        ? {
            id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            avatar: req.user.avatar || "/images/default-avatar.png"
        }
        : null;

    next();
};
