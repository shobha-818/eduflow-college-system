const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runAudit() {
  console.log('--- DATABASE AUDIT ---');
  
  // 1. Check connection and basic query
  console.log('Testing basic SELECT query on profiles...');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, role')
    .limit(5);
    
  if (profilesError) {
    console.error('FAIL: Error fetching profiles:', profilesError.message);
  } else {
    console.log('SUCCESS: Profiles fetched:', profiles.length);
  }

  // 2. Check essential tables
  const essentialTables = [
    'profiles', 'students', 'departments', 'classes', 'subjects', 
    'attendance', 'attendance_records', 'tasks', 'announcements', 
    'events', 'leaves', 'chat_conversations', 'chat_messages', 
    'notifications', 'meetings', 'time_slots'
  ];

  console.log('\nChecking table existence...');
  for (const table of essentialTables) {
    const { error } = await supabase.from(table).select('*').limit(0);
    if (error) {
      console.log(`[ ] ${table.padEnd(20)}: MISSING or ERROR (${error.message})`);
    } else {
      console.log(`[x] ${table.padEnd(20)}: OK`);
    }
  }

  // 3. Verify specific columns in problematic tables
  console.log('\nChecking problematic schemas...');
  
  // Check notifications message column
  const { error: notifError } = await supabase.from('notifications').select('message').limit(0);
  if (notifError) {
    console.log('[ ] Notifications message column: MISSING');
  } else {
    console.log('[x] Notifications message column: OK');
  }

  // Check attendance_records status column
  const { error: attError } = await supabase.from('attendance_records').select('status').limit(0);
  if (attError) {
    console.log('[ ] Attendance_records status column: MISSING');
  } else {
    console.log('[x] Attendance_records status column: OK');
  }
}

runAudit();
