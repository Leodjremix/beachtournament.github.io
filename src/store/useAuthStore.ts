import { create } from 'zustand';
import type { User } from 'firebase/auth';

export type UserRole = 'admin' | 'guest' | 'player';

interface AuthState {
  user: User | null;
  userRole: UserRole | null;
  setUser: (user: User | null, role?: UserRole) => void;
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
