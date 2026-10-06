const pool = require('../config/db');
const { HttpError } = require('../utils/helpers');

const OPEN_STATES = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Reopened'];

// A complaint is overdue when it is still open and older than its priority's SLA (clock restarts on reopen).
const CLOCK = 'COALESCE(c.reopened_at, c.created_at)';
const OVERDUE_EXPR = `(c.status NOT IN ('Resolved','Closed') AND TIMESTAMPDIFF(MINUTE, ${CLOCK}, NOW()) > sla.hours * 60)`;

const BASE_SELECT = `
  SELECT c.*, cat.name AS category_name, d.name AS department_name,
         l.campus, l.building, l.floor, l.room, l.area,
         su.name AS student_name, s.student_id AS student_roll, stf.name AS staff_name,
         (SELECT COUNT(*) FROM complaint_supporters cs WHERE cs.complaint_id = c.id) + 1 AS affected_count,
         ${OVERDUE_EXPR} AS is_overdue,
         DATE_ADD(${CLOCK}, INTERVAL sla.hours HOUR) AS due_at
    FROM complaints c
    JOIN categories cat ON cat.id = c.category_id
    JOIN locations l ON l.id = c.location_id
    JOIN students s ON s.id = c.student_id
    JOIN users su ON su.id = s.user_id
    JOIN sla_settings sla ON sla.priority = c.priority
    LEFT JOIN departments d ON d.id = c.assigned_department_id
    LEFT JOIN users stf ON stf.id = c.assigned_staff_id`;

const norm = (r) => ({
  ...r,
  is_overdue: !!Number(r.is_overdue),
  escalated: !!r.escalated,
  affected_count: Number(r.affected_count),
});

/** Fetch one complaint and enforce who may see it. */
async function loadForUser(user, id, conn = pool) {
  const [[row]] = await conn.query(`${BASE_SELECT} WHERE c.id = ?`, [id]);
  if (!row) throw new HttpError(404, 'Complaint not found');
  if (user.role === 'STUDENT' && row.student_id !== user.student_pk) throw new HttpError(403, 'This is not your complaint');
  if (user.role === 'STAFF' && row.assigned_staff_id !== user.id) throw new HttpError(403, 'This complaint is not assigned to you');
  return norm(row);
}

const getById = async (id) => {
  const [[row]] = await pool.query(`${BASE_SELECT} WHERE c.id = ?`, [id]);
  return row ? norm(row) : null;
};

/** Which status moves a given role may make (mirrored in the UI via `permissions`). */
function allowedStatuses(role, status) {
  if (role === 'STAFF') {
    if (['Assigned', 'Reopened'].includes(status)) return ['In Progress'];
    if (status === 'In Progress') return ['Resolved'];
    return [];
  }
  if (role === 'ADMIN') {
    const out = [];
    if (['Submitted', 'Reopened'].includes(status)) out.push('Under Review');
    if (['Assigned', 'Reopened'].includes(status)) out.push('In Progress');
    if (['Assigned', 'In Progress', 'Reopened'].includes(status)) out.push('Resolved');
    if (status !== 'Closed') out.push('Closed');
    return out;
  }
  return [];
}

function permissionsFor(user, c, hasFeedback, hasSupported) {
  const open = OPEN_STATES.includes(c.status);
  const p = { status: allowedStatuses(user.role, c.status), assign: false, escalate: false, priority: false,
              confirm: false, reopen: false, feedback: false, support: false, has_supported: !!hasSupported };
  if (user.role === 'ADMIN') {
    p.assign = open;
    p.escalate = open && !c.escalated;
    p.priority = open;
  }
  if (user.role === 'STUDENT') {
    const own = c.student_id === user.student_pk;
    p.confirm = own && c.status === 'Resolved';
    p.reopen = own && ['Resolved', 'Closed'].includes(c.status);
    p.feedback = own && c.status === 'Closed' && !hasFeedback;
    p.support = !own && open;
  }
  return p;
}

const STATUS_MESSAGES = {
  'Under Review': (code) => `${code} is now under review`,
  Assigned: (code) => `${code} has been assigned to a staff member`,
  'In Progress': (code) => `Work has started on ${code}`,
  Resolved: (code) => `${code} was marked resolved. Please confirm whether it is fixed`,
  Closed: (code) => `${code} is closed`,
  Reopened: (code) => `${code} was reopened`,
};

async function notify(conn, userId, complaintId, message) {
  if (!userId) return;
  await conn.query('INSERT INTO notifications (user_id, complaint_id, message) VALUES (?,?,?)', [userId, complaintId, message]);
}

async function notifyAdmins(conn, complaintId, message) {
  await conn.query(
    `INSERT INTO notifications (user_id, complaint_id, message)
     SELECT id, ?, ? FROM users WHERE role = 'ADMIN' AND is_active = 1`,
    [complaintId, message]
  );
}

async function addHistory(conn, complaintId, oldStatus, newStatus, userId, remarks) {
  await conn.query(
    'INSERT INTO complaint_status_history (complaint_id, old_status, new_status, changed_by, remarks) VALUES (?,?,?,?,?)',
    [complaintId, oldStatus, newStatus, userId, remarks || null]
  );
}

/**
 * The single place where a complaint's status changes: updates the row, writes status history,
 * and notifies the student. Always call inside a transaction.
 */
async function changeStatus(conn, complaintId, newStatus, userId, remarks, { silent = false } = {}) {
  const [[row]] = await conn.query(
    `SELECT c.status, c.complaint_code, s.user_id AS student_user_id
       FROM complaints c JOIN students s ON s.id = c.student_id WHERE c.id = ? FOR UPDATE`,
    [complaintId]
  );
  if (!row) throw new HttpError(404, 'Complaint not found');
  const extra =
    newStatus === 'Resolved' ? ', resolved_at = NOW()' :
    newStatus === 'Closed' ? ', closed_at = NOW()' :
    newStatus === 'Reopened' ? ', resolved_at = NULL, closed_at = NULL, reopened_at = NOW()' : '';
  await conn.query(`UPDATE complaints SET status = ?${extra} WHERE id = ?`, [newStatus, complaintId]);
  await addHistory(conn, complaintId, row.status, newStatus, userId, remarks);
  if (!silent && STATUS_MESSAGES[newStatus]) {
    await notify(conn, row.student_user_id, complaintId, STATUS_MESSAGES[newStatus](row.complaint_code));
  }
  return row;
}

// ---- duplicate detection (no AI needed: category + location + keyword overlap) ----
const STOP = new Set('the a an is are was were not no in on at of to for and or with this that it its there here has have had not working'.split(' '));
const tokens = (text) =>
  new Set(
    String(text || '').toLowerCase().replace(/wi[\s-]?fi/g, 'wifi').replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w))
  );
const jaccard = (a, b) => {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  a.forEach((t) => b.has(t) && inter++);
  return inter / (a.size + b.size - inter);
};

async function findDuplicates({ category_id, location_id, title, description }) {
  const [[loc]] = await pool.query('SELECT building, floor FROM locations WHERE id = ?', [location_id]);
  if (!loc) return [];
  const [rows] = await pool.query(
    `SELECT c.id, c.complaint_code, c.title, c.description, c.status, c.location_id, c.priority,
            cat.name AS category_name, l.building, l.floor, l.room, l.area,
            (SELECT COUNT(*) FROM complaint_supporters cs WHERE cs.complaint_id = c.id) + 1 AS affected_count
       FROM complaints c
       JOIN categories cat ON cat.id = c.category_id
       JOIN locations l ON l.id = c.location_id
      WHERE c.category_id = ? AND l.building = ? AND c.status NOT IN ('Resolved','Closed')`,
    [category_id, loc.building]
  );
  const mine = tokens(`${title} ${description}`);
  return rows
    .map((r) => {
      const sameRoom = r.location_id === Number(location_id);
      const sameFloor = r.floor === loc.floor;
      const sim = jaccard(mine, tokens(`${r.title} ${r.description}`));
      const score = (sameRoom ? 2 : 0) + (sameFloor ? 1 : 0) + sim;
      const match = sameRoom || (sameFloor && sim >= 0.1) || sim >= 0.25;
      return { ...r, affected_count: Number(r.affected_count), score, match };
    })
    .filter((r) => r.match)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

module.exports = {
  OPEN_STATES, OVERDUE_EXPR, BASE_SELECT, norm, loadForUser, getById, permissionsFor, allowedStatuses,
  notify, notifyAdmins, addHistory, changeStatus, findDuplicates,
};
