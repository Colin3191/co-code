import { create } from 'zustand';

export type TabType = 'chat' | 'settings';

interface TabState {
  currentTab: TabType;
  setCurrentTab: (tab: TabType) => void;
}

export const useTabStore = create<TabState>((set) => ({
  currentTab: 'chat',
  setCurrentTab: (tab) => set({ currentTab: tab }),
}));
