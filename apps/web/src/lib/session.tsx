import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { ApiError, apiRequest, normalizeSessionUser, type SessionUser } from './api';

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

export function SessionProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);

  const clearSession = async () => {
    setUser(null);

    try {
      await apiRequest('/auth/logout', {
        method: 'POST'
      });
    } catch {
      // Local session should still be cleared if logout fails.
    }
  };

  const refreshSession = async () => {
    try {
      const me = await apiRequest<{ userId: string; email: string; role: SessionUser['role'] }>(
        '/auth/me'
      );
      setUser(normalizeSessionUser(me));
    } catch (meError) {
      try {
        const refreshed = await apiRequest<{ user: SessionUser }>('/auth/refresh', {
          method: 'POST'
        });
        setUser(normalizeSessionUser(refreshed.user));
      } catch {
        setUser(null);

        if (meError instanceof ApiError && meError.status >= 500) {
          throw meError;
        }
      }
    } finally {
      setReady(true);
    }
  };

  useEffect(() => {
    void refreshSession();
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      ready,
      token: null,
      user,
      isAuthenticated: Boolean(user),
      login: async (input) => {
        const result = await apiRequest<{ user: SessionUser }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify(input)
        });
        const nextUser = normalizeSessionUser(result.user);
        setUser(nextUser);
        return nextUser;
      },
      signup: async (input) => {
        const result = await apiRequest<{ user: SessionUser }>('/auth/signup', {
          method: 'POST',
          body: JSON.stringify(input)
        });
        const nextUser = normalizeSessionUser(result.user);
        setUser(nextUser);
        return nextUser;
      },
      logout: clearSession,
      refreshSession
    }),
    [ready, user]
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
