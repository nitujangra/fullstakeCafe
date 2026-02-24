const Support = require("../models/support");

exports.submitContact = async (req, res) => {
    try {
        const { name, email, product_name, message } = req.body;
console.log("Received support contact:", { name, email, product_name, message });
        const newSupportEntry = new Support({
            name,
            email,
            product_name,
            message
        });

        await newSupportEntry.save();

        // Redirect back to support page with a success message or alert
        res.send("<script>alert('Message sent successfully!'); window.location.href='/support';</script>");
    } catch (error) {
        console.error("Support submission error:", error);
        res.status(500).send("There was an error saving your message.");
    }
};