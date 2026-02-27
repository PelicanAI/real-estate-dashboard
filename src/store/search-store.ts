import { create } from 'zustand';
import type { SavedSearch, ScrapeStatus } from '@/types';

interface SearchState {
  // Data
  savedSearches: SavedSearch[];
  scrapeStatus: Record<string, ScrapeStatus>;

  // Status
  loading: boolean;
  error: string | null;

  // Actions
  fetchSavedSearches: () => Promise<void>;
  createSavedSearch: (data: Omit<SavedSearch, 'id' | 'lastRun' | 'result_count' | 'createdAt' | 'updatedAt'>) => Promise<SavedSearch | null>;
  toggleActive: (id: string) => Promise<void>;
  triggerSearch: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  // ── Initial state ──────────────────────────────────────────────
  savedSearches: [],
  scrapeStatus: {},
  loading: false,
  error: null,

  // ── Actions ────────────────────────────────────────────────────

  fetchSavedSearches: async () => {
    set({ loading: true, error: null });

    try {
      const res = await fetch('/api/saved-searches');

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'Failed to fetch saved searches');
      }

      const data = await res.json();

      set({
        savedSearches: Array.isArray(data) ? data : data.data ?? [],
        loading: false,
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  },

  createSavedSearch: async (data) => {
    set({ loading: true, error: null });

    try {
      const res = await fetch('/api/saved-searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'Failed to create saved search');
      }

      const search: SavedSearch = await res.json();

      set((state) => ({
        savedSearches: [search, ...state.savedSearches],
        loading: false,
      }));

      return search;
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      return null;
    }
  },

  toggleActive: async (id: string) => {
    const search = get().savedSearches.find((s) => s.id === id);
    if (!search) return;

    // Optimistic update
    set((state) => ({
      savedSearches: state.savedSearches.map((s) =>
        s.id === id ? { ...s, is_active: !s.is_active } : s
      ),
      error: null,
    }));

    try {
      const res = await fetch(`/api/saved-searches/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !search.is_active }),
      });

      if (!res.ok) {
        // Revert on failure
        set((state) => ({
          savedSearches: state.savedSearches.map((s) =>
            s.id === id ? { ...s, is_active: search.is_active } : s
          ),
        }));
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'Failed to toggle saved search');
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  },

  triggerSearch: async (id: string) => {
    set((state) => ({
      scrapeStatus: { ...state.scrapeStatus, [id]: 'running' as ScrapeStatus },
      error: null,
    }));

    try {
      const res = await fetch(`/api/saved-searches/${id}/trigger`, {
        method: 'POST',
      });

      if (!res.ok) {
        set((state) => ({
          scrapeStatus: { ...state.scrapeStatus, [id]: 'failed' as ScrapeStatus },
        }));
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'Failed to trigger search');
      }

      const result = await res.json();

      set((state) => ({
        scrapeStatus: { ...state.scrapeStatus, [id]: 'completed' as ScrapeStatus },
        savedSearches: state.savedSearches.map((s) =>
          s.id === id
            ? {
                ...s,
                lastRun: new Date().toISOString(),
                result_count: result.result_count ?? s.result_count,
              }
            : s
        ),
      }));
    } catch (err) {
      set((state) => ({
        scrapeStatus: { ...state.scrapeStatus, [id]: 'failed' as ScrapeStatus },
        error: err instanceof Error ? err.message : 'Unknown error',
      }));
    }
  },

  clearError: () => set({ error: null }),
}));
