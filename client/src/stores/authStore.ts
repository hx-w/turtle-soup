import { create } from 'zustand';
import { api, setTokens, clearTokens, getRefreshToken } from '../lib/api';
import { connectSocket, disconnectSocket } from '../lib/socket';
import type { User, AuthResponse } from '../types';

function saveUser(user: User) {
  localStorage.setItem('user', JSON.stringify(user));
}

function loadUser(): User | null {
  const str = localStorage.getItem('user');
  if (!str) return null;
  try {
    return JSON.parse(str) as User;
  } catch {
    return null;
  }
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;

  login: (nickname: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (nickname: string, password: string, inviteCode: string) => Promise<void>;
  logout: () => void;
  loadFromStorage: () => void;
  refresh: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoading: true,

  login: async (nickname: string, password: string, rememberMe = false) => {
    const data = await api.post<AuthResponse>('/auth/login', { nickname, password, rememberMe });
    setTokens(data.accessToken, data.refreshToken);
    saveUser(data.user);
    set({
      user: data.user,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    });
    connectSocket();
  },

  register: async (nickname: string, password: string, inviteCode: string) => {
    const data = await api.post<AuthResponse>('/auth/register', {
      nickname,
      password,
      inviteCode,
    });
    setTokens(data.accessToken, data.refreshToken);
    saveUser(data.user);
    set({
      user: data.user,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    });
    connectSocket();
  },

  logout: () => {
    clearTokens();
    disconnectSocket();
    set({ user: null, accessToken: null, refreshToken: null });
  },

  loadFromStorage: () => {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const user = loadUser();

    if (accessToken && refreshToken && user) {
      set({ user, accessToken, refreshToken, isLoading: false });
      connectSocket();
    } else {
      set({ isLoading: false });
    }
  },

  refresh: async () => {
    const currentRefresh = get().refreshToken || getRefreshToken();
    if (!currentRefresh) return;

    try {
      const data = await api.post<{ accessToken: string; refreshToken: string }>(
        '/auth/refresh',
        { refreshToken: currentRefresh },
      );
      setTokens(data.accessToken, data.refreshToken);
      set({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    } catch {
      get().logout();
    }
  },
}));
