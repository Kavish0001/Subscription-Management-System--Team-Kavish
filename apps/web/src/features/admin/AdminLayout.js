import { jsx as _jsx } from "react/jsx-runtime";
import { Outlet } from 'react-router-dom';
import { Shell } from '../../components/layout';
const navigation = [
    { label: 'Dashboard', to: '/admin' },
    { label: 'Subscriptions', to: '/admin/subscriptions' },
    { label: 'Products', to: '/admin/products' },
    { label: 'Recurring Plans', to: '/admin/recurring-plans' },
    { label: 'Discounts', to: '/admin/discounts' },
    { label: 'Reports', to: '/admin/reports' }
];
export function AdminLayout() {
    return (_jsx(Shell, { title: "Backoffice", subtitle: "Admin and internal operations", navigation: navigation, children: _jsx(Outlet, {}) }));
}
