require("dotenv").config();
const nodemailer = require("nodemailer");
const dns = require("node:dns"); // Use node: prefix for clarity

/* 🔥 FORCE IPV4 GLOBALLY */
// This tells Node.js to resolve 'smtp.gmail.com' to an IPv4 address (like 74.125.x.x) 
// instead of the IPv6 address that was causing your ENETUNREACH error.
dns.setDefaultResultOrder("ipv4first");

/* ================= TRANSPORT (FINAL FIXED) ================= */
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // Must be false for port 587
    service: "gmail", // Adding the service helper for better compatibility
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // MUST be a 16-character App Password
    },
    /* The 'family: 4' setting here is the direct fix for 
       the 'connect ENETUNREACH' error you provided.
    */
    family: 4, 
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 30000,
    tls: {
        // Essential for cloud hosts like Render to avoid handshake rejections
        rejectUnauthorized: false,
        minVersion: "TLSv1.2"
    }
});

/* ================= VERIFY ================= */
const verifyConnection = async () => {
    try {
        await transporter.verify();
        console.log("✅ Mail server connection established successfully");
    } catch (err) {
        console.error("❌ SMTP Verification Failed:", err.message);
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

        console.log("✅ Email sent successfully ID:", info.messageId);
        return info;

    } catch (err) {
        // Detailed logging to help you see exactly why it failed if it does again
        console.error("❌ Nodemailer Send Error:", {
            code: err.code,
            command: err.command,
            response: err.response,
            stack: err.stack
        });
        throw new Error("Email not sent: " + err.message);
    }
};

module.exports = {
    sendMail,
    verifyConnection
};