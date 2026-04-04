import { useQuery } from '@tanstack/react-query';

import { AlertTriangleIcon, ReceiptIcon, WalletIcon } from '../../components/icons';
import { MetricCard, Surface } from '../../components/layout';
import { apiRequest, formatCurrency, formatDate, type DashboardMetrics, type Invoice } from '../../lib/api';
import { useSession } from '../../lib/session';

export function ReportsPage() {
  const { token } = useSession();

  const dashboardQuery = useQuery({
    queryKey: ['reports-dashboard'],
    queryFn: () => apiRequest<DashboardMetrics>('/reports/dashboard', { token })
  });

  const invoicesQuery = useQuery({
    queryKey: ['reports-invoices'],
    queryFn: () => apiRequest<Invoice[]>('/invoices', { token })
  });

  const metrics = dashboardQuery.data;
  const invoices = invoicesQuery.data ?? [];

  return (
    <>
      <MetricCard label="Paid invoices" value={String(metrics?.invoicesPaid ?? 0)} detail="Successful collections." icon={<ReceiptIcon className="h-6 w-6" />} />
      <MetricCard label="Revenue" value={formatCurrency(metrics?.revenue ?? 0)} detail="Total paid invoice amount." icon={<WalletIcon className="h-6 w-6" />} />
      <MetricCard label="Overdue" value={String(metrics?.overdueInvoices ?? 0)} detail="Invoices awaiting action." icon={<AlertTriangleIcon className="h-6 w-6" />} />
      <Surface title="Invoice register">
        <div className="overflow-hidden rounded-3xl border border-white/10">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/6 text-slate-300">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Subscription</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr className="border-t border-white/10 text-slate-100" key={invoice.id}>
                  <td className="px-4 py-3">{invoice.invoiceNumber}</td>
                  <td className="px-4 py-3">{invoice.subscriptionOrder?.subscriptionNumber ?? 'Subscription'}</td>
                  <td className="px-4 py-3">{formatDate(invoice.dueDate)}</td>
                  <td className="px-4 py-3">{invoice.status}</td>
                  <td className="px-4 py-3">{formatCurrency(invoice.totalAmount)}</td>
                </tr>
              ))}
              {invoices.length === 0 ? (
                <tr className="border-t border-white/10 text-slate-400">
                  <td className="px-4 py-6" colSpan={5}>
                    No invoices generated yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Surface>
    </>
  );
}
