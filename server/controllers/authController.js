const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { tx } = pool;
const { HttpError, asyncHandler, str, has, bad, isEmail } = require('../utils/helpers');

const sign = (u) => jwt.sign({ id: u.id, role: u.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

async function publicUser(id) {
  const [[u]] = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, u.department_id, d.name AS department_name,
            s.id AS student_pk, s.student_id, s.department AS student_department, s.year
       FROM users u
       LEFT JOIN departments d ON d.id = u.department_id
       LEFT JOIN students s ON s.user_id = u.id
      WHERE u.id = ?`,
    [id]
  );
  return u;
}

exports.register = asyncHandler(async (req, res) => {
  const name = str(req.body.name), email = str(req.body.email).toLowerCase(), password = String(req.body.password || '');
  const studentId = str(req.body.student_id), department = str(req.body.department), year = Number(req.body.year);
  if (name.length < 2) bad('Please enter your full name');
  if (!isEmail(email)) bad('Please enter a valid email address');
  if (password.length < 6) bad('Password must be at least 6 characters');
  if (!studentId) bad('Student ID / roll number is required');
  if (!department) bad('Department is required');
  if (!Number.isInteger(year) || year < 1 || year > 6) bad('Year must be between 1 and 6');

  const [[dupe]] = await pool.query('SELECT (SELECT COUNT(*) FROM users WHERE email = ?) e, (SELECT COUNT(*) FROM students WHERE student_id = ?) s', [email, studentId]);
  if (dupe.e) throw new HttpError(409, 'An account with this email already exists');
  if (dupe.s) throw new HttpError(409, 'This student ID is already registered');

  const hash = await bcrypt.hash(password, 10);
  const userId = await tx(async (conn) => {
    const [u] = await conn.query("INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?, 'STUDENT')", [name, email, hash]);
    await conn.query('INSERT INTO students (user_id, student_id, department, year) VALUES (?,?,?,?)', [u.insertId, studentId, department, year]);
    return u.insertId;
  });
  const user = await publicUser(userId);
  res.status(201).json({ token: sign(user), user });
});

exports.login = asyncHandler(async (req, res) => {
  const email = str(req.body.email).toLowerCase(), password = String(req.body.password || '');
  if (!email || !password) bad('Email and password are required');
  const [[row]] = await pool.query('SELECT id, role, password_hash, is_active FROM users WHERE email = ?', [email]);
  if (!row || !(await bcrypt.compare(password, row.password_hash))) throw new HttpError(401, 'Incorrect email or password');
  if (!row.is_active) throw new HttpError(403, 'This account has been deactivated. Contact the administrator');
  res.json({ token: sign(row), user: await publicUser(row.id) });
});

exports.me = asyncHandler(async (req, res) => res.json({ user: await publicUser(req.user.id) }));

exports.updateMe = asyncHandler(async (req, res) => {
  const name = str(req.body.name);
  if (name.length < 2) bad('Please enter your full name');
  await pool.query('UPDATE users SET name = ? WHERE id = ?', [name, req.user.id]);
  if (req.user.role === 'STUDENT') {
    const department = str(req.body.department), year = Number(req.body.year);
    if (!department) bad('Department is required');
    if (!Number.isInteger(year) || year < 1 || year > 6) bad('Year must be between 1 and 6');
    await pool.query('UPDATE students SET department = ?, year = ? WHERE user_id = ?', [department, year, req.user.id]);
  }
  res.json({ user: await publicUser(req.user.id) });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!has(current_password) || !has(new_password)) bad('Current and new password are required');
  if (String(new_password).length < 6) bad('New password must be at least 6 characters');
  const [[row]] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
  if (!(await bcrypt.compare(String(current_password), row.password_hash))) throw new HttpError(400, 'Current password is incorrect');
  await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [await bcrypt.hash(String(new_password), 10), req.user.id]);
  res.json({ message: 'Password updated' });
});
