const nodemailer = require('nodemailer');

function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
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
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      throw new Error('Email configuration missing: EMAIL_USER and EMAIL_PASSWORD must be set');
    }

    const transporter = createTransporter();

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

    if (error.message.includes('Invalid login')) {
      throw new Error('Invalid credentials: Use Gmail App Password instead of your regular Gmail password.');
    } else if (error.message.includes('Authentication failed')) {
      throw new Error('Authentication failed. Check EMAIL_USER and EMAIL_PASSWORD.');
    } else if (error.message.includes('configuration missing')) {
      throw error;
    } else {
      throw new Error(`Failed to send welcome email: ${error.message}`);
    }
  }
}

module.exports = { sendWelcomeEmail };
