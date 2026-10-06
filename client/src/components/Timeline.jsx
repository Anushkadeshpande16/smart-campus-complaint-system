import { Check } from 'lucide-react';
import { LIFECYCLE, fmtDate } from '../utils/format';
import { cx } from './ui';

/** Horizontal (desktop) / vertical (mobile) lifecycle tracker driven by the status history. */
export function Stepper({ status, history }) {
  const idx = status === 'Reopened' ? 1 : LIFECYCLE.indexOf(status);
  const when = {};
  history.forEach((h) => { if (h.old_status !== h.new_status) when[h.new_status] = h.created_at; });
  return (
    <div>
      {status === 'Reopened' && (
        <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          Reopened. The issue is back with the administration for reassignment.
        </p>
      )}
      <ol className="flex flex-col gap-0 md:flex-row">
        {LIFECYCLE.map((s, i) => {
          const done = i < idx || status === 'Closed';
          const current = i === idx && status !== 'Closed';
          return (
            <li key={s} className="relative flex flex-1 gap-3 pb-5 md:flex-col md:items-center md:gap-2 md:pb-0 md:text-center">
              {i > 0 && (
                <span className={cx('absolute left-[15px] top-[-20px] h-5 w-0.5 md:left-[-50%] md:top-[15px] md:h-0.5 md:w-full',
                  i <= idx || status === 'Closed' ? 'bg-brand-500' : 'bg-slate-200')} aria-hidden />
              )}
              <span className={cx('relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold',
                done ? 'border-brand-600 bg-brand-600 text-white' : current ? 'border-brand-600 bg-white text-brand-700 ring-4 ring-brand-100' : 'border-slate-300 bg-white text-slate-300')}>
                {done ? <Check className="h-4 w-4" /> : current ? <span className="h-2.5 w-2.5 rounded-full bg-brand-600" /> : null}
              </span>
              <div>
                <p className={cx('text-sm font-semibold', done || current ? 'text-ink-900' : 'text-slate-400')}>{s}</p>
                <p className="text-xs text-slate-500">{when[s] && (done || current) ? fmtDate(when[s]) : ''}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Full audit log of every change. */
export function HistoryLog({ history }) {
  return (
    <ol className="space-y-4">
      {[...history].reverse().map((h) => {
        const update = h.old_status === h.new_status;
        return (
          <li key={h.id} className="flex gap-3">
            <span className={cx('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', update ? 'border-2 border-slate-400 bg-white' : 'bg-brand-600')} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink-900">
                {h.new_status}{update && <span className="ml-1 font-normal text-slate-500">(update)</span>}
              </p>
              <p className="text-xs text-slate-500">{fmtDate(h.created_at)}{h.changed_by_name ? ` · ${h.changed_by_name}` : ''}</p>
              {h.remarks && <p className="mt-1 break-words text-sm text-slate-600">{h.remarks}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
