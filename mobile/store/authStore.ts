import { create } from 'zustand';
import { User } from '../types';
import { authService } from '../services/authService';

interface AuthStore {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const token = await authService.getToken();
      if (!token) {
        set({ isAuthenticated: false, user: null, token: null, isLoading: false });
        return;
      }
      const user = await authService.me();
      set({ token, user, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      if (error?.response?.status === 401) {
        await authService.logout();
        set({ isAuthenticated: false, user: null, token: null, isLoading: false });
      } else {
        const token = await authService.getToken();
        if (token) {
          const cachedUser = await authService.getCachedUser();
          set({ token, user: cachedUser, isAuthenticated: true, isLoading: false });
        } else {
          set({ isAuthenticated: false, user: null, token: null, isLoading: false });
        }
      }
    }
  },

  login: async (username, password) => {
    const { token, user } = await authService.login({ username, password });
    set({ token, user, isAuthenticated: true });
  },

  logout: async () => {
    await authService.logout();
    set({ token: null, user: null, isAuthenticated: false });
  },

  setUser: (user) => set({ user }),
}));
