import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User { id: string; email: string; role: 'admin' | 'internal_user' | 'portal_user'; }

interface AuthState {
  user: User | null;
  accessToken: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  isAdmin: () => boolean;
  isInternal: () => boolean;
  isPortal: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      login: (user, accessToken) => {
        localStorage.setItem('accessToken', accessToken);
        set({ user, accessToken });
      },
      logout: () => {
        localStorage.removeItem('accessToken');
        set({ user: null, accessToken: null });
      },
      isAdmin: () => get().user?.role === 'admin',
      isInternal: () => get().user?.role === 'internal_user',
      isPortal: () => get().user?.role === 'portal_user',
    }),
    { name: 'auth-storage', partialize: (s) => ({ user: s.user }) }
  )
);
