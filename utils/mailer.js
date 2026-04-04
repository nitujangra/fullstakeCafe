require("dotenv").config();
const nodemailer = require("nodemailer");

/* ================= TRANSPORT ================= */
const transporter = nodemailer.createTransport({
    service: "gmail", // ✅ use your email provider (gmail recommended)
    auth: {
        user: process.env.EMAIL_USER,  // your email
        pass: process.env.EMAIL_PASS   // app password
    }
});

/* ================= VERIFY ================= */
const verifyConnection = async () => {
    try {
        await transporter.verify();
        console.log("✅ Mail server ready");
    } catch (err) {
        console.error("❌ Mail Error:", err.message);
    }
};

/* ================= SEND MAIL ================= */
const sendMail = async ({ to, subject, html }) => {
    try {
        const info = await transporter.sendMail({
            from: `"FullStack Cafe" <${process.env.EMAIL_USER}>`, // ✅ fixed
            to,
            subject,
            html
        });

        console.log("✅ Email sent:", info.messageId);
        return info;

    } catch (err) {
        console.error("❌ Email send error:", err.message);
        throw err;
    }
};

module.exports = {
    sendMail,
    verifyConnection
};