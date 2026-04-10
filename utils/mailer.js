const { google } = require('googleapis');

// 1. Initialize the OAuth2 Client
const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.REDIRECT_URI
);

/**
 * sendMail function to send emails using Gmail API
 */
const sendMail = async ({ to, subject, html }) => {
  try {
    // 2. DEBUG: Ensure the environment variable names match your .env file
    // If your .env uses GMAIL_REFRESH_TOKEN, use that here too!
    const refreshToken = process.env.GMAIL_REFRESH_TOKEN || process.env.REFRESH_TOKEN;
    
    console.log("Checking Token:", refreshToken ? "Token Found ✅" : "Token Missing ❌");

    if (!refreshToken) {
      throw new Error("Refresh token is missing from environment variables.");
    }

    // 3. Set Credentials
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // 4. Create the email content
    // Note: Use \r\n for MIME standards to avoid issues with some mail clients
    const str = [
      `To: ${to}`,
      `Content-Type: text/html; charset=utf-8`,
      `MIME-Version: 1.0`,
      `Subject: ${subject}`,
      ``,
      html
    ].join('\r\n');

    // 5. Encode the email in Base64URL
    const encodedMail = Buffer.from(str)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // 6. Send via Gmail API
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMail
      }
    });

    console.log(`✅ OTP sent successfully to ${to} via Gmail API`);
    return true;
  } catch (err) {
    console.error("❌ GMAIL API ERROR:", err.message);
    throw err;
  }
};

module.exports = { sendMail };