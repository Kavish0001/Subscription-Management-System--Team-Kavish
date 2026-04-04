import { createBrowserRouter, Navigate } from 'react-router-dom';

import { AdminLayout } from '../features/admin/AdminLayout';
import { DiscountListPage, RecurringPlanListPage } from '../features/admin/BillingConfigPages';
import { AttributeListPage, PaymentTermListPage, QuotationTemplateListPage } from '../features/admin/ConfigurationPages';
import { ContactDetailPage } from '../features/admin/ContactPages';
import { DashboardPage } from '../features/admin/DashboardPage';
import { PeoplePage } from '../features/admin/PeoplePage';
import { ProductFormPage, ProductListPage } from '../features/admin/ProductPages';
import { ReportsPage } from '../features/admin/ReportsPage';
import { ResourceListPage } from '../features/admin/ResourceListPage';
import { SubscriptionFormPage } from '../features/admin/SubscriptionFormPage';
import { TaxListPage } from '../features/admin/TaxListPage';
import { UserDetailPage } from '../features/admin/UsersPage';
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
      { path: 'shop', element: <ShopPage /> },
      { path: 'products/:slug', element: <ProductPage /> },
      { path: 'cart', element: <CartPage /> },
      {
        element: <RequireAuth />,
        children: [
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
            element: <RequireAuth roles={['admin']}><RecurringPlanListPage /></RequireAuth>
          },
          { path: 'attributes', element: <RequireAuth roles={['admin']}><AttributeListPage /></RequireAuth> },
          { path: 'quotation-templates', element: <RequireAuth roles={['admin']}><QuotationTemplateListPage /></RequireAuth> },
          { path: 'payment-terms', element: <RequireAuth roles={['admin']}><PaymentTermListPage /></RequireAuth> },
          { path: 'taxes', element: <RequireAuth roles={['admin']}><TaxListPage /></RequireAuth> },
          {
            path: 'discounts',
            element: <RequireAuth roles={['admin']}><DiscountListPage /></RequireAuth>
          },
          { path: 'reports', element: <ReportsPage /> },
          {
            path: 'users',
            element: <RequireAuth roles={['admin']}><PeoplePage /></RequireAuth>
          },
          { path: 'users/:id', element: <RequireAuth roles={['admin']}><UserDetailPage /></RequireAuth> },
          { path: 'contacts', element: <Navigate replace to="/admin/users" /> },
          { path: 'contacts/:id', element: <RequireAuth roles={['admin']}><ContactDetailPage /></RequireAuth> },
          { path: '*', element: <Navigate replace to="/admin" /> }
        ]
      }
    ]
  },
  { path: '*', element: <Navigate replace to="/" /> }
]);
