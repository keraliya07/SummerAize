const nodemailer = require('nodemailer');
const { getDriveAuth } = require('./googleAuth');

async function createTransporter() {
  const auth = await getDriveAuth();
  const tokenResponse = await auth.getAccessToken();
  
  console.log('🔍 OAuth2 Debug Info:');
  console.log('EMAIL_USER:', process.env.EMAIL_USER);
  console.log('OAUTH_CLIENT_ID:', process.env.OAUTH_CLIENT_ID ? 'Set' : 'Missing');
  console.log('OAUTH_CLIENT_SECRET:', process.env.OAUTH_CLIENT_SECRET ? 'Set' : 'Missing');
  console.log('OAUTH_REFRESH_TOKEN:', process.env.OAUTH_REFRESH_TOKEN ? 'Set' : 'Missing');
  console.log('Access Token:', tokenResponse.token ? 'Generated' : 'Failed');
  console.log('Auth Credentials:', auth.credentials);
  
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: process.env.EMAIL_USER,
      clientId: process.env.OAUTH_CLIENT_ID,
      clientSecret: process.env.OAUTH_CLIENT_SECRET,
      refreshToken: process.env.OAUTH_REFRESH_TOKEN,
      accessToken: auth.credentials.access_token
    }
  });
}

function createWelcomeEmail(username) {
  return {
    subject: '🎉 Welcome to SummerAize!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; text-align: center;">🎉 Welcome to SummerAize!</h2>
        <p>Hi <strong>${username}</strong>,</p>
        <p>We’re thrilled to have you join our community! SummerAize makes reading easier by giving you smart, AI-powered summaries of your documents.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="color: #007bff; margin-top: 0;">Here’s what you can do:</h3>
          <ul style="color: #555; line-height: 1.6;">
            <li>📄 Upload PDF and Word documents</li>
            <li>⚡ Get fast, AI-powered summaries with Groq</li>
            <li>☁️ Store files securely in Google Drive</li>
            <li>🔍 Avoid duplicate processing with smart detection</li>
            <li>📱 Access summaries anytime, anywhere</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.BASE_URL}/login" 
             style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            Start Using SummerAize 🚀
          </a>
        </div>
        
        <p>Need help? Reach out to our support team anytime — we’ve got your back!</p>
        
        <p>Happy summarizing,<br><strong>The SummerAize Team</strong></p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px; text-align: center;">This is an automated message. Please do not reply directly to this email.</p>
      </div>
    `,
    text: `
🎉 Welcome to SummerAize!

Hi ${username},

We’re thrilled to have you join our community! SummerAize makes reading easier by giving you smart, AI-powered summaries of your documents.

Here’s what you can do:
• Upload PDF and Word documents
• Get fast, AI-powered summaries with Groq
• Store files securely in Google Drive
• Avoid duplicate processing with smart detection
• Access summaries anytime, anywhere

Start using SummerAize: ${process.env.BASE_URL}/login

Need help? Reach out to our support team anytime — we’ve got your back!

Happy summarizing,
The SummerAize Team
    `
  };
}

async function sendWelcomeEmail(email, username) {
  try {
    if (!process.env.EMAIL_USER || !process.env.OAUTH_CLIENT_ID || !process.env.OAUTH_CLIENT_SECRET || !process.env.OAUTH_REFRESH_TOKEN) {
      throw new Error('Email configuration missing: EMAIL_USER, OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET, and OAUTH_REFRESH_TOKEN must be set');
    }

    const transporter = await createTransporter();

    await transporter.verify();
    console.log('✅ Email server connection verified');

    const emailContent = createWelcomeEmail(username);

    console.log(`📧 Sending welcome email to: ${email}`);

    const result = await transporter.sendMail({
      from: `"SummerAize Team" <${process.env.EMAIL_USER}>`,
      to: email,
      ...emailContent
    });

    console.log('✅ Welcome email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);

    if (error.message.includes('Invalid login') || error.message.includes('Authentication failed')) {
      throw new Error('OAuth2 authentication failed. Check EMAIL_REFRESH_TOKEN and OAuth2 credentials.');
    } else if (error.message.includes('configuration missing')) {
      throw error;
    } else {
      throw new Error(`Failed to send welcome email: ${error.message}`);
    }
  }
}

function createResetPasswordEmail(resetUrl) {
  return {
    subject: 'Reset your SummerAize password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; text-align: center;">Reset your password</h2>
        <p>We received a request to reset your password. Click the button below to set a new one. This link will expire shortly.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}"
             style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            Reset Password
          </a>
        </div>
        <p>If you did not request this, you can safely ignore this email.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px; text-align: center;">This link is valid for a limited time.</p>
      </div>
    `,
    text: `Reset your password: ${resetUrl}\nIf you did not request this, ignore this email.`
  };
}

async function sendResetPasswordEmail(email, resetUrl) {
  try {
    if (!process.env.EMAIL_USER || !process.env.OAUTH_CLIENT_ID || !process.env.OAUTH_CLIENT_SECRET || !process.env.OAUTH_REFRESH_TOKEN) {
      throw new Error('Email configuration missing: EMAIL_USER, OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET, and OAUTH_REFRESH_TOKEN must be set');
    }
    const transporter = await createTransporter();
    await transporter.verify();
    const emailContent = createResetPasswordEmail(resetUrl);
    const result = await transporter.sendMail({
      from: `"SummerAize Team" <${process.env.EMAIL_USER}>`,
      to: email,
      ...emailContent
    });
    console.log('✅ Reset password email sent:', result.messageId);
    return true;
  } catch (error) {
    console.error('❌ Error sending reset email:', error);
    
    if (error.message.includes('Invalid login') || error.message.includes('BadCredentials')) {
      throw new Error('OAuth2 authentication failed. Please regenerate tokens with Gmail scope enabled.');
    } else if (error.message.includes('configuration missing')) {
      throw error;
    } else {
      throw new Error(`Failed to send reset email: ${error.message}`);
    }
  }
}

module.exports = { sendWelcomeEmail, sendResetPasswordEmail };
