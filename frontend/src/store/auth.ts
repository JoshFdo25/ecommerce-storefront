import { create } from 'zustand';

interface User {
  id: string;
  role: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  setAuth: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  setAuth: (user) => set({ isAuthenticated: !!user, user }),
  logout: () => set({ isAuthenticated: false, user: null }),
}));
