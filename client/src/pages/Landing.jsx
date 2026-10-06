import { Link } from 'react-router-dom';
import { BarChart3, Building2, CheckCircle2, Route, Search, ShieldCheck, Wrench, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { homeFor } from '../utils/format';

const FEATURES = [
  [Search, 'Report in under a minute', 'Pick the exact block, floor and room, attach a photo, and get a complaint ID straight away.'],
  [Route, 'Tracked, not lost', 'Every status change is logged with a time, so nobody has to ask "did anyone see my complaint?"'],
  [Wrench, 'Routed to the right team', 'Categories map to departments automatically. Admins assign a named staff member.'],
  [ShieldCheck, 'You confirm the fix', 'A complaint only closes when the student says the problem is actually solved.'],
  [Zap, 'Overdue ones stand out', 'Each priority has a response window. Late complaints are flagged and can be escalated.'],
  [BarChart3, 'Patterns become visible', 'See which categories and buildings keep generating complaints, with real numbers.'],
];

const TRACK = [
  ['Submitted', '10:30 AM', true], ['Under Review', '11:15 AM', true], ['Assigned to Rahul (Electrical)', '12:00 PM', true],
  ['In Progress', '03:20 PM', 'current'], ['Resolved', '', false], ['Closed', '', false],
];

export default function Landing() {
  const { user } = useAuth();
  const cta = user ? { to: homeFor(user.role), label: 'Open dashboard' } : { to: '/login', label: 'Log in' };
  return (
    <div className="bg-[#f4f6f7]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <span className="flex items-center gap-2 font-display text-lg font-extrabold"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-900 text-brand-300"><Building2 className="h-5 w-5" /></span>Smart Campus</span>
        <nav className="flex items-center gap-2">
          <Link to={cta.to} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white">{cta.label}</Link>
          {!user && <Link to="/register" className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white hover:bg-ink-800">Register</Link>}
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-8 lg:grid-cols-[1.15fr_1fr] lg:pt-16">
        <div className="hero-rise">
          <p className="font-display text-5xl font-extrabold leading-[1.02] text-ink-900 sm:text-6xl">Report. Track.<br />Resolve. Improve.</p>
          <p className="mt-5 max-w-xl text-lg text-slate-600">
            A broken fan, a dead Wi-Fi router, a leaking tap: report it once and watch it move from your phone to the person who fixes it. The Smart Campus Complaint System replaces WhatsApp threads and corridor conversations with one tracked record.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={user ? homeFor(user.role) : '/register'} className="rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white shadow-sm hover:bg-brand-700">{user ? 'Open dashboard' : 'Register as a student'}</Link>
            {!user && <Link to="/login" className="rounded-lg bg-white px-6 py-3 font-semibold text-ink-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50">Log in</Link>}
          </div>
        </div>

        <div className="hero-rise rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5" style={{ animationDelay: '0.15s' }} aria-label="Example of a tracked complaint">
          <span className="inline-block rounded-md border border-dashed border-slate-400 bg-amber-50 px-2 py-1 font-mono text-sm font-semibold">CMP-2026-00124</span>
          <h2 className="mt-3 text-xl font-bold">Fan not working</h2>
          <p className="text-sm text-slate-500">Block A → 2nd Floor → Room 204 · Electrical · Medium</p>
          <ol className="mt-5 space-y-3">
            {TRACK.map(([label, time, state]) => (
              <li key={label} className="flex items-center gap-3">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-white ${state === true ? 'border-brand-600 bg-brand-600' : state === 'current' ? 'border-brand-600 bg-white ring-4 ring-brand-100' : 'border-slate-300 bg-white'}`}>
                  {state === true ? <CheckCircle2 className="h-4 w-4" /> : state === 'current' ? <span className="h-2 w-2 rounded-full bg-brand-600" /> : null}
                </span>
                <span className={`flex-1 text-sm font-semibold ${state ? 'text-ink-900' : 'text-slate-400'}`}>{label}</span>
                <span className="text-xs text-slate-500">{time}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="max-w-xl text-3xl font-extrabold">Everyone sees the same complaint</h2>
          <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(([Icon, title, text]) => (
              <div key={title} className="flex gap-4">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Icon className="h-5 w-5" /></span>
                <div><h3 className="font-bold">{title}</h3><p className="mt-1 text-sm text-slate-600">{text}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {[['Students', 'Report issues, follow progress, confirm the fix, rate the result.'],
            ['Maintenance staff', 'See exactly what is assigned, where it is, and update the work.'],
            ['Administration', 'Assign, escalate and analyse. Spot the buildings and problems that keep coming back.']].map(([t, d]) => (
            <div key={t} className="card p-6"><h3 className="text-lg font-bold">{t}</h3><p className="mt-2 text-sm text-slate-600">{d}</p></div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-4 rounded-2xl bg-ink-900 p-8 text-white sm:flex-row sm:items-center">
          <p className="font-display text-2xl font-extrabold">Students should never have to wonder if their complaint was received.</p>
          <Link to={user ? homeFor(user.role) : '/register'} className="shrink-0 rounded-lg bg-brand-500 px-6 py-3 font-semibold text-ink-900 hover:bg-brand-400">{user ? 'Open dashboard' : 'Get started'}</Link>
        </div>
      </section>
      <footer className="pb-8 text-center text-xs text-slate-500">Smart Campus Complaint System · College hackathon project</footer>
    </div>
  );
}
