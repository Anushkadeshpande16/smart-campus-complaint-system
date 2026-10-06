import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, CheckCircle2, Flame, RotateCcw, ThumbsUp, UserCheck, Users, Wrench } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { useMeta } from '../hooks/useMeta';
import { api, fileUrl } from '../services/api';
import { HistoryLog, Stepper } from '../components/Timeline';
import { Alert, Button, CodeTag, ErrorState, EscalatedBadge, Field, Loading, Modal, OverdueBadge, PriorityBadge, Stars, StatusBadge } from '../components/ui';
import { fmtDate, locationLabel } from '../utils/format';

const Row = ({ label, children }) => (
  <div className="flex justify-between gap-4 py-2 text-sm"><dt className="text-slate-500">{label}</dt><dd className="text-right font-medium text-ink-900">{children}</dd></div>
);

/* ---------------- Modals ---------------- */
function StatusModal({ complaint, permissions, role, onClose, onDone }) {
  const [status, setStatus] = useState(permissions.status[0]);
  const [remarks, setRemarks] = useState('');
  const [resolution, setResolution] = useState('');
  const [proof, setProof] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setError('');
    if (status === 'Resolved' && resolution.trim().length < 5) return setError('Describe how the problem was resolved');
    if (status === 'Closed' && !remarks.trim()) return setError('Add a remark explaining why this is being closed');
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('status', status); fd.append('remarks', remarks);
      if (status === 'Resolved') { fd.append('resolution_description', resolution); if (proof) fd.append('proof', proof); }
      await api.post(`/complaints/${complaint.id}/status`, fd);
      onDone();
    } catch (err) { setError(err.message); setBusy(false); }
  };

  return (
    <Modal title="Update status" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        {permissions.status.length > 1 && (
          <Field label="New status" htmlFor="ns"><select id="ns" className="input" value={status} onChange={(e) => setStatus(e.target.value)}>{permissions.status.map((s) => <option key={s}>{s}</option>)}</select></Field>
        )}
        {permissions.status.length === 1 && <p className="text-sm">Move from <StatusBadge status={complaint.status} /> to <StatusBadge status={status} /></p>}
        {status === 'Resolved' && (
          <>
            <Field label="Resolution description" htmlFor="rd" hint="What was done? The student will see this."><textarea id="rd" rows={3} className="input" placeholder="e.g. Fan motor replaced." value={resolution} onChange={(e) => setResolution(e.target.value)} /></Field>
            <Field label="Proof photo (optional)"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setProof(e.target.files[0] || null)} className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-semibold" /></Field>
          </>
        )}
        <Field label={status === 'Closed' ? 'Remarks (required)' : 'Work remarks (optional)'} htmlFor="rm"><textarea id="rm" rows={2} className="input" value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field>
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={busy}>Save {role === 'STAFF' ? 'update' : 'status'}</Button></div>
      </form>
    </Modal>
  );
}

function AssignModal({ complaint, onClose, onDone }) {
  const meta = useMeta();
  const { data: staff } = useAsync(() => api.get('/admin/staff'));
  const [dept, setDept] = useState(complaint.assigned_department_id || '');
  const [staffId, setStaffId] = useState(complaint.assigned_staff_id || '');
  const [all, setAll] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const options = (staff || []).filter((s) => s.is_active && (all || !dept || s.department_id === Number(dept)));

  const submit = async (e) => {
    e.preventDefault(); setError('');
    if (!staffId) return setError('Choose a staff member');
    setBusy(true);
    try { await api.post(`/complaints/${complaint.id}/assign`, { staff_id: staffId, department_id: dept || undefined, remarks }); onDone(); }
    catch (err) { setError(err.message); setBusy(false); }
  };

  return (
    <Modal title={complaint.assigned_staff_id ? 'Reassign complaint' : 'Assign complaint'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <Field label="Department" htmlFor="ad"><select id="ad" className="input" value={dept} onChange={(e) => { setDept(e.target.value); setStaffId(''); }}>
          <option value="">Select department</option>{meta.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
        <Field label="Staff member" htmlFor="as" hint={!options.length ? 'No active staff in this department. Show all staff or add staff first.' : undefined}>
          <select id="as" className="input" value={staffId} onChange={(e) => { setStaffId(e.target.value); const s = staff.find((x) => String(x.id) === e.target.value); if (s && all && s.department_id) setDept(s.department_id); }}>
            <option value="">Select staff</option>{options.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.department_name} ({s.open_count} open)</option>)}</select>
        </Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600" checked={all} onChange={(e) => setAll(e.target.checked)} /> Show staff from all departments</label>
        <Field label="Remarks (optional)" htmlFor="ar"><textarea id="ar" rows={2} className="input" value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field>
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={busy}>Assign</Button></div>
      </form>
    </Modal>
  );
}

function ReasonModal({ title, label, confirmLabel, variant = 'danger', required, onClose, onSubmit }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (required && text.trim().length < 5) return setError('Please write at least a few words');
    setBusy(true);
    try { await onSubmit(text); } catch (err) { setError(err.message); setBusy(false); }
  };
  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <Field label={label} htmlFor="reason"><textarea id="reason" rows={3} className="input" value={text} onChange={(e) => setText(e.target.value)} /></Field>
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" variant={variant} loading={busy}>{confirmLabel}</Button></div>
      </form>
    </Modal>
  );
}

/* ---------------- Page ---------------- */
export default function ComplaintDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => api.get(`/complaints/${id}`), [id]);
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [priority, setPriority] = useState('');

  useEffect(() => { if (data) setPriority(data.complaint.priority); }, [data]);

  if (error) return <div><Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500"><ArrowLeft className="h-4 w-4" /> Back</Link><ErrorState message={error} onRetry={reload} /></div>;
  if (loading && !data) return <Loading />;

  const { complaint: c, history, resolutions, feedback, permissions: p } = data;
  const latestRes = resolutions[0];
  const done = (msg) => { setModal(null); if (msg) setNotice(msg); reload(); };
  const run = async (fn, msg) => { setBusy(true); setNotice(null); try { await fn(); done(msg); } catch (e) { setNotice({ tone: 'rose', text: e.message }); } finally { setBusy(false); } };
  const back = { STUDENT: '/student/complaints', STAFF: '/staff/complaints', ADMIN: '/admin/complaints' }[user.role];

  const savePriority = () => run(() => api.put(`/complaints/${c.id}`, { priority }), { tone: 'emerald', text: 'Priority updated' });

  return (
    <div>
      <Link to={back} className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-ink-900"><ArrowLeft className="h-4 w-4" /> Back to complaints</Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <CodeTag code={c.complaint_code} large />
          <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">{c.title}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><Building2 className="h-4 w-4" />{locationLabel(c)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2"><StatusBadge status={c.status} />{c.is_overdue && <OverdueBadge />}{c.escalated && <EscalatedBadge />}</div>
      </div>

      {notice && <div className="mb-4"><Alert tone={notice.tone || 'emerald'}>{notice.text || notice}</Alert></div>}

      {/* Student: resolution verification */}
      {p.confirm && latestRes && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
            <div className="flex-1">
              <h2 className="text-lg font-bold text-emerald-900">Your complaint has been marked as resolved</h2>
              <p className="mt-2 text-sm text-emerald-900"><b>Resolution:</b> {latestRes.description}</p>
              <p className="mt-3 text-sm font-semibold text-emerald-900">Is the issue actually fixed?</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="success" loading={busy} onClick={() => run(() => api.post(`/complaints/${c.id}/confirm`), { tone: 'emerald', text: 'Complaint closed. Please rate the resolution below.' })}><ThumbsUp className="h-4 w-4" /> Yes, close complaint</Button>
                <Button variant="secondary" onClick={() => setModal('reopen')}><RotateCcw className="h-4 w-4" /> No, reopen complaint</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-4 text-lg font-bold">Progress</h2>
            <Stepper status={c.status} history={history} />
          </section>

          <section className="card p-5">
            <h2 className="mb-2 text-lg font-bold">Details</h2>
            <p className="whitespace-pre-wrap text-sm text-slate-700">{c.description}</p>
            {c.photo_url && (
              <a href={fileUrl(c.photo_url)} target="_blank" rel="noreferrer" className="mt-4 block">
                <img src={fileUrl(c.photo_url)} alt="Evidence uploaded with the complaint" className="max-h-72 rounded-lg border border-slate-200 object-cover" />
              </a>
            )}
            <dl className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
              <Row label="Category">{c.category_name}</Row>
              <Row label="Priority"><PriorityBadge priority={c.priority} /></Row>
              <Row label="Responsible department">{c.department_name || '-'}</Row>
              <Row label="Assigned staff">{c.staff_name || <span className="font-normal text-slate-400">Not assigned yet</span>}</Row>
              <Row label="Reported">{fmtDate(c.created_at)}{user.role !== 'STUDENT' && ` by ${c.student_name}`}</Row>
              {!['Resolved', 'Closed'].includes(c.status) && <Row label="Expected by"><span className={c.is_overdue ? 'text-signal-600' : ''}>{fmtDate(c.due_at)}</span></Row>}
              {c.affected_count > 1 && <Row label="Students affected"><span className="inline-flex items-center gap-1"><Users className="h-4 w-4" />{c.affected_count}</span></Row>}
            </dl>
          </section>

          {resolutions.length > 0 && (
            <section className="card p-5">
              <h2 className="mb-3 text-lg font-bold">Resolution</h2>
              {resolutions.map((r) => (
                <div key={r.id} className="mb-3 rounded-lg bg-slate-50 p-3 last:mb-0">
                  <p className="text-sm text-slate-800">{r.description}</p>
                  <p className="mt-1 text-xs text-slate-500">{r.resolved_by_name} · {fmtDate(r.resolved_at)}</p>
                  {r.proof_photo_url && <a href={fileUrl(r.proof_photo_url)} target="_blank" rel="noreferrer"><img src={fileUrl(r.proof_photo_url)} alt="Proof of repair" className="mt-2 max-h-48 rounded-lg border border-slate-200" /></a>}
                </div>
              ))}
            </section>
          )}

          {(feedback || p.feedback) && (
            <section className="card p-5">
              <h2 className="mb-3 text-lg font-bold">{feedback ? 'Student feedback' : 'Rate the resolution'}</h2>
              {feedback ? (
                <div><Stars value={feedback.rating} />{feedback.comment && <p className="mt-2 text-sm text-slate-600">{feedback.comment}</p>}</div>
              ) : (
                <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (!rating) return setNotice({ tone: 'rose', text: 'Choose a star rating first' }); run(() => api.post(`/complaints/${c.id}/feedback`, { rating, comment }), { tone: 'emerald', text: 'Thanks for your feedback' }); }}>
                  <Stars value={rating} onChange={setRating} size="h-8 w-8" />
                  <textarea aria-label="Feedback comment" rows={2} maxLength={500} className="input" placeholder="Anything to add? (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
                  <Button type="submit" loading={busy}>Submit feedback</Button>
                </form>
              )}
            </section>
          )}
        </div>

        <div className="space-y-6">
          {/* Role actions */}
          {(p.status.length > 0 || p.assign || p.escalate || p.priority || p.support || (p.reopen && !p.confirm)) && (
            <section className="card space-y-4 p-5">
              <h2 className="text-lg font-bold">Actions</h2>
              {p.status.length > 0 && <Button className="w-full" onClick={() => setModal('status')}><Wrench className="h-4 w-4" /> {user.role === 'STAFF' ? (c.status === 'In Progress' ? 'Mark as resolved' : 'Start work') : 'Update status'}</Button>}
              {p.assign && <Button variant="dark" className="w-full" onClick={() => setModal('assign')}><UserCheck className="h-4 w-4" /> {c.assigned_staff_id ? 'Reassign' : 'Assign to staff'}</Button>}
              {p.priority && (
                <div>
                  <label htmlFor="prio" className="label">Verify priority</label>
                  <div className="flex gap-2">
                    <select id="prio" className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>{['Low', 'Medium', 'High'].map((x) => <option key={x}>{x}</option>)}</select>
                    <Button variant="secondary" disabled={priority === c.priority} loading={busy} onClick={savePriority}>Save</Button>
                  </div>
                </div>
              )}
              {p.escalate && <Button variant="danger" className="w-full" onClick={() => setModal('escalate')}><Flame className="h-4 w-4" /> Escalate</Button>}
              {p.support && (
                <div>
                  <Button variant={p.has_supported ? 'secondary' : 'primary'} className="w-full" loading={busy}
                    onClick={() => run(() => api.post(`/complaints/${c.id}/support`), { tone: 'emerald', text: p.has_supported ? 'Support removed' : 'Thanks. The administration can see more students are affected.' })}>
                    <Users className="h-4 w-4" /> {p.has_supported ? 'You are affected too (undo)' : 'I am affected too'}
                  </Button>
                </div>
              )}
              {p.reopen && !p.confirm && <Button variant="secondary" className="w-full" onClick={() => setModal('reopen')}><RotateCcw className="h-4 w-4" /> Problem is back? Reopen</Button>}
            </section>
          )}

          <section className="card p-5">
            <h2 className="mb-4 text-lg font-bold">Status history</h2>
            <HistoryLog history={history} />
          </section>
        </div>
      </div>

      {modal === 'status' && <StatusModal complaint={c} permissions={p} role={user.role} onClose={() => setModal(null)} onDone={() => done({ tone: 'emerald', text: 'Status updated' })} />}
      {modal === 'assign' && <AssignModal complaint={c} onClose={() => setModal(null)} onDone={() => done({ tone: 'emerald', text: 'Complaint assigned' })} />}
      {modal === 'reopen' && <ReasonModal title="Reopen complaint" label="What is still wrong?" confirmLabel="Reopen complaint" required onClose={() => setModal(null)}
        onSubmit={async (reason) => { await api.post(`/complaints/${c.id}/reopen`, { reason }); done({ tone: 'emerald', text: 'Complaint reopened. The administration has been notified.' }); }} />}
      {modal === 'escalate' && <ReasonModal title="Escalate complaint" label="Reason (optional)" confirmLabel="Escalate" onClose={() => setModal(null)}
        onSubmit={async (remarks) => { await api.post(`/complaints/${c.id}/escalate`, { remarks }); done({ tone: 'emerald', text: 'Complaint escalated' }); }} />}
    </div>
  );
}
