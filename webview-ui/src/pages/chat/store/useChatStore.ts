import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import localforage from 'localforage';

interface ChatStore {
  messages: Message[];
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updater: Partial<Message> | ((message: Message) => Partial<Message>)) => void;
  clearMessages: () => void;
}

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: number;
  reasoning?: string;
  status?: 'streaming' | 'complete';
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      messages: [],
      addMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),
      updateMessage: (id, updater) =>
        set((state) => ({
          messages: state.messages.map((message) => {
            if (message.id !== id) {
              return message;
            }

            const patch =
              typeof updater === 'function' ? updater(message) : updater;

            return { ...message, ...patch };
          }),
        })),
      clearMessages: () => set({ messages: [] }),
    }),
    {
      name: 'chat-storage',
      storage: createJSONStorage(() => localforage),
    },
  ),
);
