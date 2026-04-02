const transporter = require("./mailer");

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOTP = async (email) => {
    const otp = generateOTP();

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "OTP Verification",
        html: `
            <h2>Your OTP Code</h2>
            <h1>${otp}</h1>
            <p>This OTP is valid for 5 minutes.</p>
        `
    };

    await transporter.sendMail(mailOptions);

    return otp;
};

module.exports = sendOTP;