import { useEffect } from 'react';
import { AlertTriangle, Inbox, Loader2, Star, X, Flame } from 'lucide-react';
import { PRIORITY_STYLE, STATUS_STYLE } from '../utils/format';

export const cx = (...a) => a.filter(Boolean).join(' ');

export function Button({ variant = 'primary', loading, className, children, type = 'button', ...p }) {
  const v = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm',
    secondary: 'bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700',
    dark: 'bg-ink-900 text-white hover:bg-ink-800',
    ghost: 'text-slate-600 hover:bg-slate-100',
  }[variant];
  return (
    <button
      type={type}
      {...p}
      disabled={p.disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
        v, className
      )}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export const StatusBadge = ({ status }) => (
  <span className={cx('inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', STATUS_STYLE[status])}>
    {status}
  </span>
);

export const PriorityBadge = ({ priority }) => (
  <span className={cx('inline-flex items-center gap-1.5 text-xs font-semibold', PRIORITY_STYLE[priority]?.text)}>
    <span className={cx('h-2 w-2 rounded-full', PRIORITY_STYLE[priority]?.dot)} />
    {priority}
  </span>
);

export const OverdueBadge = () => (
  <span className="inline-flex items-center gap-1 rounded-full bg-signal-500 px-2 py-0.5 text-xs font-bold text-white">
    <AlertTriangle className="h-3 w-3" /> Overdue
  </span>
);

export const EscalatedBadge = () => (
  <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2 py-0.5 text-xs font-bold text-white">
    <Flame className="h-3 w-3" /> Escalated
  </span>
);

/** Complaint ID styled like a work-order tag */
export const CodeTag = ({ code, large }) => (
  <span className={cx('inline-block rounded-md border border-dashed border-slate-400 bg-amber-50 font-mono font-semibold text-ink-900',
    large ? 'px-3 py-1.5 text-lg' : 'px-1.5 py-0.5 text-xs')}>
    {code}
  </span>
);

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, tone = 'slate', hint }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600', brand: 'bg-brand-50 text-brand-700', amber: 'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700', signal: 'bg-orange-50 text-signal-600', sky: 'bg-sky-50 text-sky-700',
    violet: 'bg-violet-50 text-violet-700', dark: 'bg-ink-900 text-white', rose: 'bg-rose-50 text-rose-700',
  };
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {Icon && <span className={cx('rounded-lg p-2', tones[tone])}><Icon className="h-4 w-4" /></span>}
      </div>
      <p className="mt-2 font-display text-3xl font-extrabold text-ink-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function Loading({ label = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500" role="status">
      <Loader2 className="h-5 w-5 animate-spin" /> {label}
    </div>
  );
}

export function EmptyState({ title, text, action, icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center px-4 py-14 text-center">
      <span className="rounded-full bg-slate-100 p-3 text-slate-400"><Icon className="h-6 w-6" /></span>
      <h3 className="mt-3 text-base font-semibold">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">
      <p className="font-semibold">Something went wrong</p>
      <p className="mt-0.5">{message}</p>
      {onRetry && <Button variant="secondary" className="mt-3" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export const Alert = ({ tone = 'rose', children }) => {
  const t = { rose: 'border-rose-200 bg-rose-50 text-rose-800', emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
              amber: 'border-amber-200 bg-amber-50 text-amber-900', sky: 'border-sky-200 bg-sky-50 text-sky-800' }[tone];
  return <div role={tone === 'rose' ? 'alert' : 'status'} className={cx('rounded-lg border px-3 py-2 text-sm', t)}>{children}</div>;
};

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/60 p-0 sm:items-center sm:p-4" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}
        className={cx('max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl', wide ? 'sm:max-w-2xl' : 'sm:max-w-lg')}>
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, error, hint, children, htmlFor }) {
  return (
    <div>
      {label && <label htmlFor={htmlFor} className="label">{label}</label>}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs font-medium text-rose-600">{error}</p>}
    </div>
  );
}

export function Stars({ value = 0, onChange, size = 'h-6 w-6' }) {
  return (
    <div className="inline-flex gap-1" role={onChange ? 'radiogroup' : 'img'} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const star = <Star className={cx(size, n <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} />;
        return onChange ? (
          <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} star${n > 1 ? 's' : ''}`}
            className="rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">{star}</button>
        ) : <span key={n}>{star}</span>;
      })}
    </div>
  );
}
