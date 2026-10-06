import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import { CodeTag, EmptyState, EscalatedBadge, OverdueBadge, PriorityBadge, StatusBadge } from './ui';
import { fmtDate, locationLabel } from '../utils/format';

const Flags = ({ c }) => (
  <>
    {c.is_overdue && <OverdueBadge />}
    {c.escalated && <EscalatedBadge />}
    {c.affected_count > 1 && (
      <span className="inline-flex items-center gap-1 text-xs text-slate-500" title="Students affected"><Users className="h-3.5 w-3.5" />{c.affected_count}</span>
    )}
  </>
);

/** Table on desktop, stacked cards on mobile. */
export default function ComplaintList({ complaints, showStudent, showStaff, empty }) {
  if (!complaints.length) return empty || <EmptyState title="No complaints found" text="Try changing the filters." />;
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
            <tr>
              <th className="px-4 py-3">Complaint</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Priority</th><th className="px-4 py-3">Status</th>
              {showStudent && <th className="px-4 py-3">Reported by</th>}
              {showStaff && <th className="px-4 py-3">Assigned to</th>}
              <th className="px-4 py-3">Reported</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {complaints.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="max-w-[280px] px-4 py-3">
                  <Link to={`/complaints/${c.id}`} className="group block focus:outline-none">
                    <CodeTag code={c.complaint_code} />
                    <p className="mt-1 truncate font-semibold text-ink-900 group-hover:text-brand-700 group-focus-visible:underline">{c.title}</p>
                    <span className="mt-0.5 flex flex-wrap items-center gap-2"><Flags c={c} /></span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{locationLabel(c)}</td>
                <td className="px-4 py-3 text-slate-600">{c.category_name}</td>
                <td className="px-4 py-3"><PriorityBadge priority={c.priority} /></td>
                <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                {showStudent && <td className="px-4 py-3 text-slate-600">{c.student_name}</td>}
                {showStaff && <td className="px-4 py-3 text-slate-600">{c.staff_name || <span className="text-slate-400">Unassigned</span>}</td>}
                <td className="whitespace-nowrap px-4 py-3 text-slate-500">{fmtDate(c.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="divide-y divide-slate-100 md:hidden">
        {complaints.map((c) => (
          <li key={c.id}>
            <Link to={`/complaints/${c.id}`} className="block px-4 py-3 active:bg-slate-50">
              <div className="flex items-start justify-between gap-2">
                <CodeTag code={c.complaint_code} />
                <StatusBadge status={c.status} />
              </div>
              <p className="mt-1.5 font-semibold text-ink-900">{c.title}</p>
              <p className="text-xs text-slate-500">{locationLabel(c)}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span>{c.category_name}</span><PriorityBadge priority={c.priority} /><Flags c={c} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
