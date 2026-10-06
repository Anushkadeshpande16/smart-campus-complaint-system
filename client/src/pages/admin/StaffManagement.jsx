import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { useMeta } from '../../hooks/useMeta';
import { api } from '../../services/api';
import { Alert, Button, EmptyState, ErrorState, Field, Loading, Modal, PageHeader } from '../../components/ui';

function StaffModal({ staff, onClose, onDone }) {
  const meta = useMeta();
  const [f, setF] = useState({ name: staff?.name || '', email: staff?.email || '', password: '', department_id: staff?.department_id || '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault(); setError('');
    if (f.name.trim().length < 2) return setError('Enter a name');
    if (!f.department_id) return setError('Choose a department');
    if (!staff && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email) || f.password.length < 6)) return setError('Enter a valid email and a password of at least 6 characters');
    setBusy(true);
    try {
      if (staff) await api.put(`/admin/staff/${staff.id}`, { name: f.name, department_id: f.department_id, ...(f.password ? { password: f.password } : {}) });
      else await api.post('/admin/staff', f);
      onDone();
    } catch (err) { setError(err.message); setBusy(false); }
  };

  return (
    <Modal title={staff ? 'Edit staff member' : 'Add staff member'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <Field label="Name" htmlFor="sn"><input id="sn" className="input" value={f.name} onChange={set('name')} /></Field>
        <Field label="Email" htmlFor="se"><input id="se" type="email" className="input" disabled={!!staff} value={f.email} onChange={set('email')} /></Field>
        <Field label="Department" htmlFor="sd"><select id="sd" className="input" value={f.department_id} onChange={set('department_id')}><option value="">Select department</option>{meta.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
        <Field label={staff ? 'Reset password (optional)' : 'Password'} htmlFor="sp"><input id="sp" type="password" autoComplete="new-password" className="input" value={f.password} onChange={set('password')} /></Field>
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={busy}>{staff ? 'Save changes' : 'Add staff'}</Button></div>
      </form>
    </Modal>
  );
}

export default function StaffManagement() {
  const { data, loading, error, reload } = useAsync(() => api.get('/admin/staff'));
  const [modal, setModal] = useState(null);
  const [err, setErr] = useState('');
  const toggle = async (s) => {
    setErr('');
    try { await api.put(`/admin/staff/${s.id}`, { is_active: !s.is_active }); reload(); } catch (e) { setErr(e.message); }
  };
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading && !data) return <Loading />;

  return (
    <div>
      <PageHeader title="Staff management" subtitle="Maintenance staff who can be assigned complaints."
        action={<Button onClick={() => setModal({})}><Plus className="h-4 w-4" /> Add staff</Button>} />
      {err && <div className="mb-4"><Alert>{err}</Alert></div>}
      <div className="card overflow-x-auto">
        {data.length === 0 ? <EmptyState title="No staff yet" text="Add a staff member so complaints can be assigned." /> : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Open</th><th className="px-4 py-3">Completed</th><th className="px-4 py-3">Status</th><th className="px-4 py-3" /></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3"><p className="font-semibold">{s.name}</p><p className="text-xs text-slate-500">{s.email}</p></td>
                  <td className="px-4 py-3 text-slate-600">{s.department_name}</td>
                  <td className="px-4 py-3 tabular-nums">{s.open_count}</td><td className="px-4 py-3 tabular-nums">{s.done_count}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${s.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{s.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <Button variant="ghost" onClick={() => setModal(s)} aria-label={`Edit ${s.name}`}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" onClick={() => toggle(s)}>{s.is_active ? 'Deactivate' : 'Activate'}</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {modal && <StaffModal staff={modal.id ? modal : null} onClose={() => setModal(null)} onDone={() => { setModal(null); reload(); }} />}
    </div>
  );
}
