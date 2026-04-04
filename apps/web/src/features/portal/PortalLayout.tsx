import { Link, Outlet } from 'react-router-dom';

import { Shell } from '../../components/layout';
import { useCartStore } from '../../lib/cart';
import { useSession } from '../../lib/session';

const navigation = [
  { label: 'Home', to: '/' },
  { label: 'Shop', to: '/shop' },
  { label: 'Cart', to: '/cart' },
  { label: 'My Account', to: '/account/profile' },
  { label: 'My Orders', to: '/account/orders' }
];

export function PortalLayout() {
  const { isAuthenticated, logout, user } = useSession();
  const itemCount = useCartStore((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));

  return (
    <Shell
      title="Customer Portal"
      subtitle="Subscription storefront"
      navigation={navigation.map((item) =>
        item.to === '/cart' ? { ...item, label: `Cart (${itemCount})` } : item
      )}
      toolbar={
        isAuthenticated ? (
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-slate-200">
              {user?.email}
            </div>
            {user?.role !== 'portal_user' ? (
              <Link
                className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-semibold text-white"
                to="/admin"
              >
                Backoffice
              </Link>
            ) : null}
            <button
              className="rounded-full bg-gradient-to-r from-amber-300 to-rose-500 px-4 py-2 text-sm font-semibold text-slate-950"
              onClick={() => void logout()}
              type="button"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
            <Link className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-semibold text-white" to="/login">
              Login
            </Link>
            <Link
              className="rounded-full bg-gradient-to-r from-emerald-300 to-sky-400 px-4 py-2 text-sm font-semibold text-slate-950"
              to="/signup"
            >
              Sign up
            </Link>
          </div>
        )
      }
    >
      <Outlet />
    </Shell>
  );
}
