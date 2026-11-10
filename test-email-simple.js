// Simple Email Test for EduFlow
// Run with: node test-email-simple.js

require('dotenv').config({ path: '.env.local' });
const nodemailer = require('nodemailer');

async function testGmailSMTP() {
  console.log('🧪 Testing Gmail SMTP Configuration');
  console.log('='.repeat(40));

  // Check environment variables
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  console.log(`📧 EMAIL_USER: ${emailUser ? emailUser : '❌ MISSING'}`);
  console.log(`🔑 EMAIL_PASS: ${emailPass ? '***CONFIGURED***' : '❌ MISSING'}`);
  console.log(`🌐 NEXT_PUBLIC_APP_URL: ${appUrl || '❌ MISSING'}`);

  if (!emailUser || !emailPass || !appUrl) {
    console.error('\n❌ Please configure all environment variables in .env.local');
    return false;
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPass
    },
    connectionTimeout: 60000,
    greetingTimeout: 30000,
    socketTimeout: 60000,
  });

  try {
    // Test connection
    console.log('\n🔍 Testing Gmail connection...');
    await new Promise((resolve, reject) => {
      transporter.verify((error, success) => {
        if (error) {
          console.error('❌ Gmail connection failed:', error.message);
          reject(error);
        } else {
          console.log('✅ Gmail connection successful!');
          resolve(success);
        }
      });
    });

    // Send test email
    console.log('\n📧 Sending test email to yourself...');
    const result = await transporter.sendMail({
      from: `"EduFlow Test" <${emailUser}>`,
      to: emailUser, // Send to self for testing
      subject: '🧪 EduFlow Email System Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 10px;">
          <h2 style="color: #2563eb;">🧪 Email Configuration Test</h2>
          <p>This is a test email from EduFlow to verify Gmail SMTP is working.</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>From:</strong> EduFlow Email System</p>
          <p><strong>App URL:</strong> ${appUrl}</p>
          <hr>
          <p style="color: #6b7280; font-size: 12px;">If you receive this email, Gmail SMTP is configured correctly! 🎉</p>
        </div>
      `
    });

    console.log('✅ Test email sent successfully!');
    console.log('📧 Message ID:', result.messageId);
    console.log('📥 Check your inbox (including spam folder)');
    console.log('\n🎉 Email system is ready!');
    console.log('📝 Now you can test by adding a user in EduFlow admin panel');
    return true;

  } catch (error) {
    console.error('\n❌ Email test failed:', error.message);
    console.error('\n🔧 Common Gmail issues:');
    console.error('  1. 2-Factor Authentication not enabled');
    console.error('  2. App Password not generated (use 16-digit app password)');
    console.error('  3. "Less secure app access" not enabled');
    console.error('  4. Firewall blocking SMTP ports');
    return false;
  }
}

// Run the test
testGmailSMTP().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});
