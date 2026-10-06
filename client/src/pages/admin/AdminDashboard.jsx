import { Link } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import AnalyticsView from '../../components/AnalyticsView';
import ComplaintList from '../../components/ComplaintList';
import { Button, ErrorState, Loading, PageHeader } from '../../components/ui';
import { useAsync } from '../../hooks/useAsync';
import { api } from '../../services/api';

export default function AdminDashboard() {
  const { data, loading, error, reload } = useAsync(() => api.get('/complaints', { status: 'Submitted' }));
  return (
    <div>
      <PageHeader title="Admin dashboard" subtitle="Live view of complaints across campus."
        action={<Link to="/admin/analytics"><Button variant="secondary"><BarChart3 className="h-4 w-4" /> Full analytics</Button></Link>} />

      <section className="card mb-8 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div><h2 className="text-lg font-bold">New complaints awaiting review</h2><p className="text-xs text-slate-500">Open one to review, verify priority and assign it.</p></div>
          <Link to="/admin/complaints" className="text-sm font-semibold text-brand-700 hover:underline">All complaints</Link>
        </div>
        {error ? <div className="p-4"><ErrorState message={error} onRetry={reload} /></div> : loading && !data ? <Loading /> :
          <ComplaintList complaints={(data || []).slice(0, 6)} showStudent empty={<p className="px-4 py-10 text-center text-sm text-slate-500">No new complaints. Everything has been reviewed.</p>} />}
      </section>

      <AnalyticsView compact />
    </div>
  );
}
