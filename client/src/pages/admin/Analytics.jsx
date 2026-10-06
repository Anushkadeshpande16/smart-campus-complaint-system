import { useState } from 'react';
import AnalyticsView from '../../components/AnalyticsView';
import { Alert, Button, Field, PageHeader } from '../../components/ui';
import { useMeta, invalidateMeta } from '../../hooks/useMeta';
import { api } from '../../services/api';

function SlaSettings() {
  const meta = useMeta();
  const [vals, setVals] = useState(null);
  const [msg, setMsg] = useState(null);
  const current = vals || Object.fromEntries(meta.sla.map((s) => [s.priority, s.hours]));
  if (!meta.sla.length) return null;

  const save = async (e) => {
    e.preventDefault(); setMsg(null);
    try { await api.put('/admin/sla', current); invalidateMeta(); setMsg({ tone: 'emerald', text: 'Escalation windows saved. Overdue flags update immediately.' }); }
    catch (err) { setMsg({ tone: 'rose', text: err.message }); }
  };
  return (
    <form onSubmit={save} className="card mt-8 p-5">
      <h2 className="text-lg font-bold">Escalation windows</h2>
      <p className="mb-4 text-sm text-slate-500">A complaint becomes overdue when it is still open after this many hours.</p>
      {msg && <div className="mb-4"><Alert tone={msg.tone}>{msg.text}</Alert></div>}
      <div className="flex flex-wrap items-end gap-4">
        {['High', 'Medium', 'Low'].map((p) => (
          <Field key={p} label={`${p} priority (hours)`} htmlFor={`sla-${p}`}>
            <input id={`sla-${p}`} type="number" min="1" max="2160" className="input w-40" value={current[p] ?? ''} onChange={(e) => setVals({ ...current, [p]: e.target.value })} />
          </Field>
        ))}
        <Button type="submit">Save</Button>
      </div>
    </form>
  );
}

export default function Analytics() {
  return (
    <div>
      <PageHeader title="Analytics" subtitle="Recurring problems, problem locations and resolution performance." />
      <AnalyticsView />
      <SlaSettings />
    </div>
  );
}
