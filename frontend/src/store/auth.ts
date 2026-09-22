import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { apiClient } from '../lib/api';

interface User {
  id: string;
  role: string;
  avatarUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  setAuth: (user: User | null) => void;
  updateUser: (data: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      setAuth: (user) => set({ isAuthenticated: !!user, user }),
      updateUser: (data) => set((state) => ({ user: state.user ? { ...state.user, ...data } : null })),
      logout: async () => {
        try {
          await apiClient.post('/auth/logout');
        } catch (error) {
          console.error('Logout failed on backend:', error);
        } finally {
          set({ isAuthenticated: false, user: null });
        }
      },
    }),
    {
      name: 'auth-storage', // unique name
      storage: createJSONStorage(() => localStorage), 
    }
  )
);
