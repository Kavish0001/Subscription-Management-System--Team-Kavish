import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { ApiError, apiRequest, normalizeSessionUser, type SessionUser } from './api';
import { activateGuestCart, activateUserCart, clearPendingSignupCartTransfer } from './cart';

type SessionContextValue = {
  ready: boolean;
  token: string | null;
  user: SessionUser | null;
  isAuthenticated: boolean;
  login: (input: { email: string; password: string }) => Promise<SessionUser>;
  signup: (input: {
    name: string;
    email: string;
    password: string;
  }) => Promise<{ message: string }>;
  verifyOtp: (input: { email: string; otp: string }) => Promise<SessionUser>;
  resendOtp: (input: { email: string }) => Promise<{ message: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: Readonly<PropsWithChildren>) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);

  const clearSession = async () => {
    try {
      await apiRequest('/auth/logout', {
        method: 'POST',
      });
    } catch {
      // Local session should still be cleared if logout fails.
    }

    clearPendingSignupCartTransfer();
    await activateGuestCart({ clearGuestCart: true });
    setUser(null);
  };

  const refreshSession = async () => {
    try {
      const me = await apiRequest<{
        user: {
          userId: string;
          email: string;
          name: string | null;
          role: SessionUser['role'];
        } | null;
        canRefresh: boolean;
      }>('/auth/me');

      if (me.user) {
        const nextUser = normalizeSessionUser(me.user);
        await activateUserCart(nextUser.id);
        setUser(nextUser);
        return;
      }

      if (!me.canRefresh) {
        await activateGuestCart();
        setUser(null);
        return;
      }

      const refreshed = await apiRequest<{ user: SessionUser | null }>('/auth/refresh', {
        method: 'POST',
      });

      if (refreshed.user) {
        const nextUser = normalizeSessionUser(refreshed.user);
        await activateUserCart(nextUser.id);
        setUser(nextUser);
        return;
      }

      await activateGuestCart();
      setUser(null);
    } catch (error) {
      await activateGuestCart();
      setUser(null);

      if (error instanceof ApiError && error.status >= 500) {
        throw error;
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
          body: JSON.stringify(input),
        });
        const nextUser = normalizeSessionUser(result.user);
        clearPendingSignupCartTransfer();
        await activateUserCart(nextUser.id);
        setUser(nextUser);
        return nextUser;
      },
      signup: async (input) => {
        return apiRequest<{ message: string }>('/auth/signup', {
          method: 'POST',
          body: JSON.stringify(input),
        });
      },
      verifyOtp: async (input) => {
        const result = await apiRequest<{ user: SessionUser }>('/auth/verify-otp', {
          method: 'POST',
          body: JSON.stringify(input),
        });
        const nextUser = normalizeSessionUser(result.user);
        await activateUserCart(nextUser.id, { transferPendingSignupCart: true });
        setUser(nextUser);
        return nextUser;
      },
      resendOtp: async (input) => {
        return apiRequest<{ message: string }>('/auth/resend-otp', {
          method: 'POST',
          body: JSON.stringify(input),
        });
      },
      logout: clearSession,
      refreshSession,
    }),
    [ready, user],
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

export function RequireAuth({
  roles,
  children,
}: Readonly<PropsWithChildren<{ readonly roles?: SessionUser['role'][] }>>) {
  const location = useLocation();
  const session = useSession();

  if (!session.ready) {
    return <div className="app-loading-screen">Loading session...</div>;
  }

  if (!session.isAuthenticated || !session.user) {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />;
  }

  if (roles && !roles.includes(session.user.role)) {
    return <Navigate replace to={session.user.role === 'portal_user' ? '/' : '/admin'} />;
  }

  return children ? <>{children}</> : <Outlet />;
}

export function RequireGuest() {
  const session = useSession();

  if (!session.ready) {
    return <div className="app-loading-screen">Loading session...</div>;
  }

  if (session.isAuthenticated && session.user) {
    return <Navigate replace to={session.user.role === 'portal_user' ? '/' : '/admin'} />;
  }

  return <Outlet />;
}
