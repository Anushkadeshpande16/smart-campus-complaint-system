import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import { BarChart3, Bell, Building2, FilePlus2, LayoutDashboard, ListChecks, LogOut, MapPin, Menu, Tags, User, Users, Wrench, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { cx } from '../components/ui';

const NAV = {
  STUDENT: [
    ['/student', 'Dashboard', LayoutDashboard, true], ['/student/report', 'Report complaint', FilePlus2],
    ['/student/complaints', 'My complaints', ListChecks], ['/notifications', 'Notifications', Bell], ['/profile', 'Profile', User],
  ],
  STAFF: [
    ['/staff', 'Dashboard', LayoutDashboard, true], ['/staff/complaints', 'Assigned complaints', Wrench],
    ['/notifications', 'Notifications', Bell], ['/profile', 'Profile', User],
  ],
  ADMIN: [
    ['/admin', 'Dashboard', LayoutDashboard, true], ['/admin/complaints', 'All complaints', ListChecks],
    ['/admin/analytics', 'Analytics', BarChart3], ['/admin/staff', 'Staff', Users], ['/admin/categories', 'Categories', Tags],
    ['/admin/locations', 'Locations', MapPin], ['/notifications', 'Notifications', Bell], ['/profile', 'Profile', User],
  ],
};
const ROLE_LABEL = { STUDENT: 'Student', STAFF: 'Maintenance staff', ADMIN: 'Administrator' };

export default function AppLayout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const loc = useLocation();

  useEffect(() => setOpen(false), [loc.pathname]);

  // Poll for new in-app notifications
  useEffect(() => {
    let alive = true;
    const load = () => api.get('/notifications').then((r) => alive && setUnread(r.unread)).catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => { alive = false; clearInterval(t); };
  }, [loc.pathname]);

  const items = NAV[user.role];
  const sidebar = (
    <div className="flex h-full flex-col bg-ink-900 text-slate-300">
      <Link to="/" className="flex items-center gap-2.5 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-ink-900"><Building2 className="h-5 w-5" /></span>
        <span className="font-display text-lg font-extrabold leading-tight text-white">Smart Campus<br /><span className="text-sm font-semibold text-brand-300">Complaint System</span></span>
      </Link>
      <nav className="flex-1 space-y-1 px-3 py-2" aria-label="Main">
        {items.map(([to, label, Icon, end]) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => cx('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
              isActive ? 'bg-brand-500/15 text-brand-200' : 'hover:bg-white/5 hover:text-white')}>
            <Icon className="h-[18px] w-[18px]" />
            <span className="flex-1">{label}</span>
            {label === 'Notifications' && unread > 0 && <span className="rounded-full bg-signal-500 px-1.5 text-xs font-bold text-white">{unread}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 p-4">
        <p className="truncate text-sm font-semibold text-white">{user.name}</p>
        <p className="text-xs text-slate-400">{ROLE_LABEL[user.role]}</p>
        <button onClick={logout} className="mt-3 flex items-center gap-2 text-sm text-slate-400 hover:text-white focus:outline-none focus-visible:underline">
          <LogOut className="h-4 w-4" /> Log out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72">{sidebar}</aside>
        </div>
      )}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:px-8">
          <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <p className="hidden text-sm text-slate-500 lg:block">Signed in as <span className="font-semibold text-ink-900">{user.name}</span></p>
          <div className="flex items-center gap-2">
            {user.role === 'STUDENT' && (
              <Link to="/student/report" className="hidden items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 sm:inline-flex">
                <FilePlus2 className="h-4 w-4" /> Report issue
              </Link>
            )}
            <Link to="/notifications" aria-label={`Notifications, ${unread} unread`} className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100">
              <Bell className="h-5 w-5" />
              {unread > 0 && <span className="absolute right-0.5 top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-signal-500 px-1 text-[10px] font-bold text-white">{unread}</span>}
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8"><Outlet /></main>
      </div>
    </div>
  );
}
