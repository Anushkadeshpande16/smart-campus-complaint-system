import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Alert, Button, Field } from '../components/ui';
import { homeFor } from '../utils/format';

function Shell({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <div className="hidden flex-col justify-between bg-ink-900 p-10 text-white lg:flex">
        <Link to="/" className="flex items-center gap-2.5 font-display text-lg font-extrabold">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-ink-900"><Building2 className="h-5 w-5" /></span>
          Smart Campus Complaint System
        </Link>
        <div>
          <p className="font-display text-4xl font-extrabold leading-tight">Report. Track.<br />Resolve. Improve.</p>
          <p className="mt-4 max-w-sm text-slate-400">Every complaint gets an ID, an owner and a status you can follow until the problem is actually fixed.</p>
        </div>
        <p className="text-xs text-slate-500">Hackathon build · React, Node, MySQL</p>
      </div>
      <div className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-6 flex items-center gap-2 font-display text-lg font-extrabold lg:hidden"><Building2 className="h-5 w-5 text-brand-600" /> Smart Campus</Link>
          <h1 className="text-3xl font-extrabold">{title}</h1>
          <p className="mb-6 mt-1 text-sm text-slate-500">{subtitle}</p>
          {children}
          <p className="mt-6 text-center text-sm text-slate-500">{footer}</p>
        </div>
      </div>
    </div>
  );
}

const DEMO = [
  ['Student', 'student@campus.edu', 'Student@123'],
  ['Admin', 'admin@campus.edu', 'Admin@123'],
  ['Staff', 'rahul@campus.edu', 'Staff@123'],
];

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) return setError('Enter your email and password');
    setBusy(true);
    try { const u = await login(form.email, form.password); nav(homeFor(u.role), { replace: true }); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <Shell title="Welcome back" subtitle="Log in to track or manage complaints."
      footer={<>New student? <Link to="/register" className="font-semibold text-brand-700 hover:underline">Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <Alert>{error}</Alert>}
        <Field label="Email" htmlFor="email"><input id="email" type="email" autoComplete="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Password" htmlFor="password"><input id="password" type="password" autoComplete="current-password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
        <Button type="submit" loading={busy} className="w-full">Log in</Button>
      </form>
      <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-4">
        <p className="text-sm font-semibold">Demo accounts</p>
        <p className="mb-2 text-xs text-slate-500">Click to fill the form.</p>
        <div className="space-y-1.5">
          {DEMO.map(([role, email, password]) => (
            <button key={role} type="button" onClick={() => setForm({ email, password })}
              className="flex w-full items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-left text-sm hover:bg-brand-50">
              <span className="font-semibold">{role}</span><span className="font-mono text-xs text-slate-500">{email}</span>
            </button>
          ))}
        </div>
      </div>
    </Shell>
  );
}

export function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', password: '', student_id: '', department: '', year: '1' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const er = {};
    if (f.name.trim().length < 2) er.name = 'Enter your full name';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) er.email = 'Enter a valid email address';
    if (f.password.length < 6) er.password = 'Use at least 6 characters';
    if (!f.student_id.trim()) er.student_id = 'Enter your roll number';
    if (!f.department.trim()) er.department = 'Enter your department';
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try { const u = await register(f); nav(homeFor(u.role), { replace: true }); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <Shell title="Create student account" subtitle="Staff and admin accounts are created by the administration."
      footer={<>Already registered? <Link to="/login" className="font-semibold text-brand-700 hover:underline">Log in</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <Alert>{error}</Alert>}
        <Field label="Full name" htmlFor="name" error={errors.name}><input id="name" className={`input ${errors.name ? 'input-error' : ''}`} value={f.name} onChange={set('name')} autoComplete="name" /></Field>
        <Field label="Email" htmlFor="email" error={errors.email}><input id="email" type="email" className={`input ${errors.email ? 'input-error' : ''}`} value={f.email} onChange={set('email')} autoComplete="email" /></Field>
        <Field label="Password" htmlFor="password" error={errors.password}><input id="password" type="password" className={`input ${errors.password ? 'input-error' : ''}`} value={f.password} onChange={set('password')} autoComplete="new-password" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Roll number" htmlFor="sid" error={errors.student_id}><input id="sid" className={`input ${errors.student_id ? 'input-error' : ''}`} value={f.student_id} onChange={set('student_id')} /></Field>
          <Field label="Year" htmlFor="year"><select id="year" className="input" value={f.year} onChange={set('year')}>{[1, 2, 3, 4, 5, 6].map((y) => <option key={y}>{y}</option>)}</select></Field>
        </div>
        <Field label="Department" htmlFor="dept" error={errors.department}><input id="dept" className={`input ${errors.department ? 'input-error' : ''}`} placeholder="e.g. Computer Science" value={f.department} onChange={set('department')} /></Field>
        <Button type="submit" loading={busy} className="w-full">Create account</Button>
      </form>
    </Shell>
  );
}
