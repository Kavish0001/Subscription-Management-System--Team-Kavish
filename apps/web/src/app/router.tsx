import { createBrowserRouter, Navigate } from 'react-router-dom';

import { AdminLayout } from '../features/admin/AdminLayout';
import { DashboardPage } from '../features/admin/DashboardPage';
import { ProductFormPage, ProductListPage } from '../features/admin/ProductPages';
import { ReportsPage } from '../features/admin/ReportsPage';
import { ResourceListPage } from '../features/admin/ResourceListPage';
import { SubscriptionFormPage } from '../features/admin/SubscriptionFormPage';
import { TaxListPage } from '../features/admin/TaxListPage';
import { UsersPage } from '../features/admin/UsersPage';
import { LoginPage } from '../features/auth/LoginPage';
import { ResetPasswordPage } from '../features/auth/ResetPasswordPage';
import { SignupPage } from '../features/auth/SignupPage';
import { VerifyOtpPage } from '../features/auth/VerifyOtpPage';
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
  SubscriptionPreviewPage,
  ShopPage
} from '../features/portal/PortalPages';
import { RequireAuth, RequireGuest } from '../lib/session';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PortalLayout />,
    children: [
      { index: true, element: <HomePage /> },
      {
        element: <RequireAuth />,
        children: [
          { path: 'shop', element: <ShopPage /> },
          { path: 'products/:slug', element: <ProductPage /> },
          { path: 'cart', element: <CartPage /> },
          { path: 'checkout/address', element: <CheckoutAddressPage /> },
          { path: 'checkout/payment', element: <CheckoutPaymentPage /> },
          { path: 'checkout/success', element: <CheckoutSuccessPage /> },
          { path: 'preview/subscriptions/:id', element: <SubscriptionPreviewPage /> },
          { path: 'account/profile', element: <ProfilePage /> },
          { path: 'account/orders', element: <OrdersPage /> },
          { path: 'account/orders/:id', element: <OrderDetailPage /> },
          { path: 'account/invoices/:id', element: <InvoiceDetailPage /> }
        ]
      }
    ]
  },
  {
    element: <RequireGuest />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/signup', element: <SignupPage /> },
      { path: '/verify-otp', element: <VerifyOtpPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> }
    ]
  },
  {
    path: '/admin',
    element: <RequireAuth roles={['admin', 'internal_user']} />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          {
            path: 'subscriptions',
            element: (
              <ResourceListPage
                description="Draft, quotation, confirmed, live, and closed subscriptions."
                resource="subscriptions"
                title="Subscriptions"
              />
            )
          },
          { path: 'subscriptions/new', element: <SubscriptionFormPage /> },
          {
            path: 'products',
            element: <RequireAuth roles={['admin']}><ProductListPage /></RequireAuth>
          },
          { path: 'products/new', element: <RequireAuth roles={['admin']}><ProductFormPage mode="create" /></RequireAuth> },
          { path: 'products/:id', element: <RequireAuth roles={['admin']}><ProductFormPage mode="view" /></RequireAuth> },
          { path: 'products/:id/edit', element: <RequireAuth roles={['admin']}><ProductFormPage mode="edit" /></RequireAuth> },
          {
            path: 'recurring-plans',
            element: (
              <ResourceListPage
                description="Billing cadence, minimum quantity, and auto-close policy."
                resource="recurring-plans"
                title="Recurring Plans"
              />
            )
          },
          { path: 'taxes', element: <TaxListPage /> },
          {
            path: 'discounts',
            element: (
              <ResourceListPage
                description="Admin-only discount rules and usage limits."
                resource="discounts"
                title="Discounts"
              />
            )
          },
          { path: 'reports', element: <ReportsPage /> },
          {
            path: 'users',
            element: <RequireAuth roles={['admin']}><UsersPage /></RequireAuth>
          },
          { path: '*', element: <Navigate replace to="/admin" /> }
        ]
      }
    ]
  },
  { path: '*', element: <Navigate replace to="/" /> }
]);
