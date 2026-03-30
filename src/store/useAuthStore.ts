import { create } from 'zustand';
import { auth, db } from '../lib/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

type Role = 'admin' | 'player' | 'guest';

interface AuthState {
  user: FirebaseUser | null;
  userRole: Role | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  initAuthListener: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  userRole: null,
  loading: true,

  initAuthListener: () => {
    onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const docRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(docRef);
        let role: Role = 'guest';
        if (docSnap.exists()) {
          role = docSnap.data().role as Role;
        }
        set({ user: currentUser, userRole: role, loading: false });
      } else {
        set({ user: null, userRole: null, loading: false });
      }
    });
  },

  login: async (email, pass) => {
    await signInWithEmailAndPassword(auth, email, pass);
  },

  register: async (email, pass, displayName) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(userCredential.user, { displayName });

    // Per default creiamo un utente giocatore nel DB Firestore. L'admin deve essere impostato manualmente via console DB per sicurezza.
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      email,
      displayName,
      role: 'player',
      createdAt: new Date().toISOString()
    });
  },

  logout: async () => {
    await signOut(auth);
  }
}));
