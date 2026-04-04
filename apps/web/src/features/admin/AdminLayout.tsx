import { Link, Outlet, useNavigate } from 'react-router-dom';

import { Shell } from '../../components/layout';
import { useSession } from '../../lib/session';

const navigation = [
  { label: 'Dashboard', to: '/admin' },
  { label: 'Subscriptions', to: '/admin/subscriptions' },
  { label: 'Products', to: '/admin/products' },
  { label: 'Recurring Plans', to: '/admin/recurring-plans' },
  { label: 'Taxes', to: '/admin/taxes' },
  { label: 'Discounts', to: '/admin/discounts' },
  { label: 'Reports', to: '/admin/reports' }
];

export function AdminLayout() {
  const navigate = useNavigate();
  const { user, logout } = useSession();

  return (
    <Shell
      title="Backoffice"
      subtitle="Admin and internal operations"
      navigation={navigation}
      toolbar={
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="rounded-full border border-white/10 bg-slate-950/60 px-4 py-2 text-sm text-slate-200"
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) {
                navigate(event.target.value);
              }
            }}
          >
            <option value="">Configuration</option>
            <option value="/admin/subscriptions">Subscriptions</option>
            <option value="/admin/products">Products</option>
            <option value="/admin/recurring-plans">Recurring Plans</option>
            <option value="/admin/taxes">Taxes</option>
            <option value="/admin/discounts">Discounts</option>
            <option value="/admin/reports">Reports</option>
          </select>
          <div className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-slate-200">
            {user?.email ?? 'Unknown user'}
          </div>
          <Link
            className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-semibold text-white"
            to="/"
          >
            Portal
          </Link>
          <button
            className="rounded-full bg-gradient-to-r from-amber-300 to-rose-500 px-4 py-2 text-sm font-semibold text-slate-950"
            onClick={() => void logout()}
            type="button"
          >
            Logout
          </button>
        </div>
      }
    >
      <Outlet />
    </Shell>
  );
}
