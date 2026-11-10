const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testColumns(tableName, columns) {
  console.log(`Testing columns for ${tableName}:`);
  for (const col of columns) {
    const { error } = await supabase.from(tableName).select(col).limit(0);
    if (error) {
      console.log(`[ ] ${col}: MISSING (${error.message})`);
    } else {
      console.log(`[x] ${col}: OK`);
    }
  }
}

async function run() {
  await testColumns('attendance', [
    'id', 'student_id', 'student_name', 'date', 'attendance_date', 
    'status', 'subject', 'subject_id', 'faculty_id', 'faculty_name', 
    'department', 'department_id', 'semester', 'class_id', 'topic_covered'
  ]);
}

run();
