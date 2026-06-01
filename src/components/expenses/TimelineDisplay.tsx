import React from 'react';

interface TimelineEntry {
  source: string;
  at: string;
  title: string;
  detail?: string | null;
}

interface TimelineDisplayProps {
  filteredTimeline: TimelineEntry[];
}

const TimelineDisplay: React.FC<TimelineDisplayProps> = ({ filteredTimeline }) => {
  if (filteredTimeline.length === 0) {
    return <p className="text-sm text-text-muted">Sem eventos neste filtro.</p>;
  }

  return (
    <div className="mt-6">
      <h4 className="font-medium text-text-main mb-3 flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        Trilha de auditoria
      </h4>

      <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
        {filteredTimeline.map((e, idx) => (
          <div
            key={`${e.at}-${idx}`}
            className="flex gap-3 p-3 rounded-lg border border-surface-border bg-surface-muted/30"
          >
            <time dateTime={e.at} className="text-xs text-text-muted whitespace-nowrap">
              {new Date(e.at).toLocaleString('pt-BR')}
            </time>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-text-main truncate">{e.title}</p>
              {e.detail && <p className="text-xs text-text-muted mt-0.5 break-words">{e.detail}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TimelineDisplay;
