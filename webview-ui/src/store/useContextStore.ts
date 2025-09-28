import { create } from 'zustand';
import { type ContextEntry } from '@/types/context';

interface ContextState {
  entries: ContextEntry[];
  lastAddedEntry: ContextEntry | null;
  setMentionCount: (uri: string, count: number) => void;
  setEntries: (entries: ContextEntry[]) => void;
  clearLastAddedEntry: () => void;
}

export const useContextStore = create<ContextState>((set, get) => ({
  entries: [],
  lastAddedEntry: null,
  setEntries: (entries) => {
    const normalizedEntries = entries.map((entry) =>
      entry.kind === 'file'
        ? { ...entry, mentionCount: entry.mentionCount ?? 0 }
        : entry,
    );
    const previousIds = new Set(get().entries.map((entry) => entry.id));
    const addedEntry = normalizedEntries.find((entry) => !previousIds.has(entry.id)) ?? null;
    set({ entries: normalizedEntries, lastAddedEntry: addedEntry });
  },
  setMentionCount: () => {},
  clearLastAddedEntry: () => {
    if (get().lastAddedEntry) {
      set({ lastAddedEntry: null });
    }
  },
}));
