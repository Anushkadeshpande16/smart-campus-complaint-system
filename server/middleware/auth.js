const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { HttpError, asyncHandler } = require('../utils/helpers');

/** Verifies the JWT and loads the current user (so deactivated users are locked out immediately). */
const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new HttpError(401, 'Please log in to continue');
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new HttpError(401, 'Your session has expired. Please log in again');
  }
  const [[user]] = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, u.department_id, u.is_active, s.id AS student_pk
       FROM users u LEFT JOIN students s ON s.user_id = u.id WHERE u.id = ?`,
    [payload.id]
  );
  if (!user || !user.is_active) throw new HttpError(401, 'This account is not active');
  req.user = user;
  next();
});

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new HttpError(403, 'You do not have permission to do that'));
  }
  next();
};

module.exports = { authenticate, authorize };
