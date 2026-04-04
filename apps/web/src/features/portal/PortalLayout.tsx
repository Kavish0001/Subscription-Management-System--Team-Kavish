import { Link, Outlet } from 'react-router-dom';

import { CreditCardIcon, CubeIcon, HomeIcon, ReceiptIcon, UsersIcon } from '../../components/icons';
import { Shell } from '../../components/layout';
import { useCartStore } from '../../lib/cart';
import { useSession } from '../../lib/session';

const baseNavigation = [
  { label: 'Home', to: '/', icon: HomeIcon, detail: 'Overview and next steps' },
  { label: 'Shop', to: '/shop', icon: CubeIcon, detail: 'Subscription-enabled catalog' },
  { label: 'Cart', to: '/cart', icon: CreditCardIcon, detail: 'Checkout staging area' },
  { label: 'My Account', to: '/account/profile', icon: UsersIcon, detail: 'Profile and contact data' },
  { label: 'My Orders', to: '/account/orders', icon: ReceiptIcon, detail: 'Subscriptions and invoices' }
];

export function PortalLayout() {
  const { isAuthenticated, logout, user } = useSession();
  const itemCount = useCartStore((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));

  return (
    <Shell
      title="Customer Portal"
      subtitle="Subscription storefront"
      navigation={baseNavigation.map((item) =>
        item.to === '/cart' ? { ...item, label: `Cart (${itemCount})` } : item
      )}
      toolbar={
        isAuthenticated ? (
          <div className="flex flex-wrap items-center gap-3">
            <div className="app-pill inline-flex items-center rounded-full px-4 py-2 text-sm">
              {user?.email}
            </div>
            {user?.role !== 'portal_user' ? (
              <Link className="app-btn app-btn-secondary" to="/admin">
                Backoffice
              </Link>
            ) : null}
            <button
              className="app-btn app-btn-primary"
              onClick={() => void logout()}
              type="button"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
            <Link className="app-btn app-btn-secondary" to="/login">
              Login
            </Link>
            <Link className="app-btn app-btn-primary" to="/signup">
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
