import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { AlertTriangleIcon, ReceiptIcon, WalletIcon } from '../../components/icons';
import { MetricCard, Surface } from '../../components/layout';
import { apiRequest, formatCurrency, formatDate, type DashboardMetrics, type Invoice, type PaginatedResponse } from '../../lib/api';
import { useSession } from '../../lib/session';

const REPORTS_PAGE_SIZE = 12;

export function ReportsPage() {
  const { token } = useSession();
  const [page, setPage] = useState(1);

  const dashboardQuery = useQuery({
    queryKey: ['reports-dashboard'],
    queryFn: () => apiRequest<DashboardMetrics>('/reports/dashboard', { token })
  });

  const invoicesQuery = useQuery({
    queryKey: ['reports-invoices', page],
    queryFn: () => apiRequest<PaginatedResponse<Invoice>>(`/invoices?page=${page}&pageSize=${REPORTS_PAGE_SIZE}`, { token })
  });

  const metrics = dashboardQuery.data;
  const invoices = invoicesQuery.data?.items ?? [];
  const totalInvoices = invoicesQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalInvoices / REPORTS_PAGE_SIZE));

  return (
    <>
      <MetricCard label="Paid invoices" value={String(metrics?.invoicesPaid ?? 0)} detail="Successful collections." icon={<ReceiptIcon className="h-6 w-6" />} />
      <MetricCard label="Revenue" value={formatCurrency(metrics?.revenue ?? 0)} detail="Total paid invoice amount." icon={<WalletIcon className="h-6 w-6" />} />
      <MetricCard label="Overdue" value={String(metrics?.overdueInvoices ?? 0)} detail="Invoices awaiting action." icon={<AlertTriangleIcon className="h-6 w-6" />} />
      <Surface title="Invoice register">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
          <p>
            Showing {invoices.length ? (page - 1) * REPORTS_PAGE_SIZE + 1 : 0}-{Math.min(page * REPORTS_PAGE_SIZE, totalInvoices)} of {totalInvoices} invoices
          </p>
          <PaginationControls currentPage={page} onPageChange={setPage} totalPages={totalPages} />
        </div>
        <div className="overflow-x-auto overflow-y-hidden rounded-3xl border border-white/10">
          <table className="min-w-[820px] w-full text-left text-sm">
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

function PaginationControls({
  currentPage,
  onPageChange,
  totalPages
}: Readonly<{
  currentPage: number;
  onPageChange: (page: number) => void;
  totalPages: number;
}>) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        className="rounded-full border border-white/10 bg-white/6 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        type="button"
      >
        Previous
      </button>
      <span className="min-w-[104px] text-center text-sm text-slate-300">
        Page {currentPage} / {totalPages}
      </span>
      <button
        className="rounded-full border border-white/10 bg-white/6 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        type="button"
      >
        Next
      </button>
    </div>
  );
}
