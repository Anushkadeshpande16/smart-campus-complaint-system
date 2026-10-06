const pool = require('../config/db');
const { asyncHandler } = require('../utils/helpers');

exports.list = asyncHandler(async (req, res) => {
  const [items] = await pool.query(
    `SELECT n.id, n.complaint_id, n.message, n.is_read, n.created_at
       FROM notifications n WHERE n.user_id = ? ORDER BY n.created_at DESC, n.id DESC LIMIT 60`, [req.user.id]);
  const [[u]] = await pool.query('SELECT COUNT(*) n FROM notifications WHERE user_id = ? AND is_read = 0', [req.user.id]);
  res.json({ items: items.map((i) => ({ ...i, is_read: !!i.is_read })), unread: Number(u.n) });
});

exports.markRead = asyncHandler(async (req, res) => {
  await pool.query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ ok: true });
});

exports.markAllRead = asyncHandler(async (req, res) => {
  await pool.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
  res.json({ ok: true });
});
