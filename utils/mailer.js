require("dotenv").config();
const nodemailer = require("nodemailer");
const dns = require("node:dns");

// Force IPv4 at the DNS level in the script
dns.setDefaultResultOrder("ipv4first");

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,         // Switched to 465
    secure: true,      // true for 465
    service: "gmail",  // Helps Nodemailer auto-configure Gmail settings
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // Ensure this is a 16-character App Password
    },
    family: 4,         // Force IPv4
    tls: {
        // This prevents the "Unreachable" error if Render's network 
        // struggles with the certificate handshake
        rejectUnauthorized: false,
        servername: 'smtp.gmail.com'
    }
});

const verifyConnection = async () => {
    try {
        await transporter.verify();
        console.log("✅ Mail server ready (IPv4 Force Active)");
    } catch (err) {
        console.error("❌ SMTP Verification Failed:", err.message);
    }
};

const sendMail = async ({ to, subject, html }) => {
    try {
        const info = await transporter.sendMail({
            from: `"FullStack Cafe" <${process.env.EMAIL_USER}>`,
            to: to.trim().toLowerCase(),
            subject,
            html
        });
        console.log("✅ Email sent:", info.messageId);
        return info;
    } catch (err) {
        console.error("❌ Send Error:", err.message);
        throw new Error("Email not sent");
    }
};

module.exports = { sendMail, verifyConnection };