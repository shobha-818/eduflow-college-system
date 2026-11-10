// Comprehensive Email System Test for EduFlow
// Run with: node test-email-system.js

require('dotenv').config({ path: '.env.local' });

async function testEmailSystem() {
  console.log('🧪 EduFlow Email System Test');
  console.log('='.repeat(50));

  // Check environment variables
  console.log('🔍 Checking environment variables...');
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

  console.log('\n✅ Environment variables configured!');
  console.log('\n📋 Available Tests:');
  console.log('1. Test Gmail SMTP Connection');
  console.log('2. Test Verification Email');
  console.log('3. Test Announcement Email');
  console.log('4. Exit');

  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt) => new Promise(resolve => readline.question(prompt, resolve));

  try {
    const choice = await question('\n🎯 Select test (1-4): ');

    switch (choice.trim()) {
      case '1':
        await testGmailConnection();
        break;
      case '2':
        await testVerificationEmail();
        break;
      case '3':
        await testAnnouncementEmail();
        break;
      case '4':
        console.log('👋 Exiting test...');
        break;
      default:
        console.log('❌ Invalid choice');
    }
  } finally {
    readline.close();
  }
}

async function testGmailConnection() {
  console.log('\n🔍 Testing Gmail SMTP Connection...');
  const nodemailer = require('nodemailer');

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
    return true;
  } catch (error) {
    console.error('❌ Gmail connection test failed:', error.message);
    return false;
  }
}

async function testVerificationEmail() {
  console.log('\n📧 Testing Verification Email...');
  
  const testEmail = await question('📥 Enter test email address: ');
  const testName = await question('👤 Enter test name: ');
  
  if (!testEmail || !testName) {
    console.log('❌ Email and name required');
    return false;
  }

  try {
    const { sendVerificationEmail } = require('./lib/emailService');
    const token = 'test-token-' + Math.random().toString(36).substring(2, 15);
    
    const result = await sendVerificationEmail(testEmail, testName, token);
    console.log('✅ Verification email sent successfully!');
    console.log(`📥 To: ${testEmail}`);
    console.log(`👤 Name: ${testName}`);
    console.log('🔗 Check your email (including spam folder)');
    return true;
  } catch (error) {
    console.error('❌ Verification email test failed:', error.message);
    return false;
  }
}

async function testAnnouncementEmail() {
  console.log('\n📢 Testing Announcement Email...');
  
  const testEmail = await question('📥 Enter test email address: ');
  const testName = await question('👤 Enter test name: ');
  const testTitle = await question('📝 Enter test announcement title: ');
  const testContent = await question('📄 Enter test announcement content: ');
  
  if (!testEmail || !testName || !testTitle || !testContent) {
    console.log('❌ All fields required');
    return false;
  }

  try {
    const { sendAnnouncementNotification } = require('./lib/emailService');
    const testUserId = 'test-user-id';
    
    const result = await sendAnnouncementNotification(testEmail, testUserId, testTitle, testContent);
    console.log('✅ Announcement email sent successfully!');
    console.log(`📥 To: ${testEmail}`);
    console.log(`📝 Title: ${testTitle}`);
    console.log('🔗 Check your email (including spam folder)');
    return true;
  } catch (error) {
    console.error('❌ Announcement email test failed:', error.message);
    return false;
  }
}

// Run the test
testEmailSystem().catch(error => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});
