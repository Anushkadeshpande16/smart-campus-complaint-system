const pool = require('../config/db');
const { asyncHandler } = require('../utils/helpers');
const { OVERDUE_EXPR, BASE_SELECT, norm } = require('../services/complaintService');

const pad = (n) => String(n).padStart(2, '0');
const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

/** Turns ?range=7d|30d|6m|year|custom&from&to into a SQL date window. */
function window(q) {
  const now = new Date();
  let from = new Date(now), to = new Date(now);
  switch (q.range) {
    case '7d': from.setDate(from.getDate() - 7); break;
    case '30d': from.setDate(from.getDate() - 30); break;
    case 'year': from = new Date(now.getFullYear(), 0, 1); break;
    case 'custom':
      if (q.from) from = new Date(`${q.from}T00:00:00`);
      else from = new Date(now.getFullYear(), 0, 1);
      if (q.to) to = new Date(`${q.to}T23:59:59`);
      break;
    case '6m':
    default: from.setMonth(from.getMonth() - 6);
  }
  return { from: fmt(from), to: fmt(to), days: Math.max(1, Math.round((to - from) / 86400000)) };
}

const n = (v) => Number(v) || 0;
const WHERE = 'c.created_at BETWEEN ? AND ?';

exports.overview = asyncHandler(async (req, res) => {
  const w = window(req.query);
  const [[r]] = await pool.query(
    `SELECT COUNT(*) total,
            SUM(c.status='Submitted') submitted, SUM(c.status='Under Review') under_review,
            SUM(c.status='Assigned') assigned, SUM(c.status='In Progress') in_progress,
            SUM(c.status='Resolved') resolved, SUM(c.status='Closed') closed, SUM(c.status='Reopened') reopened,
            SUM(${OVERDUE_EXPR}) overdue,
            SUM(c.escalated = 1 AND c.status NOT IN ('Resolved','Closed')) escalated,
            AVG(CASE WHEN c.resolved_at IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, c.created_at, c.resolved_at) END) / 60 avg_hours
       FROM complaints c JOIN sla_settings sla ON sla.priority = c.priority WHERE ${WHERE}`, [w.from, w.to]);
  const [[fb]] = await pool.query(
    `SELECT AVG(f.rating) avg_rating, COUNT(*) ratings FROM feedback f JOIN complaints c ON c.id = f.complaint_id WHERE ${WHERE}`, [w.from, w.to]);
  const [[aff]] = await pool.query(
    `SELECT COUNT(*) n FROM complaint_supporters cs JOIN complaints c ON c.id = cs.complaint_id WHERE ${WHERE}`, [w.from, w.to]);
  const total = n(r.total), done = n(r.resolved) + n(r.closed);
  res.json({
    total, submitted: n(r.submitted), under_review: n(r.under_review), assigned: n(r.assigned), in_progress: n(r.in_progress),
    resolved: n(r.resolved), closed: n(r.closed), reopened: n(r.reopened), overdue: n(r.overdue), escalated: n(r.escalated),
    resolution_rate: total ? Math.round((done / total) * 1000) / 10 : 0,
    avg_resolution_hours: r.avg_hours == null ? null : Math.round(Number(r.avg_hours) * 10) / 10,
    avg_rating: fb.avg_rating == null ? null : Math.round(Number(fb.avg_rating) * 10) / 10,
    ratings: n(fb.ratings), extra_affected: n(aff.n),
  });
});

const grouped = (sqlGroup, joinSql = '') => asyncHandler(async (req, res) => {
  const w = window(req.query);
  const [rows] = await pool.query(
    `SELECT ${sqlGroup} AS name, COUNT(*) AS count, SUM(c.status NOT IN ('Resolved','Closed')) AS unresolved
       FROM complaints c ${joinSql} WHERE ${WHERE} GROUP BY name ORDER BY count DESC`, [w.from, w.to]);
  res.json(rows.map((r) => ({ name: r.name, count: n(r.count), unresolved: n(r.unresolved) })));
});

exports.categories = grouped('cat.name', 'JOIN categories cat ON cat.id = c.category_id');
exports.priorities = grouped('c.priority');
exports.statuses = grouped('c.status');

// Buildings (hotspots) + the most complained-about rooms/areas
exports.locations = asyncHandler(async (req, res) => {
  const w = window(req.query);
  const [rows] = await pool.query(
    `SELECT l.building, cat.name AS category, COUNT(*) AS count,
            SUM(c.status NOT IN ('Resolved','Closed')) AS unresolved,
            SUM(CASE WHEN c.resolved_at IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, c.created_at, c.resolved_at) ELSE 0 END) AS res_minutes,
            SUM(c.resolved_at IS NOT NULL) AS res_count
       FROM complaints c JOIN locations l ON l.id = c.location_id JOIN categories cat ON cat.id = c.category_id
      WHERE ${WHERE} GROUP BY l.building, cat.id`, [w.from, w.to]);
  const map = {};
  rows.forEach((r) => {
    const b = (map[r.building] ||= { name: r.building, count: 0, unresolved: 0, minutes: 0, resolved: 0, categories: {} });
    b.count += n(r.count); b.unresolved += n(r.unresolved); b.minutes += n(r.res_minutes); b.resolved += n(r.res_count);
    b.categories[r.category] = (b.categories[r.category] || 0) + n(r.count);
  });
  const buildings = Object.values(map).map((b) => {
    const top = Object.entries(b.categories).sort((a, c) => c[1] - a[1])[0];
    return { name: b.name, count: b.count, unresolved: b.unresolved, top_category: top ? top[0] : null,
             avg_resolution_hours: b.resolved ? Math.round((b.minutes / b.resolved / 60) * 10) / 10 : null };
  }).sort((a, b) => b.count - a.count);

  const [spots] = await pool.query(
    `SELECT l.building, l.floor, COALESCE(l.room, l.area) AS spot, COUNT(*) AS count
       FROM complaints c JOIN locations l ON l.id = c.location_id WHERE ${WHERE}
      GROUP BY l.id ORDER BY count DESC LIMIT 8`, [w.from, w.to]);
  res.json({ buildings, spots: spots.map((s) => ({ ...s, count: n(s.count) })) });
});

exports.timeline = asyncHandler(async (req, res) => {
  const w = window(req.query);
  const monthly = w.days > 92;
  const f = monthly ? '%Y-%m' : '%Y-%m-%d';
  const [created] = await pool.query(`SELECT DATE_FORMAT(c.created_at, '${f}') d, COUNT(*) n FROM complaints c WHERE ${WHERE} GROUP BY d`, [w.from, w.to]);
  const [resolved] = await pool.query(
    `SELECT DATE_FORMAT(c.resolved_at, '${f}') d, COUNT(*) n FROM complaints c WHERE c.resolved_at BETWEEN ? AND ? GROUP BY d`, [w.from, w.to]);
  const map = {};
  created.forEach((r) => ((map[r.d] ||= { date: r.d, created: 0, resolved: 0 }).created = n(r.n)));
  resolved.forEach((r) => ((map[r.d] ||= { date: r.d, created: 0, resolved: 0 }).resolved = n(r.n)));
  res.json({ unit: monthly ? 'month' : 'day', points: Object.values(map).sort((a, b) => a.date.localeCompare(b.date)) });
});

// Current overdue complaints (not limited to the date window; this is a live work list)
exports.overdue = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `${BASE_SELECT} WHERE ${OVERDUE_EXPR} ORDER BY due_at ASC LIMIT 25`);
  res.json(rows.map(norm));
});
