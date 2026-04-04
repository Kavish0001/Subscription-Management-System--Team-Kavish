import { Link, Outlet, useNavigate } from 'react-router-dom';

import {
  ChevronDownIcon,
  BarChartIcon,
  CalendarRepeatIcon,
  CubeIcon,
  GridIcon,
  HomeIcon,
  LogOutIcon,
  FolderStackIcon,
  ReceiptIcon,
  RefreshCycleIcon,
  TagPercentIcon,
  PercentIcon,
  UsersIcon
} from '../../components/icons';
import { Shell } from '../../components/layout';
import { useSession } from '../../lib/session';

export function AdminLayout() {
  const navigate = useNavigate();
  const { user, logout } = useSession();
  const navigation = [
    { label: 'Dashboard', to: '/admin', icon: GridIcon, detail: 'KPIs and activity', end: true },
    { label: 'Subscriptions', to: '/admin/subscriptions', icon: RefreshCycleIcon, detail: 'Lifecycle controls' },
    { label: 'Products', to: '/admin/products', icon: CubeIcon, detail: 'Catalog items' },
    { label: 'Recurring Plans', to: '/admin/recurring-plans', icon: CalendarRepeatIcon, detail: 'Cadence and pricing' },
    { label: 'Taxes', to: '/admin/taxes', icon: PercentIcon, detail: 'Rates and rules' },
    { label: 'Discounts', to: '/admin/discounts', icon: TagPercentIcon, detail: 'Promo rules' },
    { label: 'Reports', to: '/admin/reports', icon: BarChartIcon, detail: 'Revenue visibility' },
    ...(user?.role === 'admin'
      ? [{ label: 'Users', to: '/admin/users', icon: UsersIcon, detail: 'Staff access control' }]
      : [])
  ];

  return (
    <Shell
      title="Backoffice"
      subtitle="Modular recurring revenue control"
      navigation={navigation}
      toolbar={
        <div className="flex min-w-0 flex-wrap items-center gap-3 lg:justify-end">
          <div className="relative min-w-0 flex-1 basis-[260px] lg:max-w-[360px] lg:flex-none">
            <FolderStackIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--color-text-muted)]" />
            <ChevronDownIcon className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--color-text-muted)]" />
            <select
              className="app-select min-w-0 appearance-none pl-11 pr-11"
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
              {user?.role === 'admin' ? <option value="/admin/users">Users</option> : null}
            </select>
          </div>
          <div className="app-pill inline-flex items-center gap-3 rounded-full px-4 py-2 text-sm">
            <ReceiptIcon className="h-4 w-4" />
            <span className="truncate">{user?.email ?? 'Unknown user'}</span>
          </div>
          <Link className="app-btn app-btn-secondary" to="/">
            <HomeIcon className="h-4 w-4" />
            Portal
          </Link>
          <button
            className="app-btn app-btn-primary"
            onClick={() => void logout()}
            type="button"
          >
            <LogOutIcon className="h-4 w-4" />
            Logout
          </button>
        </div>
      }
    >
      <Outlet />
    </Shell>
  );
}
