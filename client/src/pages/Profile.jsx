import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Alert, Button, Field, PageHeader } from '../components/ui';

export default function Profile() {
  const { user, setUser } = useAuth();
  const isStudent = user.role === 'STUDENT';
  const [f, setF] = useState({ name: user.name, department: user.student_department || '', year: user.year || 1 });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pw, setPw] = useState({ current_password: '', new_password: '' });
  const [pwMsg, setPwMsg] = useState(null);

  const save = async (e) => {
    e.preventDefault(); setMsg(null); setBusy(true);
    try { const r = await api.put('/auth/me', f); setUser(r.user); setMsg({ tone: 'emerald', text: 'Profile updated' }); }
    catch (err) { setMsg({ tone: 'rose', text: err.message }); }
    finally { setBusy(false); }
  };
  const changePw = async (e) => {
    e.preventDefault(); setPwMsg(null);
    try { await api.put('/auth/password', pw); setPw({ current_password: '', new_password: '' }); setPwMsg({ tone: 'emerald', text: 'Password changed' }); }
    catch (err) { setPwMsg({ tone: 'rose', text: err.message }); }
  };

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Profile" subtitle={`${user.email} · ${user.role.charAt(0) + user.role.slice(1).toLowerCase()}`} />
      <form onSubmit={save} className="card space-y-4 p-5">
        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
        <Field label="Full name" htmlFor="pname"><input id="pname" className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        {isStudent && (
          <>
            <Field label="Roll number"><input className="input" value={user.student_id} disabled /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Department" htmlFor="pdept"><input id="pdept" className="input" value={f.department} onChange={(e) => setF({ ...f, department: e.target.value })} /></Field>
              <Field label="Year" htmlFor="pyear"><select id="pyear" className="input" value={f.year} onChange={(e) => setF({ ...f, year: e.target.value })}>{[1, 2, 3, 4, 5, 6].map((y) => <option key={y}>{y}</option>)}</select></Field>
            </div>
          </>
        )}
        {!isStudent && user.department_name && <Field label="Department"><input className="input" value={user.department_name} disabled /></Field>}
        <Button type="submit" loading={busy}>Save changes</Button>
      </form>

      <form onSubmit={changePw} className="card mt-6 space-y-4 p-5">
        <h2 className="text-lg font-bold">Change password</h2>
        {pwMsg && <Alert tone={pwMsg.tone}>{pwMsg.text}</Alert>}
        <Field label="Current password" htmlFor="cpw"><input id="cpw" type="password" autoComplete="current-password" className="input" value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} /></Field>
        <Field label="New password" htmlFor="npw" hint="At least 6 characters"><input id="npw" type="password" autoComplete="new-password" className="input" value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} /></Field>
        <Button type="submit" variant="dark">Update password</Button>
      </form>
    </div>
  );
}
