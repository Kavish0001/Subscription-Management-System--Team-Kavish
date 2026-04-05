import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

import { AuthLayout } from '@/layouts/AuthLayout';
import { PortalLayout } from '@/layouts/PortalLayout';
import { AdminLayout } from '@/layouts/AdminLayout';

import { LoginPage } from '@/features/auth/LoginPage';
import { SignupPage } from '@/features/auth/SignupPage';
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage';

import { HomePage } from '@/features/portal/HomePage';
import { ShopPage } from '@/features/portal/ShopPage';
import { ProductDetailPage } from '@/features/portal/ProductDetailPage';
import { CartPage } from '@/features/portal/CartPage';
import { CheckoutAddressPage } from '@/features/portal/CheckoutAddressPage';
import { CheckoutPaymentPage } from '@/features/portal/CheckoutPaymentPage';
import { CheckoutSuccessPage } from '@/features/portal/CheckoutSuccessPage';
import { OrdersListPage } from '@/features/portal/OrdersListPage';
import { OrderDetailPage } from '@/features/portal/OrderDetailPage';
import { InvoiceDetailPage } from '@/features/portal/InvoiceDetailPage';
import { ProfilePage } from '@/features/portal/ProfilePage';

import { DashboardPage } from '@/features/admin/DashboardPage';
import { SubscriptionsListPage } from '@/features/admin/SubscriptionsListPage';
import { SubscriptionFormPage } from '@/features/admin/SubscriptionFormPage';
import { ProductsListPage } from '@/features/admin/ProductsListPage';
import { ProductFormPage } from '@/features/admin/ProductFormPage';
import { UsersListPage } from '@/features/admin/UsersListPage';
import { UserFormPage } from '@/features/admin/UserFormPage';
import { ReportsPage } from '@/features/admin/ReportsPage';
import { AttributesPage } from '@/features/admin/config/AttributesPage';
import { RecurringPlansPage } from '@/features/admin/config/RecurringPlansPage';
import { QuotationTemplatesPage } from '@/features/admin/config/QuotationTemplatesPage';
import { DiscountsPage } from '@/features/admin/config/DiscountsPage';
import { TaxesPage } from '@/features/admin/config/TaxesPage';
import { PaymentTermsPage } from '@/features/admin/config/PaymentTermsPage';

function PortalGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Auth */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      {/* Portal */}
      <Route element={<PortalLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/products/:slug" element={<ProductDetailPage />} />
        <Route path="/cart" element={<PortalGuard><CartPage /></PortalGuard>} />
        <Route path="/checkout/address" element={<PortalGuard><CheckoutAddressPage /></PortalGuard>} />
        <Route path="/checkout/payment" element={<PortalGuard><CheckoutPaymentPage /></PortalGuard>} />
        <Route path="/checkout/success" element={<PortalGuard><CheckoutSuccessPage /></PortalGuard>} />
        <Route path="/account/orders" element={<PortalGuard><OrdersListPage /></PortalGuard>} />
        <Route path="/account/orders/:orderNumber" element={<PortalGuard><OrderDetailPage /></PortalGuard>} />
        <Route path="/account/invoices/:invoiceId" element={<PortalGuard><InvoiceDetailPage /></PortalGuard>} />
        <Route path="/account/profile" element={<PortalGuard><ProfilePage /></PortalGuard>} />
      </Route>

      {/* Admin */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="subscriptions" element={<SubscriptionsListPage />} />
        <Route path="subscriptions/new" element={<SubscriptionFormPage />} />
        <Route path="subscriptions/:id" element={<SubscriptionFormPage />} />
        <Route path="products" element={<ProductsListPage />} />
        <Route path="products/new" element={<ProductFormPage />} />
        <Route path="products/:id" element={<ProductFormPage />} />
        <Route path="users" element={<UsersListPage />} />
        <Route path="users/:id" element={<UserFormPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="config/attributes" element={<AttributesPage />} />
        <Route path="config/recurring-plans" element={<RecurringPlansPage />} />
        <Route path="config/quotation-templates" element={<QuotationTemplatesPage />} />
        <Route path="config/discounts" element={<DiscountsPage />} />
        <Route path="config/taxes" element={<TaxesPage />} />
        <Route path="config/payment-terms" element={<PaymentTermsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
