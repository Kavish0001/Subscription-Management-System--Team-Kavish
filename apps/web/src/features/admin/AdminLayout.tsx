import { Link, Outlet, useNavigate } from 'react-router-dom';

import {
  ChevronDownIcon,
  BarChartIcon,
  CubeIcon,
  GridIcon,
  HomeIcon,
  LogOutIcon,
  FolderStackIcon,
  ReceiptIcon,
  RefreshCycleIcon,
  UsersIcon
} from '../../components/icons';
import { Shell } from '../../components/layout';
import { useSession } from '../../lib/session';

export function AdminLayout() {
  const navigate = useNavigate();
  const { user, logout } = useSession();
  const configurationItems = [
    { label: 'Attribute', to: '/admin/attributes' },
    { label: 'Recurring Plan', to: '/admin/recurring-plans' },
    { label: 'Quotation Template', to: '/admin/quotation-templates' },
    { label: 'Payment Term', to: '/admin/payment-terms' },
    { label: 'Discount', to: '/admin/discounts' },
    { label: 'Taxes', to: '/admin/taxes' }
  ];
  const navigation = [
    { label: 'Dashboard', to: '/admin', icon: GridIcon, detail: 'KPIs and activity', end: true },
    { label: 'Subscriptions', to: '/admin/subscriptions', icon: RefreshCycleIcon, detail: 'Lifecycle controls' },
    ...(user?.role === 'admin' ? [{ label: 'Products', to: '/admin/products', icon: CubeIcon, detail: 'Catalog items' }] : []),
    ...(user?.role === 'admin'
      ? [{ label: 'Configuration', to: '/admin/attributes', icon: FolderStackIcon, detail: 'Setup masters', children: configurationItems }]
      : []),
    { label: 'Reports', to: '/admin/reports', icon: BarChartIcon, detail: 'Revenue visibility' },
    ...(user?.role === 'admin'
      ? [
          { label: 'People', to: '/admin/users', icon: UsersIcon, detail: 'Users and contact records' }
        ]
      : [])
  ];

  return (
    <Shell
      title="Backoffice"
      subtitle="Modular recurring revenue control"
      navigation={navigation}
      toolbar={
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3 lg:justify-end">
          <div className="relative min-w-0 flex-1 basis-[240px] lg:max-w-[320px] lg:flex-none">
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
              {user?.role === 'admin' ? <option value="/admin/products">Products</option> : null}
              {user?.role === 'admin' ? <option value="/admin/attributes">Attribute</option> : null}
              {user?.role === 'admin' ? <option value="/admin/recurring-plans">Recurring Plan</option> : null}
              {user?.role === 'admin' ? <option value="/admin/quotation-templates">Quotation Template</option> : null}
              {user?.role === 'admin' ? <option value="/admin/payment-terms">Payment Term</option> : null}
              {user?.role === 'admin' ? <option value="/admin/discounts">Discount</option> : null}
              {user?.role === 'admin' ? <option value="/admin/taxes">Taxes</option> : null}
              <option value="/admin/reports">Reports</option>
              {user?.role === 'admin' ? <option value="/admin/users">People</option> : null}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="app-pill inline-flex items-center gap-3 rounded-full px-4 py-2 text-sm">
              <ReceiptIcon className="h-4 w-4" />
              <span className="max-w-[120px] truncate sm:max-w-none">{user?.email ?? 'Unknown user'}</span>
            </div>
            <Link className="app-btn app-btn-secondary" to="/">
              <HomeIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Portal</span>
            </Link>
            <button
              className="app-btn app-btn-primary"
              onClick={() => void logout()}
              type="button"
            >
              <LogOutIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      }
    >
      <Outlet />
    </Shell>
  );
}
