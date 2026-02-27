import { create } from 'zustand';
import type {
  Property,
  SearchParams,
  PaginatedResponse,
} from '@/types';

interface PropertyState {
  // Data
  properties: Property[];
  filters: SearchParams;

  // Pagination
  page: number;
  totalPages: number;
  totalCount: number;

  // Status
  loading: boolean;
  error: string | null;

  // Actions
  fetchProperties: (filters?: SearchParams) => Promise<void>;
  addProperty: (data: Partial<Property>) => Promise<Property | null>;
  setFilters: (filters: Partial<SearchParams>) => void;
  setPage: (page: number) => void;
  clearError: () => void;
}

export const usePropertyStore = create<PropertyState>((set, get) => ({
  // ── Initial state ──────────────────────────────────────────────
  properties: [],
  filters: {},
  page: 1,
  totalPages: 1,
  totalCount: 0,
  loading: false,
  error: null,

  // ── Actions ────────────────────────────────────────────────────

  fetchProperties: async (filters?: SearchParams) => {
    const currentFilters = filters ?? get().filters;
    const page = get().page;

    set({ loading: true, error: null });

    try {
      const params = new URLSearchParams();
      params.set('page', String(page));

      if (currentFilters.city) params.set('city', currentFilters.city);
      if (currentFilters.state) params.set('state', currentFilters.state);
      if (currentFilters.zip) params.set('zip', currentFilters.zip);
      if (currentFilters.source) params.set('source', currentFilters.source);
      if (currentFilters.minEquity) {
        params.set('minEquity', String(currentFilters.minEquity));
      }
      if (currentFilters.distressTypes?.length) {
        params.set('distressTypes', currentFilters.distressTypes.join(','));
      }
      if (currentFilters.minPrice) {
        params.set('minPrice', String(currentFilters.minPrice));
      }
      if (currentFilters.maxPrice) {
        params.set('maxPrice', String(currentFilters.maxPrice));
      }

      const res = await fetch(`/api/properties?${params.toString()}`);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'Failed to fetch properties');
      }

      const data: PaginatedResponse<Property> = await res.json();

      set({
        properties: data.data,
        page: data.page,
        totalPages: data.totalPages,
        totalCount: data.count,
        loading: false,
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  },

  addProperty: async (data) => {
    set({ loading: true, error: null });

    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'Failed to add property');
      }

      const property: Property = await res.json();

      set((state) => ({
        properties: [property, ...state.properties],
        totalCount: state.totalCount + 1,
        loading: false,
      }));

      return property;
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      return null;
    }
  },

  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
      page: 1, // reset to first page on filter change
    }));
  },

  setPage: (page) => set({ page }),

  clearError: () => set({ error: null }),
}));
