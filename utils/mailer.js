require("dotenv").config();
const nodemailer = require("nodemailer");

/* ================= TRANSPORT (FIXED) ================= */
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",   // ✅ use host instead of service
    port: 587,                // ✅ important
    secure: false,            // ✅ false for 587
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    connectionTimeout: 10000, // ✅ prevent long hanging
    greetingTimeout: 10000,
    socketTimeout: 10000
});

/* ================= VERIFY ================= */
const verifyConnection = async () => {
    try {
        await transporter.verify();
        console.log("✅ Mail server ready");
    } catch (err) {
        console.error("❌ Mail Error:", err);
    }
};

/* ================= SEND MAIL ================= */
const sendMail = async ({ to, subject, html }) => {
    try {
        const info = await transporter.sendMail({
            from: `"FullStack Cafe" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html
        });

        console.log("✅ Email sent:", info.messageId);
        return info;

    } catch (err) {
        console.error("❌ Email send error:", err);
        throw new Error("Email not sent");
    }
};

module.exports = {
    sendMail,
    verifyConnection
};