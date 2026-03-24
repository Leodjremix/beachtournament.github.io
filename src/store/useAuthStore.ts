import { create } from 'zustand';
import type { User } from 'firebase/auth';

interface AuthState {
  user: User | null;
  userRole: 'admin' | 'guest' | null;
  setUser: (user: User | null, role?: 'admin' | 'guest') => void;
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  userRole: null, // Si assume che il ruolo venga fetchato da Firestore e impostato qui
  isLoading: true,
  setUser: (user, role = 'guest') => set({ user, userRole: role }),
  setLoading: (isLoading) => set({ isLoading }),
}));
