import { create } from 'zustand';
import type { Deal, DealStage, DealStats } from '@/types';

interface DealState {
  // Data
  deals: Deal[];
  dealStats: DealStats | null;

  // Status
  loading: boolean;
  statsLoading: boolean;
  error: string | null;

  // Actions
  fetchDeals: (stageFilter?: DealStage) => Promise<void>;
  createDeal: (propertyId: string) => Promise<Deal | null>;
  updateDeal: (id: string, data: Partial<Deal>) => Promise<Deal | null>;
  updateDealStage: (id: string, newStage: DealStage) => Promise<void>;
  fetchStats: () => Promise<void>;
  clearError: () => void;
}

export const useDealStore = create<DealState>((set, get) => ({
  // ── Initial state ──────────────────────────────────────────────
  deals: [],
  dealStats: null,
  loading: false,
  statsLoading: false,
  error: null,

  // ── Actions ────────────────────────────────────────────────────

  fetchDeals: async (stageFilter?: DealStage) => {
    set({ loading: true, error: null });

    try {
      const params = new URLSearchParams();
      if (stageFilter) params.set('stage', stageFilter);

      const res = await fetch(`/api/deals?${params.toString()}`);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'Failed to fetch deals');
      }

      const data = await res.json();

      set({
        deals: Array.isArray(data) ? data : data.data ?? [],
        loading: false,
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  },

  createDeal: async (propertyId: string) => {
    set({ loading: true, error: null });

    try {
      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'Failed to create deal');
      }

      const deal: Deal = await res.json();

      set((state) => ({
        deals: [deal, ...state.deals],
        loading: false,
      }));

      return deal;
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      return null;
    }
  },

  updateDeal: async (id: string, data: Partial<Deal>) => {
    set({ error: null });

    try {
      const res = await fetch(`/api/deals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'Failed to update deal');
      }

      const updated: Deal = await res.json();

      set((state) => ({
        deals: state.deals.map((d) => (d.id === id ? updated : d)),
      }));

      return updated;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      return null;
    }
  },

  updateDealStage: async (id: string, newStage: DealStage) => {
    // Optimistic update
    const previousDeals = get().deals;
    set((state) => ({
      deals: state.deals.map((d) =>
        d.id === id ? { ...d, stage: newStage, updatedAt: new Date().toISOString() } : d
      ),
      error: null,
    }));

    try {
      const res = await fetch(`/api/deals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      });

      if (!res.ok) {
        // Revert on failure
        set({ deals: previousDeals });
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'Failed to update deal stage');
      }

      const updated: Deal = await res.json();

      set((state) => ({
        deals: state.deals.map((d) => (d.id === id ? updated : d)),
      }));
    } catch (err) {
      // Revert optimistic update on network error
      set({
        deals: previousDeals,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  },

  fetchStats: async () => {
    set({ statsLoading: true, error: null });

    try {
      const res = await fetch('/api/deals/stats');

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'Failed to fetch deal stats');
      }

      const stats: DealStats = await res.json();

      set({ dealStats: stats, statsLoading: false });
    } catch (err) {
      set({
        statsLoading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  },

  clearError: () => set({ error: null }),
}));
