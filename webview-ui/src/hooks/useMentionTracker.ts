import { useCallback, useEffect, useRef } from 'react';
import { useContextStore } from '@/store/useContextStore';
import { type ContextEntryFile } from '@/types/context';

interface MentionTrackerOptions {
  getContent: () => string;
}

const MENTION_REGEX = /@\{([^}]+)\}/g;

export const useMentionTracker = ({ getContent }: MentionTrackerOptions) => {
  const entriesRef = useRef<ContextEntryFile[]>([]);
  const entries = useContextStore((state) => state.entries);
  const prevCountsRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    entriesRef.current = entries.filter(
      (entry): entry is ContextEntryFile => entry.kind === 'file',
    );
  }, [entries]);

  const syncMentionCounts = useCallback(() => {
    const content = getContent();
    const mentionMatches = Array.from(content.matchAll(MENTION_REGEX));
    const buckets = new Map<string, number>();

    mentionMatches.forEach((match) => {
      const relativePath = match[1];
      if (!relativePath) {
        return;
      }
      buckets.set(relativePath, (buckets.get(relativePath) ?? 0) + 1);
    });

    const nextCounts = new Map<string, number>();

    entriesRef.current.forEach((entry) => {
      const count = buckets.get(entry.relativePath) ?? 0;
      const prevCount = prevCountsRef.current.get(entry.uri) ?? entry.mentionCount ?? 0;
      nextCounts.set(entry.uri, count);

      if (count === 0 && prevCount > 0) {
        window.vscode.postMessage({
          type: 'context:remove',
          data: { uri: entry.uri },
        });
      }
    });

    prevCountsRef.current = nextCounts;
  }, []);

  return {
    syncMentionCounts,
  };
};
