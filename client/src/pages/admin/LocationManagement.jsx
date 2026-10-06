import { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { invalidateMeta } from '../../hooks/useMeta';
import { api } from '../../services/api';
import { Alert, Button, ErrorState, Field, Loading, Modal, PageHeader } from '../../components/ui';

function LocationModal({ loc, buildings, onClose, onDone }) {
  const [f, setF] = useState({ building: loc?.building || '', floor: loc?.floor || '', room: loc?.room || '', area: loc?.area || '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setError('');
    if (!f.building.trim() || !f.floor.trim()) return setError('Building and floor are required');
    if (!f.room.trim() && !f.area.trim()) return setError('Enter a room or an area (for example Corridor)');
    setBusy(true);
    try { loc ? await api.put(`/admin/locations/${loc.id}`, f) : await api.post('/admin/locations', f); onDone(); }
    catch (err) { setError(err.message); setBusy(false); }
  };
  return (
    <Modal title={loc ? 'Edit location' : 'Add location'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <Field label="Building / block" htmlFor="lb"><input id="lb" list="bl" className="input" placeholder="e.g. Block D" value={f.building} onChange={set('building')} /><datalist id="bl">{buildings.map((b) => <option key={b} value={b} />)}</datalist></Field>
        <Field label="Floor" htmlFor="lf"><input id="lf" className="input" placeholder="e.g. 2nd Floor" value={f.floor} onChange={set('floor')} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Room" htmlFor="lr"><input id="lr" className="input" placeholder="Room 204" value={f.room} onChange={set('room')} /></Field>
          <Field label="or Area" htmlFor="la"><input id="la" className="input" placeholder="Corridor" value={f.area} onChange={set('area')} /></Field>
        </div>
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={busy}>Save</Button></div>
      </form>
    </Modal>
  );
}

export default function LocationManagement() {
  const { data, loading, error, reload } = useAsync(() => api.get('/meta'));
  const [modal, setModal] = useState(null);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState(null);
  const groups = useMemo(() => {
    const g = {};
    (data?.locations || []).forEach((l) => { (g[l.building] ||= []).push(l); });
    return g;
  }, [data]);
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading && !data) return <Loading />;
  const refresh = () => { invalidateMeta(); reload(); };
  const remove = async (l) => {
    if (!window.confirm('Delete this location?')) return;
    setErr('');
    try { await api.del(`/admin/locations/${l.id}`); refresh(); } catch (e) { setErr(e.message); }
  };

  return (
    <div>
      <PageHeader title="Locations" subtitle="Campus → Building → Floor → Room or area. Students pick from this list."
        action={<Button onClick={() => setModal({})}><Plus className="h-4 w-4" /> Add location</Button>} />
      {err && <div className="mb-4"><Alert>{err}</Alert></div>}
      <div className="space-y-3">
        {Object.entries(groups).map(([b, locs]) => (
          <section key={b} className="card overflow-hidden">
            <button className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50" onClick={() => setOpen(open === b ? null : b)} aria-expanded={open === b}>
              <span className="font-display text-lg font-bold">{b}</span><span className="text-sm text-slate-500">{locs.length} locations</span>
            </button>
            {open === b && (
              <ul className="divide-y divide-slate-100 border-t border-slate-100">
                {locs.map((l) => (
                  <li key={l.id} className="flex items-center justify-between px-4 py-2 text-sm">
                    <span><span className="text-slate-500">{l.floor} → </span><span className="font-medium">{l.room || l.area}</span></span>
                    <span className="flex"><Button variant="ghost" aria-label="Edit location" onClick={() => setModal(l)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" aria-label="Delete location" onClick={() => remove(l)}><Trash2 className="h-4 w-4 text-rose-600" /></Button></span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
      {modal && <LocationModal loc={modal.id ? modal : null} buildings={Object.keys(groups)} onClose={() => setModal(null)} onDone={() => { setModal(null); refresh(); }} />}
    </div>
  );
}
