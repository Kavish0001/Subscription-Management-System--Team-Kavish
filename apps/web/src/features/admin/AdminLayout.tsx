import { Link, Outlet, useNavigate } from 'react-router-dom';

import {
  BarChartIcon,
  CalendarRepeatIcon,
  CubeIcon,
  GridIcon,
  ReceiptIcon,
  RefreshCycleIcon,
  TagPercentIcon,
  PercentIcon
} from '../../components/icons';
import { Shell } from '../../components/layout';
import { useSession } from '../../lib/session';

const navigation = [
  { label: 'Dashboard', to: '/admin', icon: GridIcon, detail: 'KPIs, alerts, and recent activity' },
  { label: 'Subscriptions', to: '/admin/subscriptions', icon: RefreshCycleIcon, detail: 'Lifecycle and renewal controls' },
  { label: 'Products', to: '/admin/products', icon: CubeIcon, detail: 'Catalog and sellable items' },
  { label: 'Recurring Plans', to: '/admin/recurring-plans', icon: CalendarRepeatIcon, detail: 'Billing cadence and pricing' },
  { label: 'Taxes', to: '/admin/taxes', icon: PercentIcon, detail: 'Accounting rules and rates' },
  { label: 'Discounts', to: '/admin/discounts', icon: TagPercentIcon, detail: 'Promotions and policy rules' },
  { label: 'Reports', to: '/admin/reports', icon: BarChartIcon, detail: 'Revenue and invoice visibility' }
];

export function AdminLayout() {
  const navigate = useNavigate();
  const { user, logout } = useSession();

  return (
    <Shell
      title="Backoffice"
      subtitle="Modular recurring revenue control"
      navigation={navigation}
      toolbar={
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="app-select min-w-[220px]"
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) {
                navigate(event.target.value);
              }
            }}
          >
            <option value="">Jump to module</option>
            <option value="/admin/subscriptions">Subscriptions</option>
            <option value="/admin/products">Products</option>
            <option value="/admin/recurring-plans">Recurring Plans</option>
            <option value="/admin/taxes">Taxes</option>
            <option value="/admin/discounts">Discounts</option>
            <option value="/admin/reports">Reports</option>
          </select>
          <div className="app-pill inline-flex items-center gap-3 rounded-full px-4 py-2 text-sm">
            <ReceiptIcon className="h-4 w-4" />
            <span>{user?.email ?? 'Unknown user'}</span>
          </div>
          <Link className="app-btn app-btn-secondary" to="/">
            Portal
          </Link>
          <button
            className="app-btn app-btn-primary"
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
