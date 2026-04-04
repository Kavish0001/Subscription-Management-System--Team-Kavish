import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { apiRequest, normalizeSessionUser, type SessionUser } from './api';

const storageKey = 'subflow-session';

type StoredSession = {
  token: string;
  user: SessionUser;
};

type SessionContextValue = {
  ready: boolean;
  token: string | null;
  user: SessionUser | null;
  isAuthenticated: boolean;
  login: (input: { email: string; password: string }) => Promise<SessionUser>;
  signup: (input: { name: string; email: string; password: string }) => Promise<SessionUser>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function persistSession(value: StoredSession | null) {
  if (!value) {
    window.localStorage.removeItem(storageKey);
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(value));
}

function readStoredSession() {
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    window.localStorage.removeItem(storageKey);
    return null;
  }
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    const stored = readStoredSession();

    if (!stored) {
      setReady(true);
      return;
    }

    setToken(stored.token);
    setUser(stored.user);
    setReady(true);
  }, []);

  const clearSession = async () => {
    persistSession(null);
    setToken(null);
    setUser(null);

    try {
      await apiRequest('/auth/logout', {
        method: 'POST'
      });
    } catch {
      // Logout should still clear local session if the API call fails.
    }
  };

  const storeSession = (nextToken: string, nextUser: SessionUser) => {
    const next = { token: nextToken, user: nextUser };
    persistSession(next);
    setToken(nextToken);
    setUser(nextUser);
  };

  const refreshSession = async () => {
    if (!token) {
      return;
    }

    try {
      const me = await apiRequest<{ userId: string; email: string; role: SessionUser['role'] }>(
        '/auth/me',
        { token }
      );
      const normalizedUser = normalizeSessionUser(me);
      storeSession(token, normalizedUser);
    } catch {
      await clearSession();
    }
  };

  const value = useMemo<SessionContextValue>(
    () => ({
      ready,
      token,
      user,
      isAuthenticated: Boolean(token && user),
      login: async (input) => {
        const result = await apiRequest<{ accessToken: string; user: SessionUser }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify(input)
        });
        storeSession(result.accessToken, normalizeSessionUser(result.user));
        return normalizeSessionUser(result.user);
      },
      signup: async (input) => {
        const result = await apiRequest<{ accessToken: string; user: SessionUser }>('/auth/signup', {
          method: 'POST',
          body: JSON.stringify(input)
        });
        storeSession(result.accessToken, normalizeSessionUser(result.user));
        return normalizeSessionUser(result.user);
      },
      logout: clearSession,
      refreshSession
    }),
    [ready, token, user]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }

  return context;
}

export function RequireAuth({ roles }: { roles?: SessionUser['role'][] }) {
  const location = useLocation();
  const session = useSession();

  if (!session.ready) {
    return <div className="grid min-h-screen place-items-center bg-slate-950 text-slate-200">Loading session...</div>;
  }

  if (!session.isAuthenticated || !session.user) {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />;
  }

  if (roles && !roles.includes(session.user.role)) {
    return <Navigate replace to={session.user.role === 'portal_user' ? '/' : '/admin'} />;
  }

  return <Outlet />;
}

export function RequireGuest() {
  const session = useSession();

  if (!session.ready) {
    return <div className="grid min-h-screen place-items-center bg-slate-950 text-slate-200">Loading session...</div>;
  }

  if (session.isAuthenticated && session.user) {
    return <Navigate replace to={session.user.role === 'portal_user' ? '/' : '/admin'} />;
  }

  return <Outlet />;
}
