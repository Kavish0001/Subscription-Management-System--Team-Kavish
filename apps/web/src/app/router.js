import { jsx as _jsx } from "react/jsx-runtime";
import { createBrowserRouter } from 'react-router-dom';
import { AdminLayout } from '../features/admin/AdminLayout';
import { DashboardPage } from '../features/admin/DashboardPage';
import { ResourceListPage } from '../features/admin/ResourceListPage';
import { SubscriptionFormPage } from '../features/admin/SubscriptionFormPage';
import { LoginPage } from '../features/auth/LoginPage';
import { ResetPasswordPage } from '../features/auth/ResetPasswordPage';
import { SignupPage } from '../features/auth/SignupPage';
import { CartPage, CheckoutAddressPage, CheckoutPaymentPage, CheckoutSuccessPage, HomePage, InvoiceDetailPage, OrderDetailPage, OrdersPage, ProductPage, ProfilePage, ShopPage } from '../features/portal/PortalPages';
import { PortalLayout } from '../features/portal/PortalLayout';
export const router = createBrowserRouter([
    {
        path: '/',
        element: _jsx(PortalLayout, {}),
        children: [
            { index: true, element: _jsx(HomePage, {}) },
            { path: 'shop', element: _jsx(ShopPage, {}) },
            { path: 'products/:slug', element: _jsx(ProductPage, {}) },
            { path: 'cart', element: _jsx(CartPage, {}) },
            { path: 'checkout/address', element: _jsx(CheckoutAddressPage, {}) },
            { path: 'checkout/payment', element: _jsx(CheckoutPaymentPage, {}) },
            { path: 'checkout/success', element: _jsx(CheckoutSuccessPage, {}) },
            { path: 'account/profile', element: _jsx(ProfilePage, {}) },
            { path: 'account/orders', element: _jsx(OrdersPage, {}) },
            { path: 'account/orders/:orderNumber', element: _jsx(OrderDetailPage, {}) },
            { path: 'account/invoices/:invoiceNumber', element: _jsx(InvoiceDetailPage, {}) }
        ]
    },
    { path: '/login', element: _jsx(LoginPage, {}) },
    { path: '/signup', element: _jsx(SignupPage, {}) },
    { path: '/reset-password', element: _jsx(ResetPasswordPage, {}) },
    {
        path: '/admin',
        element: _jsx(AdminLayout, {}),
        children: [
            { index: true, element: _jsx(DashboardPage, {}) },
            {
                path: 'subscriptions',
                element: (_jsx(ResourceListPage, { title: "Subscriptions", description: "Draft, quotation, confirmed, and active subscriptions." }))
            },
            { path: 'subscriptions/new', element: _jsx(SubscriptionFormPage, {}) },
            {
                path: 'products',
                element: (_jsx(ResourceListPage, { title: "Products", description: "Catalog records, variants, and subscription-enabled products." }))
            },
            {
                path: 'recurring-plans',
                element: (_jsx(ResourceListPage, { title: "Recurring Plans", description: "Billing cadence, minimum quantity, and auto-close policy." }))
            },
            {
                path: 'discounts',
                element: (_jsx(ResourceListPage, { title: "Discounts", description: "Admin-only discount rules and usage limits." }))
            },
            {
                path: 'reports',
                element: (_jsx(ResourceListPage, { title: "Reports", description: "Revenue, active subscriptions, and overdue invoices." }))
            }
        ]
    }
]);
