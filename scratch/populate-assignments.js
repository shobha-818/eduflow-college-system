const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] ? match[2].trim() : '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    }
    env[match[1]] = value;
  }
});

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['NEXT_PUBLIC_SUPABASE_ANON_KEY']);

async function run() {
  // Get all faculties
  const { data: faculties } = await supabase.from('profiles').select('id, email').in('email', ['rajesh@gmail.com', 'ns8359376@gmail.com', 'ns835976@gmail.com']);
  const { data: classes } = await supabase.from('classes').select('id, name');
  const { data: subjects } = await supabase.from('subjects').select('id, name, code');

  const rajesh = faculties.find(f => f.email === 'rajesh@gmail.com');
  const ns376 = faculties.find(f => f.email === 'ns8359376@gmail.com');
  const ns76 = faculties.find(f => f.email === 'ns835976@gmail.com');

  const cs3 = classes.find(c => c.name === 'CS Semester 3');
  const cs5 = classes.find(c => c.name === 'CS Semester 5');
  const ec3 = classes.find(c => c.name === 'EC Semester 3');
  const ec5 = classes.find(c => c.name === 'EC Semester 5');
  const me3 = classes.find(c => c.name === 'ME Semester 3');
  const me5 = classes.find(c => c.name === 'ME Semester 5');

  const cs301 = subjects.find(s => s.code === 'CS301');
  const cs302 = subjects.find(s => s.code === 'CS302');
  const cs303 = subjects.find(s => s.code === 'CS303');
  const cs501 = subjects.find(s => s.code === 'CS501');
  const cs502 = subjects.find(s => s.code === 'CS502');

  const ec301 = subjects.find(s => s.code === 'EC301');
  const ec302 = subjects.find(s => s.code === 'EC302');
  const ec303 = subjects.find(s => s.code === 'EC303');
  const ec501 = subjects.find(s => s.code === 'EC501');
  const ec502 = subjects.find(s => s.code === 'EC502');

  const me301 = subjects.find(s => s.code === 'ME301');
  const me302 = subjects.find(s => s.code === 'ME302');
  const me303 = subjects.find(s => s.code === 'ME303');
  const me501 = subjects.find(s => s.code === 'ME501');
  const me502 = subjects.find(s => s.code === 'ME502');

  const assignments = [];

  if (rajesh) {
    if (cs3 && cs301) assignments.push({ faculty_id: rajesh.id, class_id: cs3.id, subject_id: cs301.id });
    if (cs3 && cs302) assignments.push({ faculty_id: rajesh.id, class_id: cs3.id, subject_id: cs302.id });
    if (cs3 && cs303) assignments.push({ faculty_id: rajesh.id, class_id: cs3.id, subject_id: cs303.id });
    if (cs5 && cs501) assignments.push({ faculty_id: rajesh.id, class_id: cs5.id, subject_id: cs501.id });
    if (cs5 && cs502) assignments.push({ faculty_id: rajesh.id, class_id: cs5.id, subject_id: cs502.id });
  }

  if (ns376) {
    if (ec3 && ec301) assignments.push({ faculty_id: ns376.id, class_id: ec3.id, subject_id: ec301.id });
    if (ec3 && ec302) assignments.push({ faculty_id: ns376.id, class_id: ec3.id, subject_id: ec302.id });
    if (ec3 && ec303) assignments.push({ faculty_id: ns376.id, class_id: ec3.id, subject_id: ec303.id });
    if (ec5 && ec501) assignments.push({ faculty_id: ns376.id, class_id: ec5.id, subject_id: ec501.id });
    if (ec5 && ec502) assignments.push({ faculty_id: ns376.id, class_id: ec5.id, subject_id: ec502.id });
  }

  if (ns76) {
    if (me3 && me301) assignments.push({ faculty_id: ns76.id, class_id: me3.id, subject_id: me301.id });
    if (me3 && me302) assignments.push({ faculty_id: ns76.id, class_id: me3.id, subject_id: me302.id });
    if (me3 && me303) assignments.push({ faculty_id: ns76.id, class_id: me3.id, subject_id: me303.id });
    if (me5 && me501) assignments.push({ faculty_id: ns76.id, class_id: me5.id, subject_id: me501.id });
    if (me5 && me502) assignments.push({ faculty_id: ns76.id, class_id: me5.id, subject_id: me502.id });
  }

  console.log('Inserting assignments:', assignments.length);
  const { data, error } = await supabase.from('faculty_class_subjects').insert(assignments).select();
  if (error) {
    console.error('Error inserting assignments:', error);
  } else {
    console.log('Successfully inserted!', data);
  }
}
run();
