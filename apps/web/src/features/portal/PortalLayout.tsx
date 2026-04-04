import { Outlet } from 'react-router-dom';

import { Shell } from '../../components/layout';

const navigation = [
  { label: 'Home', to: '/' },
  { label: 'Shop', to: '/shop' },
  { label: 'Cart', to: '/cart' },
  { label: 'My Profile', to: '/account/profile' },
  { label: 'My Orders', to: '/account/orders' }
];

export function PortalLayout() {
  return (
    <Shell title="Customer Portal" subtitle="Subscription storefront" navigation={navigation}>
      <Outlet />
    </Shell>
  );
}
