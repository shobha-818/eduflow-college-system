// Simple test script to verify Gmail SMTP configuration
// Run with: node test-email.js

require('dotenv').config({ path: '.env.local' });
const nodemailer = require('nodemailer');

async function testEmailConfig() {
  console.log('🧪 Testing Gmail SMTP Configuration...');
  console.log('📧 Email User:', process.env.EMAIL_USER);
  console.log('🔑 Email Pass:', process.env.EMAIL_PASS ? '***CONFIGURED***' : 'MISSING');
  console.log('🌐 App URL:', process.env.NEXT_PUBLIC_APP_URL);

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('❌ Email configuration missing in .env.local');
    return false;
  }

  const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    connectionTimeout: 60000,
    greetingTimeout: 30000,
    socketTimeout: 60000,
  });

  try {
    // Test connection
    console.log('🔍 Testing Gmail connection...');
    await new Promise((resolve, reject) => {
      transporter.verify((error, success) => {
        if (error) {
          console.error('❌ Gmail connection failed:', error);
          reject(error);
        } else {
          console.log('✅ Gmail connection successful!');
          resolve(success);
        }
      });
    });

    // Send test email
    console.log('📧 Sending test email...');
    const testEmail = process.env.EMAIL_USER; // Send to self for testing
    const result = await transporter.sendMail({
      from: `"EduFlow Test" <${process.env.EMAIL_USER}>`,
      to: testEmail,
      subject: '🧪 EduFlow Email Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 10px;">
          <h2 style="color: #2563eb;">🧪 Email Configuration Test</h2>
          <p>This is a test email from EduFlow to verify Gmail SMTP is working.</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>From:</strong> EduFlow Email System</p>
          <hr>
          <p style="color: #6b7280; font-size: 12px;">If you receive this email, Gmail SMTP is configured correctly! 🎉</p>
        </div>
      `
    });

    console.log('✅ Test email sent successfully!');
    console.log('📧 Message ID:', result.messageId);
    console.log('📥 Check your inbox (including spam folder)');
    return true;

  } catch (error) {
    console.error('❌ Email test failed:', error);
    console.error('🔧 Common issues:');
    console.error('  1. 2-Factor Authentication not enabled on Gmail account');
    console.error('  2. App Password not generated (use 16-digit app password, not regular password)');
    console.error('  3. "Less secure app access" not enabled in Gmail settings');
    console.error('  4. Firewall blocking SMTP ports');
    return false;
  }
}

// Run the test
testEmailConfig().then(success => {
  if (success) {
    console.log('\n🎉 Email configuration is working!');
    console.log('📝 Now you can test by adding a user in EduFlow admin panel');
  } else {
    console.log('\n❌ Email configuration failed. Please check the issues above.');
  }
  process.exit(success ? 0 : 1);
});
