const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTable(tableName) {
  console.log(`--- INSPECTING ${tableName} ---`);
  // Fetch one row to see keys
  const { data, error } = await supabase.from(tableName).select('*').limit(1);
  if (error) {
    console.error(`Error: ${error.message}`);
  } else if (data && data.length > 0) {
    console.log(`Columns found in ${tableName}:`, Object.keys(data[0]).join(', '));
  } else {
    // If no data, try to select from a non-existent column to see error message which might contain column names or just fail
    console.log(`No data in ${tableName}. Trying to infer schema...`);
    const { error: schemaError } = await supabase.from(tableName).select('non_existent_column').limit(0);
    console.log('PostgREST error (often lists columns):', schemaError?.message);
  }
}

async function run() {
  await inspectTable('attendance');
  await inspectTable('profiles');
  await inspectTable('students');
  await inspectTable('notifications');
}

run();
