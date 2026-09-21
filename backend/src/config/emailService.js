const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER?.trim(),
    pass: process.env.SMTP_PASS?.replace(/\s/g, ''),
  },
});

const sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: `"CRM System" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Your CRM Login OTP',
    text: `Your OTP for login is: ${otp}. It will expire in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee;">
        <h2 style="color: #333; text-align: center;">CRM Login OTP</h2>
        <p>Hello,</p>
        <p>Your One-Time Password (OTP) for accessing the CRM system is:</p>
        <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #000; margin: 20px 0;">
          ${otp}
        </div>
        <p>This OTP will expire in 10 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #777; text-align: center;">Enterprise Workflow Solution</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] OTP sent successfully to ${email}. Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('╔══════════════════════════════════════════════════════════╗');
    console.error('║  EMAIL SENDING FAILED                                    ║');
    console.error('╚══════════════════════════════════════════════════════════╝');
    console.error(`Recipient: ${email}`);
    console.error(`Error: ${error.message}`);
    if (error.code === 'EAUTH') {
      console.error('Suggestion: Check SMTP_USER and SMTP_PASS. For Gmail, use an App Password.');
    }
    return false;
  }
};

module.exports = { sendOTPEmail, transporter };
