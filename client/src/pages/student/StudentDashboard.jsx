import { Link } from 'react-router-dom';
import { CheckCircle2, ClipboardList, Clock, FilePlus2, Hammer, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { api } from '../../services/api';
import ComplaintList from '../../components/ComplaintList';
import { Alert, Button, EmptyState, ErrorState, Loading, PageHeader, StatCard } from '../../components/ui';

export default function StudentDashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => api.get('/complaints'));
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading && !data) return <Loading />;

  const list = data || [];
  const count = (...s) => list.filter((c) => s.includes(c.status)).length;
  const awaiting = list.filter((c) => c.status === 'Resolved');

  return (
    <div>
      <PageHeader title={`Hello, ${user.name.split(' ')[0]}`} subtitle="Here is where your complaints stand."
        action={<Link to="/student/report"><Button><FilePlus2 className="h-4 w-4" /> Report an issue</Button></Link>} />

      {awaiting.length > 0 && (
        <div className="mb-6">
          <Alert tone="emerald">
            <b>{awaiting.length} complaint{awaiting.length > 1 ? 's were' : ' was'} marked resolved.</b> Please check and confirm:{' '}
            {awaiting.map((c, i) => <span key={c.id}>{i > 0 && ', '}<Link className="font-mono font-semibold underline" to={`/complaints/${c.id}`}>{c.complaint_code}</Link></span>)}
          </Alert>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Total" value={list.length} icon={ClipboardList} tone="brand" />
        <StatCard label="Pending" value={count('Submitted', 'Under Review', 'Assigned', 'Reopened')} icon={Clock} tone="sky" hint="Waiting to start" />
        <StatCard label="In progress" value={count('In Progress')} icon={Hammer} tone="amber" />
        <StatCard label="Resolved" value={count('Resolved')} icon={CheckCircle2} tone="emerald" hint="Awaiting your check" />
        <StatCard label="Closed" value={count('Closed')} icon={Lock} tone="dark" />
      </div>

      <div className="card mt-8 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-bold">Recent complaints</h2>
          <Link to="/student/complaints" className="text-sm font-semibold text-brand-700 hover:underline">View all</Link>
        </div>
        <ComplaintList complaints={list.slice(0, 5)}
          empty={<EmptyState title="You have not reported anything yet" text="Found a broken fan or a Wi-Fi dead spot? Report it and we will track it for you."
            action={<Link to="/student/report"><Button>Report your first issue</Button></Link>} />} />
      </div>
    </div>
  );
}
