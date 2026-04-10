// Import the updated Gmail API sendMail function
const { sendMail } = require("./mailer"); 

/**
 * Generates a random 6-digit numeric string
 */
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Sends an OTP via Gmail API and returns the code for DB storage
 */
const sendOTP = async (email) => {
    const otp = generateOTP();

    const mailOptions = {
        to: email,
        subject: "OTP Verification - FullStack Cafe",
        html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; padding: 30px; border: 1px solid #e0e0e0; border-radius: 12px; max-width: 400px; margin: auto;">
                <h2 style="color: #2d3436; margin-bottom: 10px;">Verification Code</h2>
                <p style="color: #636e72; font-size: 16px;">Please use the following OTP to verify your account at <strong>FullStack Cafe</strong>.</p>
                <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h1 style="color: #0984e3; font-size: 42px; letter-spacing: 8px; margin: 0; font-weight: bold;">${otp}</h1>
                </div>
                <p style="color: #b2bec3; font-size: 13px;">This code is valid for 5 minutes. If you did not request this, please ignore this email.</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #dfe6e9; font-size: 11px;">&copy; 2026 FullStack Cafe Internship Project</p>
            </div>
        `
    };

    try {
        // Now using the Gmail API (HTTPS) method
        await sendMail(mailOptions);
        
        // Return the OTP so your Controller can save it to MongoDB
        return otp; 
    } catch (error) {
        console.error("❌ Failed to send OTP email:", error.message);
        throw new Error("Email delivery failed. Please try again later.");
    }
};

module.exports = sendOTP;