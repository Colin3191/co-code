import { useEffect } from 'react';
import { useContextStore } from '@/store/useContextStore';
import { type ContextEntry } from '@/types/context';

type ContextMessage =
  | {
      type: 'context:update';
      data: {
        entries: ContextEntry[];
      };
    }
  | {
      type: 'context:entryRemoved';
      data: {
        uri: string;
      };
    };

export const useContextBridge = () => {
  const setEntries = useContextStore((state) => state.setEntries);
  const setMentionCount = useContextStore((state) => state.setMentionCount);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<ContextMessage>) => {
      if (!event.data) {
        return;
      }

      if (event.data.type === 'context:update') {
        setEntries((event.data.data.entries ?? []).map((entry) => ({
          ...entry,
          mentionCount: entry.mentionCount ?? 0,
        })));
        return;
      }

      if (event.data.type === 'context:entryRemoved') {
        setMentionCount(event.data.data.uri, 0);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [setEntries, setMentionCount]);
};
