/**
 * Resets the database (runs database/schema.sql) and loads demo data.
 * Usage: npm run seed      (WARNING: wipes all existing data)
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const HOUR = 60;

// ---------- demo people ----------
const STAFF = [
  ['rahul', 'Rahul Sharma', 'Electrical Department'],
  ['neha', 'Neha Verma', 'IT Department'],
  ['amit', 'Amit Patel', 'Housekeeping'],
  ['manoj', 'Manoj Singh', 'Civil/Maintenance'],
  ['kavita', 'Kavita Joshi', 'Lab Maintenance'],
  ['suresh', 'Suresh Yadav', 'Plumbing Department'],
  ['deepak', 'Deepak Chauhan', 'Maintenance Department'],
  ['vikram', 'Vikram Rawat', 'Security Department'],
];
const STUDENTS = [
  ['student@campus.edu', 'Aarav Mehta', 'CS2101', 'Computer Science', 2],
  ['ishita@student.campus.edu', 'Ishita Rao', 'EC2087', 'Electronics', 3],
  ['rohan@student.campus.edu', 'Rohan Gupta', 'ME2203', 'Mechanical', 1],
  ['sneha@student.campus.edu', 'Sneha Iyer', 'CS1945', 'Computer Science', 4],
  ['karan@student.campus.edu', 'Karan Malhotra', 'EE2112', 'Electrical', 2],
];

// ---------- campus locations ----------
const FLOORS = ['Ground Floor', '1st Floor', '2nd Floor'];
const BUILDINGS = {
  'Block A': { rooms: { 'Ground Floor': ['Room G1', 'Room G2'], '1st Floor': ['Room 101', 'Room 102', 'Room 103'], '2nd Floor': ['Room 201', 'Room 202', 'Room 203', 'Room 204', 'Room 205'] } },
  'Block B': { rooms: { 'Ground Floor': ['Room G1', 'Room G2'], '1st Floor': ['Room 101', 'Room 102', 'Room 103'], '2nd Floor': ['Lab 1', 'Lab 2', 'Lab 3'] } },
  'Block C': { rooms: { 'Ground Floor': ['Room G1'], '1st Floor': ['Room 101', 'Room 102'], '2nd Floor': ['Room 201', 'Room 202', 'Room 203'] } },
};
const AREAS = ['Corridor', 'Washroom'];
const EXTRA = [
  ['Library', 'Ground Floor', null, 'Reading Hall'], ['Library', 'Ground Floor', null, 'Corridor'],
  ['Library', '1st Floor', null, 'Computer Section'], ['Library', '1st Floor', null, 'Corridor'],
  ['Cafeteria', 'Ground Floor', null, 'Dining Hall'], ['Cafeteria', 'Ground Floor', null, 'Outdoor Seating'],
];

// title, description, category, building, floor, spot, priority, status, ageHours, staff, studentIdx
const COMPLAINTS = [
  ['Ceiling fan not working', 'The ceiling fan stopped running and the room gets very hot during lectures.', 'Electrical', 'Block A', '2nd Floor', 'Room 201', 'Medium', 'Closed', 300, 'rahul', 0],
  ['Tube light flickering', 'The tube light flickers constantly and gives students headaches.', 'Electrical', 'Block A', '1st Floor', 'Room 102', 'Low', 'Closed', 260, 'rahul', 1],
  ['Power socket sparking', 'The socket near the projector sparks when a plug is inserted. Looks dangerous.', 'Electrical', 'Block A', '2nd Floor', 'Room 203', 'High', 'Resolved', 30, 'rahul', 2],
  ['Projector has no power', 'The ceiling projector does not switch on. The wall switch is dead.', 'Electrical', 'Block B', '1st Floor', 'Room 102', 'Medium', 'In Progress', 60, 'rahul', 3],
  ['Fan regulator broken', 'The fan regulator knob is broken, so the fan only runs at full speed.', 'Electrical', 'Block A', '2nd Floor', 'Room 204', 'Medium', 'Assigned', 100, 'rahul', 0],
  ['Corridor lights are off', 'None of the corridor lights work after 5 PM. It is very dark.', 'Electrical', 'Block C', 'Ground Floor', 'Corridor', 'High', 'Submitted', 3, null, 4],
  ['Wi-Fi not working on second floor', 'There is no Wi-Fi signal on the second floor of Block A since morning.', 'Internet/Wi-Fi', 'Block A', '2nd Floor', 'Corridor', 'High', 'In Progress', 20, 'neha', 1],
  ['Wi-Fi extremely slow in classroom', 'Wi-Fi connects but pages barely load in Room 202.', 'Internet/Wi-Fi', 'Block A', '2nd Floor', 'Room 202', 'Medium', 'Under Review', 8, null, 2],
  ['Wi-Fi keeps disconnecting', 'Wi-Fi drops every few minutes in Room 205 and we have to reconnect.', 'Internet/Wi-Fi', 'Block A', '2nd Floor', 'Room 205', 'Medium', 'Assigned', 40, 'neha', 3],
  ['No internet in reading hall', 'The library reading hall has no internet access, which affects exam preparation.', 'Internet/Wi-Fi', 'Library', 'Ground Floor', 'Reading Hall', 'High', 'Closed', 120, 'neha', 4],
  ['Wi-Fi router offline', 'The router on the second floor corridor of Block B is offline again.', 'Internet/Wi-Fi', 'Block B', '2nd Floor', 'Corridor', 'High', 'Reopened', 90, 'neha', 0],
  ['Classroom not cleaned', 'The classroom has not been cleaned for three days and the floor is dusty.', 'Cleanliness', 'Block B', 'Ground Floor', 'Room G1', 'Medium', 'Closed', 220, 'amit', 1],
  ['Dustbins overflowing', 'Corridor dustbins are overflowing and attract flies.', 'Cleanliness', 'Block B', '1st Floor', 'Corridor', 'Medium', 'In Progress', 50, 'amit', 2],
  ['Washroom is unclean', 'The washroom has not been cleaned and smells bad. Needs urgent attention.', 'Cleanliness', 'Block B', '1st Floor', 'Washroom', 'High', 'Assigned', 28, 'amit', 3],
  ['Dirty tables in dining hall', 'Dining hall tables are sticky and not wiped after lunch.', 'Cleanliness', 'Cafeteria', 'Ground Floor', 'Dining Hall', 'Low', 'Submitted', 6, null, 4],
  ['Ceiling plaster peeling off', 'Plaster is peeling off the ceiling near the back benches.', 'Infrastructure', 'Block C', '1st Floor', 'Room 101', 'Medium', 'Under Review', 80, null, 0],
  ['Broken window glass', 'A window pane is cracked and pieces may fall on students sitting nearby.', 'Infrastructure', 'Block C', '2nd Floor', 'Room 203', 'High', 'Resolved', 15, 'manoj', 1],
  ['Microscope lens damaged', 'The lens on microscope number 4 is cracked and gives blurry images.', 'Laboratory Equipment', 'Block B', '2nd Floor', 'Lab 1', 'Medium', 'In Progress', 45, 'kavita', 2],
  ['Oscilloscope will not power on', 'Two oscilloscopes on the front bench do not switch on.', 'Laboratory Equipment', 'Block B', '2nd Floor', 'Lab 2', 'High', 'Assigned', 50, 'kavita', 3],
  ['Lab computers keep hanging', 'Several lab computers freeze when opening the compiler.', 'Laboratory Equipment', 'Block B', '2nd Floor', 'Lab 3', 'Low', 'Closed', 400, 'kavita', 4],
  ['Water leaking in washroom', 'A tap pipe is leaking and the washroom floor is flooded.', 'Water/Plumbing', 'Block A', '1st Floor', 'Washroom', 'High', 'Closed', 150, 'suresh', 0],
  ['Water cooler not working', 'The water cooler near the corridor gives no water.', 'Water/Plumbing', 'Block C', 'Ground Floor', 'Corridor', 'Medium', 'Assigned', 20, 'suresh', 1],
  ['Broken benches in reading hall', 'Three benches have broken legs and wobble when used.', 'Furniture', 'Library', 'Ground Floor', 'Reading Hall', 'Low', 'Assigned', 200, 'deepak', 2],
  ['Poor lighting near bike parking', 'The outdoor seating and parking area is dark at night, which feels unsafe.', 'Security', 'Cafeteria', 'Ground Floor', 'Outdoor Seating', 'High', 'In Progress', 10, 'vikram', 3],
];
// complaintIndex -> other students affected ("me too" support)
const SUPPORT = { 6: [0, 2, 3, 4], 8: [1, 2], 10: [1, 4], 12: [0, 1, 3], 13: [0, 1, 2, 4], 4: [1, 2], 0: [2], 15: [1, 3] };
const CHAIN = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Closed'];
const RESOLUTION = {
  Electrical: 'Faulty component replaced and tested.', 'Internet/Wi-Fi': 'Access point restarted and firmware updated.',
  Cleanliness: 'Area deep-cleaned and bins emptied.', Infrastructure: 'Damaged section repaired and made safe.',
  'Laboratory Equipment': 'Equipment repaired and calibrated.', 'Water/Plumbing': 'Pipe fitting replaced; leak fixed.',
  Furniture: 'Benches repaired.', Security: 'Lighting installed.',
};
const RATINGS = [5, 4, 5, 4, 3, 5, 4, 5];

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', multipleStatements: true,
  });
  console.log('Creating schema...');
  await conn.query(fs.readFileSync(path.join(__dirname, '..', '..', 'database', 'schema.sql'), 'utf8'));
  await conn.query(`USE \`${process.env.DB_NAME || 'smart_campus'}\``);

  const hash = { admin: await bcrypt.hash('Admin@123', 10), staff: await bcrypt.hash('Staff@123', 10), student: await bcrypt.hash('Student@123', 10) };
  const [depts] = await conn.query('SELECT id, name FROM departments');
  const deptId = Object.fromEntries(depts.map((d) => [d.name, d.id]));
  const [cats] = await conn.query('SELECT id, name, department_id FROM categories');
  const catByName = Object.fromEntries(cats.map((c) => [c.name, c]));

  // Users
  const [a] = await conn.query("INSERT INTO users (name,email,password_hash,role,department_id) VALUES ('Dr. Anjali Kapoor','admin@campus.edu',?,'ADMIN',?)", [hash.admin, deptId['General Administration']]);
  const adminId = a.insertId;
  const staffId = {}, staffName = {};
  for (const [key, name, dept] of STAFF) {
    const [r] = await conn.query("INSERT INTO users (name,email,password_hash,role,department_id) VALUES (?,?,?,'STAFF',?)", [name, `${key}@campus.edu`, hash.staff, deptId[dept]]);
    staffId[key] = r.insertId; staffName[key] = name;
  }
  const student = [];
  for (const [email, name, roll, dept, year] of STUDENTS) {
    const [u] = await conn.query("INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,'STUDENT')", [name, email, hash.student]);
    const [s] = await conn.query('INSERT INTO students (user_id,student_id,department,year) VALUES (?,?,?,?)', [u.insertId, roll, dept, year]);
    student.push({ userId: u.insertId, pk: s.insertId });
  }

  // Locations
  const locId = {};
  const addLoc = async (b, f, room, area) => {
    const [r] = await conn.query('INSERT INTO locations (building,floor,room,area) VALUES (?,?,?,?)', [b, f, room, area]);
    locId[`${b}|${f}|${room || area}`] = r.insertId;
  };
  for (const [b, def] of Object.entries(BUILDINGS)) {
    for (const f of FLOORS) {
      for (const room of def.rooms[f]) await addLoc(b, f, room, null);
      for (const area of AREAS) await addLoc(b, f, null, area);
    }
  }
  for (const e of EXTRA) await addLoc(...e);

  // Complaints with a realistic status history
  const year = new Date().getFullYear();
  for (let i = 0; i < COMPLAINTS.length; i++) {
    const [title, desc, category, building, floor, spot, priority, status, ageH, staffKey, stIdx] = COMPLAINTS[i];
    const cat = catByName[category];
    const st = student[stIdx];
    const ageMin = ageH * HOUR;
    const chain = status === 'Reopened' ? [...CHAIN.slice(0, 5), 'Reopened'] : CHAIN.slice(0, CHAIN.indexOf(status) + 1);
    const step = Math.min(6 * HOUR, Math.floor(ageMin / (chain.length + 1)));
    const minsAgo = chain.map((_, k) => ageMin - k * step); // minutes before now for each event
    const ago = (m) => [m];
    const lastMin = minsAgo[minsAgo.length - 1];
    const resolvedIdx = chain.indexOf('Resolved');
    const closedIdx = chain.indexOf('Closed');
    const feedbackLater = status === 'Closed';

    const [ins] = await conn.query(
      `INSERT INTO complaints (student_id,title,description,location_id,category_id,priority,status,assigned_department_id,assigned_staff_id,
                               created_at,updated_at,resolved_at,closed_at,reopened_at)
       VALUES (?,?,?,?,?,?,?,?,?, DATE_SUB(NOW(), INTERVAL ? MINUTE), DATE_SUB(NOW(), INTERVAL ? MINUTE),
               ${status === 'Resolved' || status === 'Closed' ? 'DATE_SUB(NOW(), INTERVAL ? MINUTE)' : 'NULL'},
               ${status === 'Closed' ? 'DATE_SUB(NOW(), INTERVAL ? MINUTE)' : 'NULL'},
               ${status === 'Reopened' ? 'DATE_SUB(NOW(), INTERVAL ? MINUTE)' : 'NULL'})`,
      [st.pk, title, desc, locId[`${building}|${floor}|${spot}`], cat.id, priority, status,
       staffKey ? deptId[STAFF.find((s) => s[0] === staffKey)[2]] : cat.department_id, staffKey ? staffId[staffKey] : null,
       ageMin, lastMin,
       ...(status === 'Resolved' || status === 'Closed' ? ago(minsAgo[resolvedIdx]) : []),
       ...(status === 'Closed' ? ago(minsAgo[closedIdx]) : []),
       ...(status === 'Reopened' ? ago(lastMin) : [])]
    );
    const id = ins.insertId;
    const code = `CMP-${year}-${String(id).padStart(5, '0')}`;
    await conn.query('UPDATE complaints SET complaint_code = ?, updated_at = DATE_SUB(NOW(), INTERVAL ? MINUTE) WHERE id = ?', [code, lastMin, id]);

    for (let k = 0; k < chain.length; k++) {
      const s = chain[k];
      const by = ['Submitted', 'Closed', 'Reopened'].includes(s) ? st.userId : ['In Progress', 'Resolved'].includes(s) ? staffId[staffKey] : adminId;
      const remarks = {
        Submitted: 'Complaint submitted', 'Under Review': 'Reviewed by administration',
        Assigned: `Assigned to ${staffName[staffKey]}`, 'In Progress': 'Work started on site',
        Resolved: RESOLUTION[category], Closed: 'Closed by student: issue confirmed fixed',
        Reopened: 'The problem has come back after the repair.',
      }[s];
      await conn.query('INSERT INTO complaint_status_history (complaint_id,old_status,new_status,changed_by,remarks,created_at) VALUES (?,?,?,?,?, DATE_SUB(NOW(), INTERVAL ? MINUTE))',
        [id, k ? chain[k - 1] : null, s, by, remarks, minsAgo[k]]);
      if (s === 'Assigned') await conn.query('INSERT INTO assignments (complaint_id,assigned_to,assigned_by,assigned_at) VALUES (?,?,?, DATE_SUB(NOW(), INTERVAL ? MINUTE))', [id, staffId[staffKey], adminId, minsAgo[k]]);
      if (s === 'Resolved') await conn.query('INSERT INTO resolutions (complaint_id,description,resolved_by,resolved_at) VALUES (?,?,?, DATE_SUB(NOW(), INTERVAL ? MINUTE))', [id, RESOLUTION[category], staffId[staffKey], minsAgo[k]]);
    }
    if (feedbackLater) {
      await conn.query('INSERT INTO feedback (complaint_id,student_id,rating,comment,created_at) VALUES (?,?,?,?, DATE_SUB(NOW(), INTERVAL ? MINUTE))',
        [id, st.pk, RATINGS[i % RATINGS.length], RATINGS[i % RATINGS.length] >= 4 ? 'Fixed quickly, thank you!' : 'Fixed, but it took a while.', Math.max(1, lastMin - 30)]);
    }
    for (const sIdx of SUPPORT[i] || []) {
      if (sIdx !== stIdx) await conn.query('INSERT INTO complaint_supporters (complaint_id, student_id) VALUES (?,?)', [id, student[sIdx].pk]);
    }
    // notifications
    const closedOut = status === 'Closed';
    await conn.query('INSERT INTO notifications (user_id,complaint_id,message,is_read,created_at) VALUES (?,?,?,?, DATE_SUB(NOW(), INTERVAL ? MINUTE))',
      [st.userId, id, status === 'Resolved' ? `${code} was marked resolved. Please confirm whether it is fixed` : `${code} is now ${status.toLowerCase()}`, closedOut ? 1 : 0, lastMin]);
    if (staffKey && !closedOut && status !== 'Resolved') {
      await conn.query('INSERT INTO notifications (user_id,complaint_id,message,is_read,created_at) VALUES (?,?,?,0, DATE_SUB(NOW(), INTERVAL ? MINUTE))',
        [staffId[staffKey], id, `New complaint assigned to you: ${code} - ${title}`, minsAgo[Math.min(2, chain.length - 1)]]);
    }
    if (status === 'Submitted') {
      await conn.query('INSERT INTO notifications (user_id,complaint_id,message,is_read,created_at) VALUES (?,?,?,0, DATE_SUB(NOW(), INTERVAL ? MINUTE))', [adminId, id, `New complaint ${code}: ${title}`, lastMin]);
    }
  }

  await conn.end();
  console.log(`\nSeeded ${COMPLAINTS.length} complaints. Next new complaint will be CMP-${year}-${String(100 + COMPLAINTS.length).padStart(5, '0')}.\n`);
  console.log('Demo logins');
  console.log('  Admin    admin@campus.edu    / Admin@123');
  console.log('  Staff    rahul@campus.edu    / Staff@123   (Electrical)   + neha, amit, manoj, kavita, suresh, deepak, vikram @campus.edu');
  console.log('  Student  student@campus.edu  / Student@123  (Aarav)       + ishita/rohan/sneha/karan @student.campus.edu');
}

main().catch((e) => { console.error('Seed failed:', e.message); process.exit(1); });
