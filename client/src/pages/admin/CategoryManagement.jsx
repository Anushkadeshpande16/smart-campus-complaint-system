import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { invalidateMeta } from '../../hooks/useMeta';
import { api } from '../../services/api';
import { Alert, Button, ErrorState, Field, Loading, Modal, PageHeader } from '../../components/ui';

function CategoryModal({ cat, departments, onClose, onDone }) {
  const [f, setF] = useState({ name: cat?.name || '', department_id: cat?.department_id || '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setError('');
    if (f.name.trim().length < 2) return setError('Enter a category name');
    if (!f.department_id) return setError('Choose the department that handles this category');
    setBusy(true);
    try { cat ? await api.put(`/admin/categories/${cat.id}`, f) : await api.post('/admin/categories', f); onDone(); }
    catch (err) { setError(err.message); setBusy(false); }
  };
  return (
    <Modal title={cat ? 'Edit category' : 'Add category'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <Field label="Name" htmlFor="cn"><input id="cn" className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Routes to department" htmlFor="cd" hint="New complaints in this category are suggested to this department."><select id="cd" className="input" value={f.department_id} onChange={(e) => setF({ ...f, department_id: e.target.value })}><option value="">Select department</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={busy}>Save</Button></div>
      </form>
    </Modal>
  );
}

export default function CategoryManagement() {
  const { data, loading, error, reload } = useAsync(() => api.get('/meta'));
  const [modal, setModal] = useState(null);
  const [err, setErr] = useState('');
  const refresh = () => { invalidateMeta(); reload(); };
  const act = async (fn) => { setErr(''); try { await fn(); refresh(); } catch (e) { setErr(e.message); } };
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading && !data) return <Loading />;

  return (
    <div>
      <PageHeader title="Categories" subtitle="Complaint categories and the department each one routes to."
        action={<Button onClick={() => setModal({})}><Plus className="h-4 w-4" /> Add category</Button>} />
      {err && <div className="mb-4"><Alert>{err}</Alert></div>}
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500"><tr><th className="px-4 py-3">Category</th><th className="px-4 py-3">Routes to</th><th className="px-4 py-3">Status</th><th className="px-4 py-3" /></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {data.categories.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-semibold">{c.name}</td><td className="px-4 py-3 text-slate-600">{c.department_name}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${c.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{c.is_active ? 'Active' : 'Hidden'}</span></td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <Button variant="ghost" aria-label={`Edit ${c.name}`} onClick={() => setModal(c)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" onClick={() => act(() => api.put(`/admin/categories/${c.id}`, { is_active: !c.is_active }))}>{c.is_active ? 'Hide' : 'Show'}</Button>
                  <Button variant="ghost" aria-label={`Delete ${c.name}`} onClick={() => window.confirm(`Delete "${c.name}"?`) && act(() => api.del(`/admin/categories/${c.id}`))}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && <CategoryModal cat={modal.id ? modal : null} departments={data.departments} onClose={() => setModal(null)} onDone={() => { setModal(null); refresh(); }} />}
    </div>
  );
}
