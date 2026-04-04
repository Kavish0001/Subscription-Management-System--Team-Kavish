import { createBrowserRouter } from 'react-router-dom';

import { AdminLayout } from '../features/admin/AdminLayout';
import { DashboardPage } from '../features/admin/DashboardPage';
import { ResourceListPage } from '../features/admin/ResourceListPage';
import { SubscriptionFormPage } from '../features/admin/SubscriptionFormPage';
import { LoginPage } from '../features/auth/LoginPage';
import { ResetPasswordPage } from '../features/auth/ResetPasswordPage';
import { SignupPage } from '../features/auth/SignupPage';
import { PortalLayout } from '../features/portal/PortalLayout';
import {
  CartPage,
  CheckoutAddressPage,
  CheckoutPaymentPage,
  CheckoutSuccessPage,
  HomePage,
  InvoiceDetailPage,
  OrderDetailPage,
  OrdersPage,
  ProductPage,
  ProfilePage,
  ShopPage
} from '../features/portal/PortalPages';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PortalLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'shop', element: <ShopPage /> },
      { path: 'products/:slug', element: <ProductPage /> },
      { path: 'cart', element: <CartPage /> },
      { path: 'checkout/address', element: <CheckoutAddressPage /> },
      { path: 'checkout/payment', element: <CheckoutPaymentPage /> },
      { path: 'checkout/success', element: <CheckoutSuccessPage /> },
      { path: 'account/profile', element: <ProfilePage /> },
      { path: 'account/orders', element: <OrdersPage /> },
      { path: 'account/orders/:orderNumber', element: <OrderDetailPage /> },
      { path: 'account/invoices/:invoiceNumber', element: <InvoiceDetailPage /> }
    ]
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      {
        path: 'subscriptions',
        element: (
          <ResourceListPage
            title="Subscriptions"
            description="Draft, quotation, confirmed, and active subscriptions."
          />
        )
      },
      { path: 'subscriptions/new', element: <SubscriptionFormPage /> },
      {
        path: 'products',
        element: (
          <ResourceListPage
            title="Products"
            description="Catalog records, variants, and subscription-enabled products."
          />
        )
      },
      {
        path: 'recurring-plans',
        element: (
          <ResourceListPage
            title="Recurring Plans"
            description="Billing cadence, minimum quantity, and auto-close policy."
          />
        )
      },
      {
        path: 'discounts',
        element: (
          <ResourceListPage
            title="Discounts"
            description="Admin-only discount rules and usage limits."
          />
        )
      },
      {
        path: 'reports',
        element: (
          <ResourceListPage
            title="Reports"
            description="Revenue, active subscriptions, and overdue invoices."
          />
        )
      }
    ]
  }
]);
