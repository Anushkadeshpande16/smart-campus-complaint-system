import { useState } from 'react';
import Filters from './Filters';
import ComplaintList from './ComplaintList';
import { ErrorState, Loading, PageHeader } from './ui';
import { useAsync, useDebounce } from '../hooks/useAsync';
import { api } from '../services/api';
import { clean } from '../utils/format';

/** Shared list screen: My Complaints (student), Assigned Complaints (staff), All Complaints (admin). */
export default function ComplaintsListPage({ title, subtitle, fields, action, showStudent, showStaff, empty }) {
  const [filters, setFilters] = useState({});
  const dq = useDebounce(filters, 300);
  const { data, loading, error, reload } = useAsync(() => api.get('/complaints', clean(dq)), [JSON.stringify(dq)]);
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} action={action} />
      <div className="card overflow-hidden">
        <Filters filters={filters} setFilters={setFilters} fields={fields} />
        {error ? <div className="p-4"><ErrorState message={error} onRetry={reload} /></div>
          : loading && !data ? <Loading />
          : <ComplaintList complaints={data || []} showStudent={showStudent} showStaff={showStaff}
              empty={Object.keys(clean(filters)).length ? undefined : empty} />}
      </div>
      {data && <p className="mt-2 text-xs text-slate-500">{data.length} complaint{data.length === 1 ? '' : 's'}</p>}
    </div>
  );
}
