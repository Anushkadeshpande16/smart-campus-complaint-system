import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, CheckCircle2, Users, X } from 'lucide-react';
import { api } from '../../services/api';
import { useMeta } from '../../hooks/useMeta';
import { Alert, Button, CodeTag, Field, Modal, StatusBadge, cx } from '../../components/ui';
import { locationLabel, spotOf } from '../../utils/format';

const PRIORITY_HINT = { Low: 'Not urgent', Medium: 'Affects daily use', High: 'Safety risk or blocks classes' };
const ACTIVE = { Low: 'border-slate-500 bg-slate-100', Medium: 'border-amber-500 bg-amber-50', High: 'border-signal-500 bg-orange-50' };

export default function ReportComplaint() {
  const meta = useMeta();
  const nav = useNavigate();
  const [f, setF] = useState({ title: '', description: '', building: '', floor: '', location_id: '', category_id: '', priority: 'Medium' });
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dupes, setDupes] = useState(null);
  const [created, setCreated] = useState(null);

  const buildings = useMemo(() => [...new Set(meta.locations.map((l) => l.building))], [meta.locations]);
  const floors = useMemo(() => [...new Set(meta.locations.filter((l) => l.building === f.building).map((l) => l.floor))], [meta.locations, f.building]);
  const spots = useMemo(() => meta.locations.filter((l) => l.building === f.building && l.floor === f.floor), [meta.locations, f.building, f.floor]);
  const category = meta.categories.find((c) => String(c.id) === String(f.category_id));
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const pickPhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return setErrors((x) => ({ ...x, photo: 'Use a JPG, PNG or WebP image' }));
    if (file.size > 5 * 1024 * 1024) return setErrors((x) => ({ ...x, photo: 'Image must be 5 MB or smaller' }));
    setErrors((x) => ({ ...x, photo: undefined }));
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const validate = () => {
    const er = {};
    if (f.title.trim().length < 5) er.title = 'Give the problem a short title (at least 5 characters)';
    if (f.description.trim().length < 10) er.description = 'Describe the problem in at least 10 characters';
    if (!f.building) er.building = 'Choose a building';
    else if (!f.floor) er.floor = 'Choose a floor';
    else if (!f.location_id) er.location_id = 'Choose a room or area';
    if (!f.category_id) er.category_id = 'Choose a category';
    setErrors((x) => ({ photo: x.photo, ...er }));
    return !Object.keys(er).length;
  };

  const submitNow = async () => {
    setBusy(true); setError(''); setDupes(null);
    try {
      const fd = new FormData();
      ['title', 'description', 'location_id', 'category_id', 'priority'].forEach((k) => fd.append(k, f[k]));
      if (photo) fd.append('photo', photo);
      setCreated(await api.post('/complaints', fd));
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setBusy(true);
    try {
      const found = await api.get('/complaints/duplicates', { category_id: f.category_id, location_id: f.location_id, title: f.title, description: f.description });
      if (found.length) { setDupes(found); setBusy(false); return; }
    } catch { /* duplicate check is optional; carry on */ }
    await submitNow();
  };

  const support = async (id) => {
    setBusy(true);
    try {
      const r = await api.post(`/complaints/${id}/support`);
      if (!r.supported) await api.post(`/complaints/${id}/support`); // was already supported: toggle back on
      nav(`/complaints/${id}`);
    } catch (err) { setError(err.message); setDupes(null); setBusy(false); }
  };

  if (created) {
    return (
      <div className="mx-auto max-w-lg py-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 className="h-8 w-8" /></span>
        <h1 className="mt-4 text-3xl font-extrabold">Complaint submitted</h1>
        <p className="mt-1 text-slate-500">Keep this ID to follow your complaint.</p>
        <div className="mt-5"><CodeTag code={created.complaint_code} large /></div>
        <div className="card mx-auto mt-6 p-4 text-left text-sm">
          <p className="font-semibold">{created.title}</p>
          <p className="text-slate-500">{locationLabel(created)}</p>
          <p className="mt-2 text-slate-600">Routed to <b>{created.department_name}</b>. An administrator will review it shortly.</p>
        </div>
        <div className="mt-6 flex justify-center gap-3">
          <Link to={`/complaints/${created.id}`}><Button>Track complaint</Button></Link>
          <Button variant="secondary" onClick={() => { setCreated(null); setF({ title: '', description: '', building: '', floor: '', location_id: '', category_id: '', priority: 'Medium' }); setPhoto(null); setPreview(null); }}>Report another</Button>
        </div>
      </div>
    );
  }

  const err = (k) => (errors[k] ? 'input-error' : '');
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-extrabold">Report an issue</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">The more precise the location, the faster it gets fixed.</p>
      <form onSubmit={submit} noValidate className="card space-y-6 p-5 sm:p-6">
        {error && <Alert>{error}</Alert>}

        <Field label="Title" htmlFor="title" error={errors.title}>
          <input id="title" className={cx('input', err('title'))} maxLength={150} placeholder="e.g. Fan not working" value={f.title} onChange={set('title')} />
        </Field>
        <Field label="Description" htmlFor="desc" error={errors.description}>
          <textarea id="desc" rows={4} className={cx('input', err('description'))} placeholder="What is wrong, and since when?" value={f.description} onChange={set('description')} />
        </Field>

        <fieldset>
          <legend className="label">Location</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field error={errors.building}>
              <select aria-label="Building" className={cx('input', err('building'))} value={f.building} onChange={(e) => setF({ ...f, building: e.target.value, floor: '', location_id: '' })}>
                <option value="">Building</option>{buildings.map((b) => <option key={b}>{b}</option>)}
              </select>
            </Field>
            <Field error={errors.floor}>
              <select aria-label="Floor" className={cx('input', err('floor'))} disabled={!f.building} value={f.floor} onChange={(e) => setF({ ...f, floor: e.target.value, location_id: '' })}>
                <option value="">Floor</option>{floors.map((x) => <option key={x}>{x}</option>)}
              </select>
            </Field>
            <Field error={errors.location_id}>
              <select aria-label="Room or area" className={cx('input', err('location_id'))} disabled={!f.floor} value={f.location_id} onChange={set('location_id')}>
                <option value="">Room / area</option>{spots.map((l) => <option key={l.id} value={l.id}>{spotOf(l)}</option>)}
              </select>
            </Field>
          </div>
        </fieldset>

        <Field label="Category" htmlFor="cat" error={errors.category_id} hint={category ? `Will be routed to ${category.department_name}` : undefined}>
          <select id="cat" className={cx('input', err('category_id'))} value={f.category_id} onChange={set('category_id')}>
            <option value="">Choose a category</option>{meta.categories.filter((c) => c.is_active).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>

        <fieldset>
          <legend className="label">Priority</legend>
          <div className="grid grid-cols-3 gap-2" role="radiogroup">
            {['Low', 'Medium', 'High'].map((p) => (
              <button key={p} type="button" role="radio" aria-checked={f.priority === p} onClick={() => setF({ ...f, priority: p })}
                className={cx('rounded-lg border-2 px-3 py-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500', f.priority === p ? ACTIVE[p] : 'border-slate-200 bg-white hover:border-slate-300')}>
                <span className="block text-sm font-bold">{p}</span><span className="block text-xs text-slate-500">{PRIORITY_HINT[p]}</span>
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-500">This is your suggestion. The administration verifies the final priority.</p>
        </fieldset>

        <Field label="Photo (optional)" error={errors.photo}>
          {preview ? (
            <div className="relative inline-block">
              <img src={preview} alt="Selected evidence" className="h-40 rounded-lg border border-slate-200 object-cover" />
              <button type="button" aria-label="Remove photo" onClick={() => { setPhoto(null); setPreview(null); }} className="absolute -right-2 -top-2 rounded-full bg-ink-900 p-1 text-white"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 hover:border-brand-400 hover:bg-brand-50/40">
              <Camera className="h-6 w-6" /> Take or upload a photo
              <span className="text-xs">JPG, PNG or WebP, up to 5 MB</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={pickPhoto} />
            </label>
          )}
        </Field>

        <Button type="submit" loading={busy} className="w-full sm:w-auto">Submit complaint</Button>
      </form>

      {dupes && (
        <Modal title="Similar complaint already exists" onClose={() => setDupes(null)} wide>
          <p className="mb-4 text-sm text-slate-600">Someone may have already reported this. Supporting it tells the administration that more students are affected, and you will be updated as it progresses.</p>
          <div className="space-y-3">
            {dupes.map((d) => (
              <div key={d.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-2"><CodeTag code={d.complaint_code} /><StatusBadge status={d.status} /></div>
                <p className="mt-1.5 font-semibold">{d.title}</p>
                <p className="text-sm text-slate-500">{locationLabel(d)} · {d.category_name}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Users className="h-3.5 w-3.5" /> {d.affected_count} student{d.affected_count > 1 ? 's' : ''} affected</p>
                <Button className="mt-3" onClick={() => support(d.id)} loading={busy}>Support existing complaint</Button>
              </div>
            ))}
          </div>
          <Button variant="secondary" className="mt-4 w-full" onClick={submitNow} loading={busy}>Submit as separate complaint</Button>
        </Modal>
      )}
    </div>
  );
}
