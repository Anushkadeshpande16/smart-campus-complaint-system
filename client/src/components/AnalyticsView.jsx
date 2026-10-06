import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, CheckCircle2, ClipboardList, Hammer, Inbox, Lock, Search, Star, Timer } from 'lucide-react';
import { useAsync } from '../hooks/useAsync';
import { api } from '../services/api';
import { Alert, ErrorState, Loading, StatCard, cx } from './ui';
import { PRIORITY_COLOR, STATUS_COLOR, clean, fmtHours } from '../utils/format';

const RANGES = [['7d', 'Last 7 days'], ['30d', 'Last 30 days'], ['6m', 'Last 6 months'], ['year', 'This year'], ['custom', 'Custom range']];
const BRAND = '#148c82';

const Panel = ({ title, subtitle, children, className }) => (
  <section className={cx('card p-5', className)}>
    <h2 className="text-base font-bold">{title}</h2>
    {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
    <div className="mt-4">{children}</div>
  </section>
);
const NoData = () => <p className="py-10 text-center text-sm text-slate-400">No complaints in this period</p>;

function Ranked({ rows, unit = 'complaints' }) {
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <ol className="space-y-3">
      {rows.map((r, i) => (
        <li key={r.name}>
          <div className="flex items-baseline justify-between text-sm"><span className="font-medium"><span className="mr-2 text-slate-400">{i + 1}.</span>{r.name}</span><span className="tabular-nums text-slate-600">{r.count} {unit}</span></div>
          <div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-brand-500" style={{ width: `${(r.count / max) * 100}%` }} /></div>
        </li>
      ))}
    </ol>
  );
}

function Hotspots({ buildings }) {
  const [sel, setSel] = useState(null);
  const max = Math.max(...buildings.map((b) => b.count), 1);
  const tone = (b) => { const r = b.count / max; return r >= 0.66 ? ['bg-red-500', 'High'] : r >= 0.33 ? ['bg-amber-400', 'Moderate'] : ['bg-emerald-500', 'Low']; };
  const cur = buildings.find((b) => b.name === sel);
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {buildings.map((b) => {
          const [bg, level] = tone(b);
          return (
            <button key={b.name} onClick={() => setSel(b.name)} aria-pressed={sel === b.name}
              className={cx('rounded-xl p-4 text-left text-white shadow-sm transition focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-300', bg, bg === 'bg-amber-400' && 'text-ink-900', sel === b.name && 'ring-4 ring-ink-900/30')}>
              <p className="font-display text-lg font-extrabold">{b.name}</p>
              <p className="text-3xl font-extrabold tabular-nums">{b.count}</p>
              <p className="text-xs font-semibold opacity-90">{level} concentration</p>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-slate-500">Colour is relative to the busiest building in this period. This is a campus-building view built from your location list, not GPS data.</p>
      {cur && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="font-bold">{cur.name}</p>
          <dl className="mt-2 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div><dt className="text-slate-500">Complaints</dt><dd className="text-lg font-bold">{cur.count}</dd></div>
            <div><dt className="text-slate-500">Unresolved</dt><dd className="text-lg font-bold">{cur.unresolved}</dd></div>
            <div><dt className="text-slate-500">Most common</dt><dd className="text-lg font-bold">{cur.top_category || '-'}</dd></div>
            <div><dt className="text-slate-500">Avg. resolution</dt><dd className="text-lg font-bold">{fmtHours(cur.avg_resolution_hours)}</dd></div>
          </dl>
        </div>
      )}
    </div>
  );
}

/** compact = admin dashboard summary, otherwise the full analytics page */
export default function AnalyticsView({ compact }) {
  const [range, setRange] = useState('6m');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const params = clean({ range, from: range === 'custom' ? from : '', to: range === 'custom' ? to : '' });
  const key = JSON.stringify(params);

  const { data, loading, error, reload } = useAsync(async () => {
    const [overview, categories, priorities, statuses, locations, timeline, overdue] = await Promise.all([
      api.get('/analytics/overview', params), api.get('/analytics/categories', params), api.get('/analytics/priorities', params),
      api.get('/analytics/statuses', params), api.get('/analytics/locations', params), api.get('/analytics/timeline', params),
      api.get('/analytics/overdue'),
    ]);
    return { overview, categories, priorities, statuses, locations, timeline, overdue };
  }, [key]);

  const picker = (
    <div className="mb-6 flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="range" className="label">Time period</label>
        <select id="range" className="input w-auto" value={range} onChange={(e) => setRange(e.target.value)}>{RANGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      </div>
      {range === 'custom' && (
        <>
          <div><label htmlFor="af" className="label">From</label><input id="af" type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><label htmlFor="at" className="label">To</label><input id="at" type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        </>
      )}
    </div>
  );

  if (error) return <>{picker}<ErrorState message={error} onRetry={reload} /></>;
  if (loading && !data) return <>{picker}<Loading label="Crunching complaint data..." /></>;

  const { overview: o, categories, priorities, statuses, locations, timeline, overdue } = data;
  const empty = o.total === 0;

  return (
    <div className={cx(loading && 'opacity-60 transition')}>
      {picker}
      {empty && <div className="mb-4"><Alert tone="amber">No complaints were created in this period. Try a longer range.</Alert></div>}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-7">
        <StatCard label="Total" value={o.total} icon={ClipboardList} tone="brand" />
        <StatCard label="New" value={o.submitted} icon={Inbox} tone="slate" hint="Not yet reviewed" />
        <StatCard label="Under review" value={o.under_review} icon={Search} tone="sky" />
        <StatCard label="In progress" value={o.in_progress + o.assigned} icon={Hammer} tone="amber" hint={`${o.assigned} assigned, ${o.in_progress} started`} />
        <StatCard label="Resolved" value={o.resolved} icon={CheckCircle2} tone="emerald" hint="Awaiting student" />
        <StatCard label="Closed" value={o.closed} icon={Lock} tone="dark" />
        <StatCard label="Overdue" value={o.overdue} icon={AlertTriangle} tone="signal" hint={o.escalated ? `${o.escalated} escalated` : 'Past response window'} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-slate-500"><CheckCircle2 className="h-4 w-4" /> Resolution rate</p>
          <p className="mt-1 font-display text-3xl font-extrabold">{o.resolution_rate}%</p>
          <div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${o.resolution_rate}%` }} /></div>
        </div>
        <div className="card p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-slate-500"><Timer className="h-4 w-4" /> Average resolution time</p>
          <p className="mt-1 font-display text-3xl font-extrabold">{fmtHours(o.avg_resolution_hours)}</p>
          <p className="text-xs text-slate-500">From report to marked resolved</p>
        </div>
        <div className="card p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-slate-500"><Star className="h-4 w-4" /> Average resolution rating</p>
          <p className="mt-1 font-display text-3xl font-extrabold">{o.avg_rating != null ? `${o.avg_rating} / 5` : '-'}</p>
          <p className="text-xs text-slate-500">{o.ratings} rating{o.ratings === 1 ? '' : 's'}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Complaints by category">
          {categories.length === 0 ? <NoData /> : (
            <ResponsiveContainer width="100%" height={Math.max(220, categories.length * 38)}>
              <BarChart data={categories} layout="vertical" margin={{ left: 10, right: 16 }}>
                <CartesianGrid horizontal={false} stroke="#e2e8f0" /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} />
                <Tooltip /><Bar dataKey="count" name="Complaints" fill={BRAND} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>
        <Panel title="Complaints over time" subtitle={`Reported vs. resolved, per ${timeline.unit}`}>
          {timeline.points.length === 0 ? <NoData /> : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={timeline.points} margin={{ right: 12 }}>
                <CartesianGrid stroke="#e2e8f0" /><XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(timeline.unit === 'day' ? 5 : 0)} /><YAxis allowDecimals={false} />
                <Tooltip /><Legend />
                <Line type="monotone" dataKey="created" name="Reported" stroke="#f26b1d" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="resolved" name="Resolved" stroke={BRAND} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Panel>
        <Panel title="Complaints by status">
          {statuses.length === 0 ? <NoData /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart><Pie data={statuses} dataKey="count" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>{statuses.map((s) => <Cell key={s.name} fill={STATUS_COLOR[s.name]} />)}</Pie><Tooltip /><Legend /></PieChart>
            </ResponsiveContainer>
          )}
        </Panel>
        <Panel title="Complaints by priority">
          {priorities.length === 0 ? <NoData /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart><Pie data={priorities} dataKey="count" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>{priorities.map((s) => <Cell key={s.name} fill={PRIORITY_COLOR[s.name]} />)}</Pie><Tooltip /><Legend /></PieChart>
            </ResponsiveContainer>
          )}
        </Panel>
        <Panel title="Complaints by location" subtitle="Per building">
          {locations.buildings.length === 0 ? <NoData /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={locations.buildings} margin={{ right: 12 }}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" /><XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis allowDecimals={false} /><Tooltip />
                <Legend /><Bar dataKey="count" name="Total" fill={BRAND} radius={[4, 4, 0, 0]} /><Bar dataKey="unresolved" name="Unresolved" fill="#f26b1d" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>
        <Panel title={`Overdue complaints (${o.overdue} in this period)`} subtitle="Live list, oldest deadline first">
          {overdue.length === 0 ? <p className="py-10 text-center text-sm text-emerald-600">Nothing is overdue right now.</p> : (
            <ul className="-mx-2 divide-y divide-slate-100">
              {overdue.slice(0, compact ? 5 : 8).map((c) => (
                <li key={c.id}><Link to={`/complaints/${c.id}`} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm hover:bg-slate-50">
                  <span className="min-w-0"><span className="block truncate font-semibold">{c.title}</span><span className="font-mono text-xs text-slate-500">{c.complaint_code} · {c.priority}</span></span>
                  <span className="shrink-0 text-xs font-semibold text-signal-600">{c.status}</span></Link></li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {!compact && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Panel title="Most frequent issues" subtitle="Recurring problems by category">{categories.length === 0 ? <NoData /> : <Ranked rows={categories} />}</Panel>
          <Panel title="Problematic locations" subtitle="Buildings with the most complaints">{locations.buildings.length === 0 ? <NoData /> : <Ranked rows={locations.buildings} />}</Panel>
          <Panel title="Campus hotspots" subtitle="Click a building for details" className="lg:col-span-2">
            {locations.buildings.length === 0 ? <NoData /> : <Hotspots buildings={locations.buildings} />}
          </Panel>
          <Panel title="Most complained-about rooms and areas" className="lg:col-span-2">
            {locations.spots.length === 0 ? <NoData /> : (
              <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs text-slate-500"><tr><th className="py-2">Building</th><th>Floor</th><th>Room / area</th><th className="text-right">Complaints</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{locations.spots.map((s, i) => <tr key={i}><td className="py-2 font-medium">{s.building}</td><td>{s.floor}</td><td>{s.spot}</td><td className="text-right font-semibold tabular-nums">{s.count}</td></tr>)}</tbody></table></div>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
