import { Search } from 'lucide-react';
import { useMeta } from '../hooks/useMeta';
import { Button } from './ui';

const STATUSES = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Closed', 'Reopened'];

/** `fields` picks which controls to show. */
export default function Filters({ filters, setFilters, fields }) {
  const meta = useMeta();
  const buildings = [...new Set(meta.locations.map((l) => l.building))];
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const sel = 'input py-1.5';
  const show = (k) => fields.includes(k);
  const active = Object.values(filters).some((v) => v);
  return (
    <div className="flex flex-wrap items-end gap-3 border-b border-slate-200 p-4">
      {show('q') && (
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input aria-label="Search complaints" className="input py-1.5 pl-9" placeholder="Search by ID, title or description" value={filters.q || ''} onChange={set('q')} />
        </div>
      )}
      {show('status') && (
        <select aria-label="Status" className={sel + ' w-auto'} value={filters.status || ''} onChange={set('status')}>
          <option value="">All statuses</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      )}
      {show('category_id') && (
        <select aria-label="Category" className={sel + ' w-auto'} value={filters.category_id || ''} onChange={set('category_id')}>
          <option value="">All categories</option>{meta.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}
      {show('priority') && (
        <select aria-label="Priority" className={sel + ' w-auto'} value={filters.priority || ''} onChange={set('priority')}>
          <option value="">All priorities</option>{['High', 'Medium', 'Low'].map((p) => <option key={p}>{p}</option>)}
        </select>
      )}
      {show('building') && (
        <select aria-label="Location" className={sel + ' w-auto'} value={filters.building || ''} onChange={set('building')}>
          <option value="">All locations</option>{buildings.map((b) => <option key={b}>{b}</option>)}
        </select>
      )}
      {show('department_id') && (
        <select aria-label="Department" className={sel + ' w-auto'} value={filters.department_id || ''} onChange={set('department_id')}>
          <option value="">All departments</option>{meta.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      )}
      {show('date') && (
        <>
          <label className="text-xs text-slate-500">From <input type="date" className={sel + ' mt-0.5'} value={filters.from || ''} onChange={set('from')} /></label>
          <label className="text-xs text-slate-500">To <input type="date" className={sel + ' mt-0.5'} value={filters.to || ''} onChange={set('to')} /></label>
        </>
      )}
      {show('overdue') && (
        <label className="flex items-center gap-2 pb-2 text-sm font-medium text-slate-700">
          <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600" checked={!!filters.overdue} onChange={(e) => setFilters((f) => ({ ...f, overdue: e.target.checked ? '1' : '' }))} />
          Overdue only
        </label>
      )}
      {active && <Button variant="ghost" onClick={() => setFilters({})}>Clear</Button>}
    </div>
  );
}
