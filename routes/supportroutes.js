const express = require("express");
const router = express.Router();
const supportController = require("../controllers/supportcontroller");

// This handles GET http://localhost:3000/support
router.get("/", (req, res) => {
    res.render("support");
});

// This handles POST http://localhost:3000/support/contact
router.post("/contact", supportController.submitContact);

module.exports = router;