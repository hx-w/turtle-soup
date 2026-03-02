import { create } from 'zustand';

export interface Toast {
  id: string;
  message: string;
  type: 'error' | 'success' | 'info';
}

interface ToastState {
  toasts: Toast[];
  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;
}

let nextId = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, type = 'error') => {
    const id = String(++nextId);
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 3000);
  },
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));

/** Convenience function for use outside React components */
export const toast = {
  error: (message: string) => useToastStore.getState().addToast(message, 'error'),
  success: (message: string) => useToastStore.getState().addToast(message, 'success'),
  info: (message: string) => useToastStore.getState().addToast(message, 'info'),
};
