import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';

import {
  CreditCardIcon,
  CubeIcon,
  HomeIcon,
  LogOutIcon,
  MenuIcon,
  UsersIcon,
  XIcon
} from '../../components/icons';
import { useCartStore } from '../../lib/cart';
import { useSession } from '../../lib/session';
import { cn } from '../../lib/ui';

export function PortalLayout() {
  const location = useLocation();
  const { isAuthenticated, logout, user } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const itemCount = useCartStore((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));

  const navigation = [
    { label: 'Home', to: '/', end: true, icon: HomeIcon },
    { label: 'Shop', to: '/shop', icon: CubeIcon },
    {
      label: 'My Account',
      to: isAuthenticated ? '/account/profile' : '/login',
      icon: UsersIcon
    }
  ];

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_24%),radial-gradient(circle_at_top_right,rgba(34,197,94,0.16),transparent_20%),linear-gradient(180deg,#f8fff9_0%,#f4f7f5_100%)] text-slate-950">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col px-4 pb-10 pt-4 sm:px-6 lg:px-10">
        <header className="sticky top-4 z-40 rounded-[28px] border border-emerald-900/10 bg-white/90 px-4 py-3 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex items-center gap-3">
            <Link className="flex shrink-0 items-center gap-3 rounded-full border border-emerald-900/10 bg-white px-3 py-2" to="/">
              <img alt="Veltrix logo" className="h-9 w-9 rounded-full object-contain" src="/veltrix-logo.png" />
              <div className="hidden sm:block">
                <p className="text-sm font-semibold tracking-[-0.03em]">Veltrix</p>
                <p className="text-xs text-slate-500">External user space</p>
              </div>
            </Link>

            <nav className="hidden min-w-0 flex-1 items-center gap-2 lg:flex">
              {navigation.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    className={({ isActive }) =>
                      cn(
                        'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition',
                        isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                      )
                    }
                    end={item.end}
                    key={item.to}
                    to={item.to}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>

            <div className="ml-auto hidden items-center gap-2 lg:flex">
              {isAuthenticated ? (
                <>
                  <Link className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50" to="/cart">
                    <CreditCardIcon className="h-4 w-4" />
                    Cart{itemCount ? ` (${itemCount})` : ''}
                  </Link>
                  <Link className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50" to="/account/profile">
                    <UsersIcon className="h-4 w-4" />
                    My profile
                  </Link>
                  {user?.role !== 'portal_user' ? (
                    <Link className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50" to="/admin">
                      <HomeIcon className="h-4 w-4" />
                      Backoffice
                    </Link>
                  ) : null}
                  <button
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                    onClick={() => void logout()}
                    type="button"
                  >
                    <LogOutIcon className="h-4 w-4" />
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50" to="/login">
                    Login
                  </Link>
                  <Link className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700" to="/signup">
                    Sign up
                  </Link>
                </>
              )}
            </div>

            <button
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              className="grid h-11 w-11 place-items-center rounded-full border border-slate-200 text-slate-700 lg:hidden"
              onClick={() => setMenuOpen((value) => !value)}
              type="button"
            >
              {menuOpen ? <XIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
            </button>
          </div>

          {menuOpen ? (
            <div className="mt-4 grid gap-2 border-t border-slate-200 pt-4 lg:hidden">
              {navigation.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    className={({ isActive }) =>
                      cn(
                        'inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition',
                        isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                      )
                    }
                    end={item.end}
                    key={item.to}
                    to={item.to}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                );
              })}

              {isAuthenticated ? (
                <>
                  <Link className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100" to="/cart">
                    <CreditCardIcon className="h-4 w-4" />
                    Cart{itemCount ? ` (${itemCount})` : ''}
                  </Link>
                  <Link className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100" to="/account/profile">
                    <UsersIcon className="h-4 w-4" />
                    My profile
                  </Link>
                  {user?.role !== 'portal_user' ? (
                    <Link className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100" to="/admin">
                      <HomeIcon className="h-4 w-4" />
                      Backoffice
                    </Link>
                  ) : null}
                  <button
                    className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white"
                    onClick={() => void logout()}
                    type="button"
                  >
                    <LogOutIcon className="h-4 w-4" />
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100" to="/login">
                    Login
                  </Link>
                  <Link className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white" to="/signup">
                    Sign up
                  </Link>
                </>
              )}
            </div>
          ) : null}
        </header>

        <main className="flex-1 pt-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
