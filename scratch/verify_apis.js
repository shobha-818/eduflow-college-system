require('dotenv').config({ path: '.env.local' });

const baseUrl = 'http://localhost:3001';

async function testAPIs() {
  console.log('--- API ROUTES AUDIT ---');
  const routes = [
    '/api/attendance',
    '/api/leaves',
    '/api/meetings',
    '/api/chat',
    '/api/announcements',
    '/api/tasks',
    '/api/subjects',
    '/api/departments',
    '/api/classes'
  ];

  for (const route of routes) {
    try {
      const res = await fetch(`${baseUrl}${route}`);
      console.log(`${route.padEnd(20)}: Status ${res.status}`);
    } catch (err) {
      console.error(`${route.padEnd(20)}: FAILED (${err.message})`);
    }
  }
}

testAPIs();
