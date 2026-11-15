import React from 'react';
import { Trash2 } from 'lucide-react';
import { ClinicalLogEntry, LogSeverity } from '../types/telemetry';

interface ClinicalLogProps {
  entries: ClinicalLogEntry[];
  onClear: () => void;
}

const SEVERITY_TEXT: Record<LogSeverity, string> = {
  info: 'text-slate-300',
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  critical: 'text-red-400',
};

const SEVERITY_MARK: Record<LogSeverity, string> = {
  info: '●',
  success: '✓',
  warning: '▲',
  critical: '✖',
};

export const ClinicalLog: React.FC<ClinicalLogProps> = ({ entries, onClear }) => {
  return (
    <section
      aria-label="Clinical Alert and Event Log"
      className="rounded-2xl border border-slate-800/90 bg-[#0E141F] p-3.5"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h2 className="text-xs font-semibold tracking-tight text-slate-100">
            Clinical Alert &amp; Event Log
          </h2>
          <span className="font-mono text-[10px] text-slate-500 tabular-nums">
            {entries.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onClear}
          disabled={entries.length === 0}
          className="inline-flex min-h-[32px] items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200 disabled:pointer-events-none disabled:opacity-40"
        >
          <Trash2 className="h-3 w-3" aria-hidden="true" />
          <span>Clear</span>
        </button>
      </div>

      <div className="clinical-scroll max-h-36 overflow-y-auto rounded-xl border border-slate-800/80 bg-[#080C14] p-2.5">
        {entries.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-500">
            No clinical events recorded yet.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex items-start gap-2 border-b border-slate-800/50 pb-1.5 text-[11px] leading-relaxed last:border-b-0 last:pb-0"
              >
                <span className="shrink-0 font-mono text-[10px] text-slate-500 tabular-nums">
                  {entry.timestamp}
                </span>
                <span
                  className={`shrink-0 font-mono text-[10px] ${SEVERITY_TEXT[entry.severity]}`}
                  aria-hidden="true"
                >
                  {SEVERITY_MARK[entry.severity]}
                </span>
                <span className={`min-w-0 flex-1 ${SEVERITY_TEXT[entry.severity]}`}>
                  {entry.message}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};
