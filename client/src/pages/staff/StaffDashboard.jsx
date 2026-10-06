import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ClipboardList, Hammer } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { api } from '../../services/api';
import ComplaintList from '../../components/ComplaintList';
import { EmptyState, ErrorState, Loading, PageHeader, StatCard } from '../../components/ui';

export default function StaffDashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => api.get('/complaints'));
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading && !data) return <Loading />;

  const list = data || [];
  const todo = list.filter((c) => ['Assigned', 'Reopened'].includes(c.status));
  const doing = list.filter((c) => c.status === 'In Progress');
  const overdue = list.filter((c) => c.is_overdue);
  const done = list.filter((c) => ['Resolved', 'Closed'].includes(c.status));
  // Overdue first, then oldest first
  const queue = list.filter((c) => ['Assigned', 'In Progress', 'Reopened'].includes(c.status))
    .sort((a, b) => Number(b.is_overdue) - Number(a.is_overdue) || new Date(a.due_at) - new Date(b.due_at));

  return (
    <div>
      <PageHeader title={`Hello, ${user.name.split(' ')[0]}`} subtitle={user.department_name ? `${user.department_name} · your work queue` : 'Your work queue'} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="To start" value={todo.length} icon={ClipboardList} tone="violet" hint="Assigned to you" />
        <StatCard label="In progress" value={doing.length} icon={Hammer} tone="amber" />
        <StatCard label="Overdue" value={overdue.length} icon={AlertTriangle} tone="signal" hint="Past response window" />
        <StatCard label="Completed" value={done.length} icon={CheckCircle2} tone="emerald" />
      </div>
      <div className="card mt-8 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-bold">Work queue</h2>
          <Link to="/staff/complaints" className="text-sm font-semibold text-brand-700 hover:underline">All assigned</Link>
        </div>
        <ComplaintList complaints={queue} empty={<EmptyState title="Nothing in your queue" text="New assignments from the administration will show up here." />} />
      </div>
    </div>
  );
}
