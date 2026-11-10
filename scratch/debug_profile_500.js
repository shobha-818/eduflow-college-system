// Debug script to get the actual 500 error body from Supabase profiles endpoint
const SUPABASE_URL = 'https://bwooonnkajwhllybmxto.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3b29vbm5rYWp3aGxseWJteHRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMDA0MjksImV4cCI6MjA5Mzg3NjQyOX0.6_GLWhWhbbMyfWwaUM9JdAh0KuAXjkz-FUbjlYw0-YY';
const USER_ID = 'f27b1915-b57d-4ee0-9646-2f4ce34c2b36';

async function debugProfileFetch() {
  console.log('=== Debugging Supabase Profiles 500 Error ===\n');
  
  // Test 1: Fetch profile without auth (anon)
  console.log('--- Test 1: Anon fetch of specific profile ---');
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?select=*&id=eq.${USER_ID}`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log(`Status: ${res.status} ${res.statusText}`);
    const body = await res.text();
    console.log(`Response body: ${body}\n`);
  } catch (err) {
    console.error('Network error:', err.message);
  }

  // Test 2: Fetch ALL profiles (no filter)
  console.log('--- Test 2: Anon fetch all profiles ---');
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?select=id,name,email,role&limit=5`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log(`Status: ${res.status} ${res.statusText}`);
    const body = await res.text();
    console.log(`Response body: ${body}\n`);
  } catch (err) {
    console.error('Network error:', err.message);
  }

  // Test 3: Fetch with select=* to check if a specific column is causing the 500
  console.log('--- Test 3: Fetch with minimal columns ---');
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?select=id,name,email,role,department&id=eq.${USER_ID}`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log(`Status: ${res.status} ${res.statusText}`);
    const body = await res.text();
    console.log(`Response body: ${body}\n`);
  } catch (err) {
    console.error('Network error:', err.message);
  }

  // Test 4: Check if the profiles table exists via the schema endpoint
  console.log('--- Test 4: Check table definition ---');
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?select=*&limit=0`,
      {
        method: 'HEAD',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    console.log(`Status: ${res.status} ${res.statusText}`);
    console.log('Headers:', Object.fromEntries(res.headers.entries()));
  } catch (err) {
    console.error('Network error:', err.message);
  }
}

debugProfileFetch();
