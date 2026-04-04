import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { AlertTriangleIcon, FolderStackIcon, ReceiptIcon, WalletIcon } from '../../components/icons';
import { MetricCard, StatusBadge, Surface } from '../../components/layout';
import {
  apiRequest,
  formatCurrency,
  formatDate,
  type DashboardMetrics,
  type Invoice,
  type PaginatedResponse,
  type Subscription
} from '../../lib/api';
import { useSession } from '../../lib/session';

export function DashboardPage() {
  const { token } = useSession();

  const metricsQuery = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => apiRequest<DashboardMetrics>('/reports/dashboard', { token })
  });

  const subscriptionsQuery = useQuery({
    queryKey: ['admin-dashboard-subscriptions'],
    queryFn: () =>
      apiRequest<PaginatedResponse<Subscription>>('/subscriptions?page=1&pageSize=5', { token })
  });

  const invoicesQuery = useQuery({
    queryKey: ['admin-dashboard-invoices'],
    queryFn: () => apiRequest<PaginatedResponse<Invoice>>('/invoices?page=1&pageSize=5', { token })
  });

  const metrics = metricsQuery.data;
  const recentSubscriptions = subscriptionsQuery.data?.items ?? [];
  const recentInvoices = invoicesQuery.data?.items ?? [];

  return (
    <>
      <MetricCard
        detail="Confirmed subscriptions whose start date has gone live."
        icon={<FolderStackIcon className="h-6 w-6" />}
        label="Live subscriptions"
        value={String(metrics?.activeSubscriptions ?? 0)}
      />
      <MetricCard
        detail="Sum of paid invoices."
        icon={<WalletIcon className="h-6 w-6" />}
        label="Revenue"
        value={formatCurrency(metrics?.revenue ?? 0)}
      />
      <MetricCard
        detail="Draft or confirmed invoices past due date."
        icon={<AlertTriangleIcon className="h-6 w-6" />}
        label="Overdue invoices"
        value={String(metrics?.overdueInvoices ?? 0)}
      />
      <Surface
        actions={
          <Link className="app-btn app-btn-primary" to="/admin/subscriptions/new">
            <FolderStackIcon className="h-4 w-4" />
            New subscription
          </Link>
        }
        title="Recent activity"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="app-card p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[color:var(--color-text-primary)]">
              <FolderStackIcon className="h-4 w-4 text-[color:var(--color-primary-strong)]" />
              <p>Recent subscriptions</p>
            </div>
            <div className="grid gap-3">
              {recentSubscriptions.map((subscription) => (
                <div className="app-soft-panel px-4 py-3" key={subscription.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[color:var(--color-text-primary)]">
                        {subscription.subscriptionNumber}
                      </p>
                      <p className="text-sm muted">{subscription.customerContact.name}</p>
                    </div>
                    <StatusBadge status={subscription.status} />
                  </div>
                  <p className="mt-2 text-sm muted">
                    {formatDate(subscription.createdAt)} | {formatCurrency(subscription.totalAmount)}
                  </p>
                </div>
              ))}
              {recentSubscriptions.length === 0 ? (
                <p className="text-sm muted">No subscriptions yet.</p>
              ) : null}
            </div>
          </div>

          <div className="app-card p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[color:var(--color-text-primary)]">
              <ReceiptIcon className="h-4 w-4 text-[color:var(--color-primary-strong)]" />
              <p>Recent invoices</p>
            </div>
            <div className="grid gap-3">
              {recentInvoices.map((invoice) => (
                <div className="app-soft-panel px-4 py-3" key={invoice.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[color:var(--color-text-primary)]">
                        {invoice.invoiceNumber}
                      </p>
                      <p className="text-sm muted">
                        {invoice.subscriptionOrder?.subscriptionNumber ?? 'Subscription'}
                      </p>
                    </div>
                    <StatusBadge status={invoice.status} />
                  </div>
                  <p className="mt-2 text-sm muted">
                    Due {formatDate(invoice.dueDate)} | {formatCurrency(invoice.totalAmount)}
                  </p>
                </div>
              ))}
              {recentInvoices.length === 0 ? (
                <p className="text-sm muted">No invoices generated yet.</p>
              ) : null}
            </div>
          </div>
        </div>
      </Surface>
    </>
  );
}
