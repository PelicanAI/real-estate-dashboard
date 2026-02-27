import { create } from 'zustand';
import type { Notification, NotificationType } from '@/types';

interface UIState {
  // State
  sidebarOpen: boolean;
  activePage: string;
  notifications: Notification[];

  // Actions
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setActivePage: (page: string) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => string;
  dismissNotification: (id: string) => void;
  clearNotifications: () => void;
}

let notificationCounter = 0;

export const useUIStore = create<UIState>((set) => ({
  // ── Initial state ──────────────────────────────────────────────
  sidebarOpen: true,
  activePage: 'dashboard',
  notifications: [],

  // ── Actions ────────────────────────────────────────────────────

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setActivePage: (page) => set({ activePage: page }),

  addNotification: (notification) => {
    const id = `notification-${++notificationCounter}-${Date.now()}`;
    const entry: Notification = {
      ...notification,
      id,
      createdAt: Date.now(),
    };

    set((state) => ({
      notifications: [...state.notifications, entry],
    }));

    // Auto-dismiss after duration (default 5 seconds)
    if (notification.duration !== 0) {
      const timeout = notification.duration ?? 5000;
      setTimeout(() => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      }, timeout);
    }

    return id;
  },

  dismissNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  clearNotifications: () => set({ notifications: [] }),
}));

// ── Convenience helpers ────────────────────────────────────────────

export const notify = {
  success: (title: string, message?: string) =>
    useUIStore.getState().addNotification({ type: 'success' as NotificationType, title, message }),
  error: (title: string, message?: string) =>
    useUIStore.getState().addNotification({ type: 'error' as NotificationType, title, message, duration: 8000 }),
  warning: (title: string, message?: string) =>
    useUIStore.getState().addNotification({ type: 'warning' as NotificationType, title, message }),
  info: (title: string, message?: string) =>
    useUIStore.getState().addNotification({ type: 'info' as NotificationType, title, message }),
};
