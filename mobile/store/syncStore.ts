import { create } from 'zustand';
import { SyncQueueItem, SyncAction } from '../types';
import { generateId } from '../utils';

interface SyncStore {
  queue: SyncQueueItem[];
  isSyncing: boolean;
  lastSync: string | null;
  addToQueue: (action: SyncAction) => void;
  removeFromQueue: (id: string) => void;
  updateItem: (id: string, updates: Partial<SyncQueueItem>) => void;
  setIsSyncing: (v: boolean) => void;
  setLastSync: (ts: string) => void;
  clearSynced: () => void;
}

export const useSyncStore = create<SyncStore>((set) => ({
  queue: [],
  isSyncing: false,
  lastSync: null,

  addToQueue: (action) => {
    const item: SyncQueueItem = {
      ...action,
      id: generateId(),
      created_at: new Date().toISOString(),
      status: 'pending',
      retries: 0,
    };
    set((s) => ({ queue: [...s.queue, item] }));
  },

  removeFromQueue: (id) =>
    set((s) => ({ queue: s.queue.filter((q) => q.id !== id) })),

  updateItem: (id, updates) =>
    set((s) => ({
      queue: s.queue.map((q) => (q.id === id ? { ...q, ...updates } : q)),
    })),

  setIsSyncing: (v) => set({ isSyncing: v }),

  setLastSync: (ts) => set({ lastSync: ts }),

  clearSynced: () =>
    set((s) => ({
      queue: s.queue.filter((q) => q.status !== 'completed' && q.retries < 3),
    })),
}));
