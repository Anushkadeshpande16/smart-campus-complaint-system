const fs = require('fs');
const pool = require('../config/db');
const { tx } = pool;
const { HttpError, asyncHandler, str, has, bad } = require('../utils/helpers');
const svc = require('../services/complaintService');

const PRIORITIES = ['Low', 'Medium', 'High'];
const photoUrl = (file) => (file ? `/uploads/${file.filename}` : null);
const discard = (file) => file && fs.unlink(file.path, () => {});

exports.list = asyncHandler(async (req, res) => {
  const q = req.query, where = [], params = [];
  if (req.user.role === 'STUDENT') { where.push('c.student_id = ?'); params.push(req.user.student_pk); }
  if (req.user.role === 'STAFF') { where.push('c.assigned_staff_id = ?'); params.push(req.user.id); }
  if (has(q.status)) { where.push('c.status = ?'); params.push(q.status); }
  if (has(q.category_id)) { where.push('c.category_id = ?'); params.push(Number(q.category_id)); }
  if (has(q.priority)) { where.push('c.priority = ?'); params.push(q.priority); }
  if (has(q.building)) { where.push('l.building = ?'); params.push(q.building); }
  if (has(q.department_id)) { where.push('c.assigned_department_id = ?'); params.push(Number(q.department_id)); }
  if (has(q.from)) { where.push('DATE(c.created_at) >= ?'); params.push(q.from); }
  if (has(q.to)) { where.push('DATE(c.created_at) <= ?'); params.push(q.to); }
  if (q.overdue === '1') where.push(svc.OVERDUE_EXPR);
  if (has(q.q)) {
    const like = `%${str(q.q)}%`;
    where.push('(c.complaint_code LIKE ? OR c.title LIKE ? OR c.description LIKE ? OR su.name LIKE ?)');
    params.push(like, like, like, like);
  }
  const [rows] = await pool.query(
    `${svc.BASE_SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY c.created_at DESC LIMIT 500`,
    params
  );
  res.json(rows.map(svc.norm));
});

exports.duplicates = asyncHandler(async (req, res) => {
  const { category_id, location_id } = req.query;
  if (!has(category_id) || !has(location_id)) return res.json([]);
  res.json(await svc.findDuplicates({ category_id, location_id, title: req.query.title, description: req.query.description }));
});

exports.create = asyncHandler(async (req, res) => {
  const b = req.body;
  const fail = (m) => { discard(req.file); bad(m); };
  const title = str(b.title), description = str(b.description);
  if (title.length < 5 || title.length > 150) fail('Title must be between 5 and 150 characters');
  if (description.length < 10) fail('Please describe the problem in at least 10 characters');
  if (!PRIORITIES.includes(b.priority)) fail('Choose a priority: Low, Medium or High');
  const [[cat]] = await pool.query('SELECT id, department_id FROM categories WHERE id = ? AND is_active = 1', [Number(b.category_id)]);
  if (!cat) fail('Please choose a valid category');
  const [[loc]] = await pool.query('SELECT id FROM locations WHERE id = ?', [Number(b.location_id)]);
  if (!loc) fail('Please choose a valid location');
  if (!req.user.student_pk) fail('Only students can report complaints');

  const id = await tx(async (conn) => {
    // Department is auto-routed from the category; admins can change it when assigning.
    const [r] = await conn.query(
      `INSERT INTO complaints (student_id, title, description, photo_url, location_id, category_id, priority, assigned_department_id)
       VALUES (?,?,?,?,?,?,?,?)`,
      [req.user.student_pk, title, description, photoUrl(req.file), loc.id, cat.id, b.priority, cat.department_id]
    );
    const code = `CMP-${new Date().getFullYear()}-${String(r.insertId).padStart(5, '0')}`;
    await conn.query('UPDATE complaints SET complaint_code = ? WHERE id = ?', [code, r.insertId]);
    await svc.addHistory(conn, r.insertId, null, 'Submitted', req.user.id, 'Complaint submitted');
    await svc.notify(conn, req.user.id, r.insertId, `${code} submitted. We will keep you updated`);
    await svc.notifyAdmins(conn, r.insertId, `New complaint ${code}: ${title}`);
    return r.insertId;
  });
  res.status(201).json(await svc.getById(id));
});

exports.getOne = asyncHandler(async (req, res) => {
  const c = await svc.loadForUser(req.user, req.params.id);
  const [history] = await pool.query(
    `SELECT h.*, u.name AS changed_by_name, u.role AS changed_by_role
       FROM complaint_status_history h LEFT JOIN users u ON u.id = h.changed_by
      WHERE h.complaint_id = ? ORDER BY h.created_at, h.id`, [c.id]);
  const [resolutions] = await pool.query(
    `SELECT r.*, u.name AS resolved_by_name FROM resolutions r LEFT JOIN users u ON u.id = r.resolved_by
      WHERE r.complaint_id = ? ORDER BY r.id DESC`, [c.id]);
  const [fb] = await pool.query('SELECT rating, comment, created_at FROM feedback WHERE complaint_id = ?', [c.id]);
  let supported = false;
  if (req.user.student_pk) {
    const [s] = await pool.query('SELECT 1 FROM complaint_supporters WHERE complaint_id = ? AND student_id = ?', [c.id, req.user.student_pk]);
    supported = s.length > 0;
  }
  res.json({
    complaint: c, history, resolutions, feedback: fb[0] || null,
    permissions: svc.permissionsFor(req.user, c, fb.length > 0, supported),
  });
});

// Admin: verify/change priority or category
exports.update = asyncHandler(async (req, res) => {
  const c = await svc.loadForUser(req.user, req.params.id);
  const sets = [], params = [], notes = [];
  if (has(req.body.priority) && req.body.priority !== c.priority) {
    if (!PRIORITIES.includes(req.body.priority)) bad('Invalid priority');
    sets.push('priority = ?'); params.push(req.body.priority);
    notes.push(`Priority changed from ${c.priority} to ${req.body.priority}`);
  }
  if (has(req.body.category_id) && Number(req.body.category_id) !== c.category_id) {
    const [[cat]] = await pool.query('SELECT id, name FROM categories WHERE id = ?', [Number(req.body.category_id)]);
    if (!cat) bad('Invalid category');
    sets.push('category_id = ?'); params.push(cat.id);
    notes.push(`Category changed from ${c.category_name} to ${cat.name}`);
  }
  if (!sets.length) return res.json(c);
  await tx(async (conn) => {
    await conn.query(`UPDATE complaints SET ${sets.join(', ')} WHERE id = ?`, [...params, c.id]);
    const remark = [...notes, str(req.body.remarks)].filter(Boolean).join('. ');
    await svc.addHistory(conn, c.id, c.status, c.status, req.user.id, remark);
  });
  res.json(await svc.getById(c.id));
});

exports.assign = asyncHandler(async (req, res) => {
  const c = await svc.loadForUser(req.user, req.params.id);
  if (!svc.OPEN_STATES.includes(c.status)) throw new HttpError(409, 'Resolved or closed complaints cannot be assigned. Reopen it first');
  const [[staff]] = await pool.query("SELECT id, name, department_id FROM users WHERE id = ? AND role = 'STAFF' AND is_active = 1", [Number(req.body.staff_id)]);
  if (!staff) bad('Please choose an active staff member');
  const deptId = has(req.body.department_id) ? Number(req.body.department_id) : staff.department_id || c.assigned_department_id;
  const [[dept]] = await pool.query('SELECT id, name FROM departments WHERE id = ?', [deptId]);
  if (!dept) bad('Please choose a valid department');
  const reassign = !!c.assigned_staff_id && ['Assigned', 'In Progress'].includes(c.status);
  const remarks = str(req.body.remarks);

  await tx(async (conn) => {
    if (c.status === 'Submitted') await svc.changeStatus(conn, c.id, 'Under Review', req.user.id, 'Reviewed by administration', { silent: true });
    await conn.query('UPDATE complaints SET assigned_staff_id = ?, assigned_department_id = ? WHERE id = ?', [staff.id, dept.id, c.id]);
    await conn.query('INSERT INTO assignments (complaint_id, assigned_to, assigned_by) VALUES (?,?,?)', [c.id, staff.id, req.user.id]);
    const text = `${reassign ? 'Reassigned' : 'Assigned'} to ${staff.name} (${dept.name})${remarks ? ': ' + remarks : ''}`;
    await svc.changeStatus(conn, c.id, 'Assigned', req.user.id, text);
    await svc.notify(conn, staff.id, c.id, `New complaint assigned to you: ${c.complaint_code} - ${c.title}`);
  });
  res.json(await svc.getById(c.id));
});

exports.changeStatus = asyncHandler(async (req, res) => {
  const c = await svc.loadForUser(req.user, req.params.id);
  const next = str(req.body.status), remarks = str(req.body.remarks), resolution = str(req.body.resolution_description);
  const discardAll = (m) => { discard(req.file); throw new HttpError(m.code || 400, m.msg || m); };
  if (!svc.allowedStatuses(req.user.role, c.status).includes(next)) {
    discardAll({ code: 409, msg: `You cannot change a complaint from "${c.status}" to "${next || 'that status'}"` });
  }
  if (next === 'Resolved' && resolution.length < 5) discardAll('Please describe how the problem was resolved');
  if (next === 'Closed' && !remarks) discardAll('Please add a remark explaining why this complaint is being closed');

  await tx(async (conn) => {
    const historyNote = next === 'Resolved' ? [resolution, remarks].filter(Boolean).join(' | ') : remarks;
    await svc.changeStatus(conn, c.id, next, req.user.id, historyNote);
    if (next === 'Resolved') {
      await conn.query('INSERT INTO resolutions (complaint_id, description, proof_photo_url, resolved_by) VALUES (?,?,?,?)',
        [c.id, resolution, photoUrl(req.file), req.user.id]);
      await svc.notifyAdmins(conn, c.id, `${c.complaint_code} was marked resolved by ${req.user.name}`);
    }
  });
  res.json(await svc.getById(c.id));
});

exports.reopen = asyncHandler(async (req, res) => {
  const c = await svc.loadForUser(req.user, req.params.id);
  const reason = str(req.body.reason);
  if (!svc.permissionsFor(req.user, c, false, false).reopen) throw new HttpError(409, 'Only resolved or closed complaints can be reopened');
  if (reason.length < 5) bad('Please explain what is still wrong');
  await tx(async (conn) => {
    await svc.changeStatus(conn, c.id, 'Reopened', req.user.id, reason);
    await svc.notifyAdmins(conn, c.id, `${c.complaint_code} was reopened by the student: ${reason.slice(0, 120)}`);
    await svc.notify(conn, c.assigned_staff_id, c.id, `${c.complaint_code} was reopened. The issue persists`);
  });
  res.json(await svc.getById(c.id));
});

exports.confirm = asyncHandler(async (req, res) => {
  const c = await svc.loadForUser(req.user, req.params.id);
  if (c.status !== 'Resolved') throw new HttpError(409, 'Only resolved complaints can be confirmed');
  await tx((conn) => svc.changeStatus(conn, c.id, 'Closed', req.user.id, 'Closed by student: issue confirmed fixed'));
  res.json(await svc.getById(c.id));
});

exports.feedback = asyncHandler(async (req, res) => {
  const c = await svc.loadForUser(req.user, req.params.id);
  const rating = Number(req.body.rating), comment = str(req.body.comment).slice(0, 500);
  if (c.status !== 'Closed') throw new HttpError(409, 'Feedback can be given once the complaint is closed');
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) bad('Rating must be between 1 and 5');
  const [[exists]] = await pool.query('SELECT COUNT(*) n FROM feedback WHERE complaint_id = ?', [c.id]);
  if (exists.n) throw new HttpError(409, 'You have already given feedback for this complaint');
  await pool.query('INSERT INTO feedback (complaint_id, student_id, rating, comment) VALUES (?,?,?,?)', [c.id, req.user.student_pk, rating, comment || null]);
  res.status(201).json({ rating, comment });
});

// Student: "I'm affected too" - toggles support on someone else's complaint
exports.support = asyncHandler(async (req, res) => {
  const c = await svc.loadForUser(req.user, req.params.id).catch((e) => {
    if (e.status === 403) throw e;
    throw e;
  });
  const p = svc.permissionsFor(req.user, c, false, false);
  if (!p.support) throw new HttpError(409, 'You cannot support this complaint');
  const [[ex]] = await pool.query('SELECT COUNT(*) n FROM complaint_supporters WHERE complaint_id = ? AND student_id = ?', [c.id, req.user.student_pk]);
  if (ex.n) await pool.query('DELETE FROM complaint_supporters WHERE complaint_id = ? AND student_id = ?', [c.id, req.user.student_pk]);
  else await pool.query('INSERT INTO complaint_supporters (complaint_id, student_id) VALUES (?,?)', [c.id, req.user.student_pk]);
  const [[n]] = await pool.query('SELECT COUNT(*) + 1 AS affected FROM complaint_supporters WHERE complaint_id = ?', [c.id]);
  res.json({ supported: !ex.n, affected_count: Number(n.affected) });
});

exports.escalate = asyncHandler(async (req, res) => {
  const c = await svc.loadForUser(req.user, req.params.id);
  if (!svc.OPEN_STATES.includes(c.status)) throw new HttpError(409, 'Only open complaints can be escalated');
  if (c.escalated) throw new HttpError(409, 'This complaint is already escalated');
  const note = str(req.body.remarks);
  await tx(async (conn) => {
    await conn.query('UPDATE complaints SET escalated = 1, escalated_at = NOW() WHERE id = ?', [c.id]);
    await svc.addHistory(conn, c.id, c.status, c.status, req.user.id, `Escalated${note ? ': ' + note : ''}`);
    await svc.notify(conn, c.assigned_staff_id, c.id, `${c.complaint_code} has been escalated. Please prioritise it`);
    await svc.notifyAdmins(conn, c.id, `${c.complaint_code} was escalated`);
  });
  res.json(await svc.getById(c.id));
});
