import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { useAsync } from '../hooks/useAsync';
import { api } from '../services/api';
import { Button, EmptyState, ErrorState, Loading, PageHeader, cx } from '../components/ui';
import { timeAgo } from '../utils/format';

export default function Notifications() {
  const nav = useNavigate();
  const { data, loading, error, reload } = useAsync(() => api.get('/notifications'));
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading && !data) return <Loading />;

  const open = async (n) => {
    if (!n.is_read) await api.put(`/notifications/${n.id}/read`).catch(() => {});
    if (n.complaint_id) nav(`/complaints/${n.complaint_id}`); else reload();
  };
  const readAll = async () => { await api.post('/notifications/read-all'); reload(); };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Notifications" subtitle={data.unread ? `${data.unread} unread` : 'You are all caught up'}
        action={data.unread > 0 && <Button variant="secondary" onClick={readAll}><CheckCheck className="h-4 w-4" /> Mark all read</Button>} />
      <div className="card divide-y divide-slate-100 overflow-hidden">
        {data.items.length === 0 ? <EmptyState icon={Bell} title="No notifications yet" text="Updates about your complaints will appear here." /> :
          data.items.map((n) => (
            <button key={n.id} onClick={() => open(n)} className={cx('flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50', !n.is_read && 'bg-brand-50/50')}>
              <span className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.is_read ? 'bg-transparent' : 'bg-brand-600')} />
              <span className="min-w-0 flex-1">
                <span className={cx('block text-sm', n.is_read ? 'text-slate-600' : 'font-semibold text-ink-900')}>{n.message}</span>
                <span className="text-xs text-slate-500">{timeAgo(n.created_at)}</span>
              </span>
            </button>
          ))}
      </div>
    </div>
  );
}
