
async function testConnection() {
  const url = 'https://bwooonnkajwhllybmxto.supabase.co/auth/v1/health';
  console.log(`Testing connection to ${url}...`);
  try {
    const res = await fetch(url);
    console.log(`Status: ${res.status} ${res.statusText}`);
    const text = await res.text();
    console.log(`Response: ${text}`);
  } catch (err) {
    console.error(`Fetch failed: ${err.message}`);
  }
}

testConnection();
