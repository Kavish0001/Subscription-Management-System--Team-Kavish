import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { AlertTriangleIcon, FolderStackIcon, ReceiptIcon, WalletIcon } from '../../components/icons';
import { MetricCard, Surface } from '../../components/layout';
import { apiRequest, formatCurrency, formatDate, type DashboardMetrics, type Invoice, type PaginatedResponse, type Subscription } from '../../lib/api';
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
        detail="Moved from confirmed checkout to active status."
        icon={<FolderStackIcon className="h-6 w-6" />}
        label="Active subscriptions"
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
          <Link
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 to-rose-500 px-4 py-2 text-sm font-semibold text-slate-950"
            to="/admin/subscriptions/new"
          >
            <FolderStackIcon className="h-4 w-4" />
            New subscription
          </Link>
        }
        title="Recent activity"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[24px] border border-white/10 bg-slate-950/35 p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
              <FolderStackIcon className="h-4 w-4 text-cyan-300" />
              <p>Recent subscriptions</p>
            </div>
            <div className="grid gap-3">
              {recentSubscriptions.map((subscription) => (
                <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3" key={subscription.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{subscription.subscriptionNumber}</p>
                      <p className="text-sm text-slate-300">{subscription.customerContact.name}</p>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-amber-300">
                      {subscription.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">
                    {formatDate(subscription.createdAt)} • {formatCurrency(subscription.totalAmount)}
                  </p>
                </div>
              ))}
              {recentSubscriptions.length === 0 ? (
                <p className="text-sm text-slate-400">No subscriptions yet.</p>
              ) : null}
            </div>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-slate-950/35 p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
              <ReceiptIcon className="h-4 w-4 text-cyan-300" />
              <p>Recent invoices</p>
            </div>
            <div className="grid gap-3">
              {recentInvoices.map((invoice) => (
                <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3" key={invoice.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{invoice.invoiceNumber}</p>
                      <p className="text-sm text-slate-300">{invoice.subscriptionOrder?.subscriptionNumber ?? 'Subscription'}</p>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-emerald-300">
                      {invoice.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">
                    Due {formatDate(invoice.dueDate)} • {formatCurrency(invoice.totalAmount)}
                  </p>
                </div>
              ))}
              {recentInvoices.length === 0 ? (
                <p className="text-sm text-slate-400">No invoices generated yet.</p>
              ) : null}
            </div>
          </div>
        </div>
      </Surface>
    </>
  );
}
