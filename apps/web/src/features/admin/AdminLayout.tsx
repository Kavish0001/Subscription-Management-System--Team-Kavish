import { Link, Outlet } from 'react-router-dom';

import {
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
  const { user, logout } = useSession();
  const userLabel = user?.name?.trim() || user?.email || 'Unknown user';
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
      subtitle="External user space"
      navigation={navigation}
      toolbar={
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3 lg:justify-end">
          <div className="app-pill inline-flex min-w-0 items-center gap-3 rounded-full px-4 py-2 text-sm">
            <ReceiptIcon className="h-4 w-4 shrink-0" />
            <span className="max-w-[160px] truncate sm:max-w-none">{userLabel}</span>
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
      }
    >
      <Outlet />
    </Shell>
  );
}
