const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { HttpError, asyncHandler, str, has, bad, isEmail } = require('../utils/helpers');

// ---------- Staff ----------
exports.listStaff = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email, u.department_id, d.name AS department_name, u.is_active, u.created_at,
            (SELECT COUNT(*) FROM complaints c WHERE c.assigned_staff_id = u.id AND c.status NOT IN ('Resolved','Closed')) AS open_count,
            (SELECT COUNT(*) FROM complaints c WHERE c.assigned_staff_id = u.id AND c.status IN ('Resolved','Closed')) AS done_count
       FROM users u LEFT JOIN departments d ON d.id = u.department_id
      WHERE u.role = 'STAFF' ORDER BY u.is_active DESC, u.name`);
  res.json(rows.map((r) => ({ ...r, is_active: !!r.is_active, open_count: Number(r.open_count), done_count: Number(r.done_count) })));
});

async function checkDept(id) {
  const [[d]] = await pool.query('SELECT id FROM departments WHERE id = ?', [Number(id)]);
  if (!d) bad('Please choose a department');
}

exports.createStaff = asyncHandler(async (req, res) => {
  const name = str(req.body.name), email = str(req.body.email).toLowerCase(), password = String(req.body.password || '');
  if (name.length < 2) bad('Please enter the staff member\'s name');
  if (!isEmail(email)) bad('Please enter a valid email address');
  if (password.length < 6) bad('Password must be at least 6 characters');
  await checkDept(req.body.department_id);
  const [[ex]] = await pool.query('SELECT COUNT(*) n FROM users WHERE email = ?', [email]);
  if (ex.n) throw new HttpError(409, 'A user with this email already exists');
  const [r] = await pool.query("INSERT INTO users (name, email, password_hash, role, department_id) VALUES (?,?,?, 'STAFF', ?)",
    [name, email, await bcrypt.hash(password, 10), Number(req.body.department_id)]);
  res.status(201).json({ id: r.insertId });
});

exports.updateStaff = asyncHandler(async (req, res) => {
  const [[u]] = await pool.query("SELECT id FROM users WHERE id = ? AND role = 'STAFF'", [req.params.id]);
  if (!u) throw new HttpError(404, 'Staff member not found');
  const sets = [], params = [];
  if (has(req.body.name)) { if (str(req.body.name).length < 2) bad('Name is too short'); sets.push('name = ?'); params.push(str(req.body.name)); }
  if (has(req.body.department_id)) { await checkDept(req.body.department_id); sets.push('department_id = ?'); params.push(Number(req.body.department_id)); }
  if (req.body.is_active !== undefined) { sets.push('is_active = ?'); params.push(req.body.is_active ? 1 : 0); }
  if (has(req.body.password)) {
    if (String(req.body.password).length < 6) bad('Password must be at least 6 characters');
    sets.push('password_hash = ?'); params.push(await bcrypt.hash(String(req.body.password), 10));
  }
  if (!sets.length) bad('Nothing to update');
  await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, [...params, u.id]);
  res.json({ ok: true });
});

// ---------- Categories ----------
exports.createCategory = asyncHandler(async (req, res) => {
  const name = str(req.body.name);
  if (name.length < 2) bad('Category name is required');
  await checkDept(req.body.department_id);
  const [[ex]] = await pool.query('SELECT COUNT(*) n FROM categories WHERE name = ?', [name]);
  if (ex.n) throw new HttpError(409, 'A category with this name already exists');
  const [r] = await pool.query('INSERT INTO categories (name, department_id) VALUES (?,?)', [name, Number(req.body.department_id)]);
  res.status(201).json({ id: r.insertId });
});

exports.updateCategory = asyncHandler(async (req, res) => {
  const sets = [], params = [];
  if (has(req.body.name)) { sets.push('name = ?'); params.push(str(req.body.name)); }
  if (has(req.body.department_id)) { await checkDept(req.body.department_id); sets.push('department_id = ?'); params.push(Number(req.body.department_id)); }
  if (req.body.is_active !== undefined) { sets.push('is_active = ?'); params.push(req.body.is_active ? 1 : 0); }
  if (!sets.length) bad('Nothing to update');
  try {
    const [r] = await pool.query(`UPDATE categories SET ${sets.join(', ')} WHERE id = ?`, [...params, req.params.id]);
    if (!r.affectedRows) throw new HttpError(404, 'Category not found');
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'A category with this name already exists');
    throw e;
  }
  res.json({ ok: true });
});

exports.deleteCategory = asyncHandler(async (req, res) => {
  const [[n]] = await pool.query('SELECT COUNT(*) n FROM complaints WHERE category_id = ?', [req.params.id]);
  if (n.n) throw new HttpError(409, 'This category has complaints, so it cannot be deleted. Deactivate it instead');
  await pool.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// ---------- Locations ----------
const locFields = (b) => {
  const building = str(b.building), floor = str(b.floor), room = str(b.room), area = str(b.area);
  if (!building || !floor) bad('Building and floor are required');
  if (!room && !area) bad('Enter a room or an area (for example "Corridor")');
  return [building, floor, room || null, area || null];
};

exports.createLocation = asyncHandler(async (req, res) => {
  const [r] = await pool.query('INSERT INTO locations (building, floor, room, area) VALUES (?,?,?,?)', locFields(req.body));
  res.status(201).json({ id: r.insertId });
});

exports.updateLocation = asyncHandler(async (req, res) => {
  const [r] = await pool.query('UPDATE locations SET building = ?, floor = ?, room = ?, area = ? WHERE id = ?', [...locFields(req.body), req.params.id]);
  if (!r.affectedRows) throw new HttpError(404, 'Location not found');
  res.json({ ok: true });
});

exports.deleteLocation = asyncHandler(async (req, res) => {
  const [[n]] = await pool.query('SELECT COUNT(*) n FROM complaints WHERE location_id = ?', [req.params.id]);
  if (n.n) throw new HttpError(409, 'Complaints are linked to this location, so it cannot be deleted');
  await pool.query('DELETE FROM locations WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// ---------- SLA (escalation hours) ----------
exports.updateSla = asyncHandler(async (req, res) => {
  for (const p of ['High', 'Medium', 'Low']) {
    const h = Number(req.body[p]);
    if (!Number.isInteger(h) || h < 1 || h > 2160) bad(`${p} priority hours must be a whole number between 1 and 2160`);
    await pool.query('UPDATE sla_settings SET hours = ? WHERE priority = ?', [h, p]);
  }
  res.json({ ok: true });
});
