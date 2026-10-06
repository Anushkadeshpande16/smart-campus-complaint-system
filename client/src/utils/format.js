export const STATUS_STYLE = {
  Submitted: 'bg-slate-100 text-slate-700 ring-slate-300',
  'Under Review': 'bg-sky-50 text-sky-700 ring-sky-200',
  Assigned: 'bg-violet-50 text-violet-700 ring-violet-200',
  'In Progress': 'bg-amber-50 text-amber-800 ring-amber-200',
  Resolved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Closed: 'bg-ink-900 text-white ring-ink-900',
  Reopened: 'bg-rose-50 text-rose-700 ring-rose-200',
};
export const PRIORITY_STYLE = {
  Low: { dot: 'bg-slate-400', text: 'text-slate-600' },
  Medium: { dot: 'bg-amber-500', text: 'text-amber-700' },
  High: { dot: 'bg-signal-500', text: 'text-signal-600' },
};
export const STATUS_COLOR = {
  Submitted: '#94a3b8', 'Under Review': '#38bdf8', Assigned: '#8b5cf6', 'In Progress': '#f59e0b',
  Resolved: '#10b981', Closed: '#0b1b2b', Reopened: '#f43f5e',
};
export const PRIORITY_COLOR = { High: '#f26b1d', Medium: '#f59e0b', Low: '#94a3b8' };
export const LIFECYCLE = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Closed'];

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }) : '-';
export const fmtDay = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');

export function timeAgo(d) {
  const s = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function fmtHours(h) {
  if (h == null) return '-';
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 48) return `${Math.round(h * 10) / 10} h`;
  return `${Math.round((h / 24) * 10) / 10} days`;
}

export const spotOf = (c) => c.room || c.area || '';
export const locationLabel = (c) => [c.building, c.floor, spotOf(c)].filter(Boolean).join(' → ');
export const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v != null && v !== false));
export const homeFor = (role) => ({ STUDENT: '/student', STAFF: '/staff', ADMIN: '/admin' }[role] || '/login');
