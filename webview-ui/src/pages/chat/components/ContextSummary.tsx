import React from 'react';
import { X } from 'lucide-react';
import { useContextStore } from '@/store/useContextStore';

const truncateLabel = (label: string, maxLength = 80) => {
  if (label.length <= maxLength) {
    return label;
  }
  return `${label.slice(0, maxLength - 3)}...`;
};

export const ContextSummary: React.FC = () => {
  const entries = useContextStore((state) => state.entries);

  if (entries.length === 0) {
    return null;
  }

  const handleRemove = (uri: string) => {
    window.vscode.postMessage({
      type: 'context:remove',
      data: { uri },
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs text-muted-foreground">上下文文件</div>
      <div className="flex flex-wrap gap-2">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center gap-2 rounded border border-border bg-muted/40 px-2 py-1 text-xs text-muted-foreground"
          >
            <div className="flex flex-col">
              <span
                className="max-w-[220px] truncate"
                title={entry.relativePath}
              >
                {truncateLabel(entry.relativePath)}
              </span>
              {entry.truncated && (
                <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-orange-500">
                  <span>截断</span>
                </div>
              )}
            </div>
            <button
              type="button"
              className="flex h-5 w-5 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => handleRemove(entry.uri)}
              aria-label="移除文件"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
