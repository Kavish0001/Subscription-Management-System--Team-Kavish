import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { AlertTriangleIcon, ReceiptIcon, WalletIcon } from '../../components/icons';
import { MetricCard, StatusBadge, Surface } from '../../components/layout';
import {
  ApiError,
  apiRequest,
  formatCurrency,
  formatDate,
  type DashboardMetrics,
  type Invoice,
  type PaginatedResponse,
  type RazorpayOrder,
  type RazorpayVerificationResult
} from '../../lib/api';
import { openRazorpayCheckout } from '../../lib/razorpay';
import { useSession } from '../../lib/session';

const REPORTS_PAGE_SIZE = 12;

export function ReportsPage() {
  const queryClient = useQueryClient();
  const { token } = useSession();
  const [page, setPage] = useState(1);
  const [paymentError, setPaymentError] = useState<string | null>(null);

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

  const payMutation = useMutation({
    mutationFn: async (invoice: Invoice) => {
      const order = await apiRequest<RazorpayOrder>('/payments/razorpay/order', {
        token,
        method: 'POST',
        body: JSON.stringify({
          purpose: 'invoice',
          invoiceId: invoice.id
        })
      });

      const razorpayPayment = await openRazorpayCheckout({
        keyId: order.keyId,
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        merchantName: order.merchantName,
        description: order.description,
        customer: order.customer
      });

      return apiRequest<RazorpayVerificationResult>('/payments/razorpay/verify', {
        token,
        method: 'POST',
        body: JSON.stringify({
          purpose: 'invoice',
          razorpayOrderId: razorpayPayment.razorpay_order_id,
          razorpayPaymentId: razorpayPayment.razorpay_payment_id,
          razorpaySignature: razorpayPayment.razorpay_signature
        })
      });
    },
    onSuccess: async () => {
      setPaymentError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['reports-invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['reports-dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-dashboard-invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] })
      ]);
    },
    onError: (mutationError) => {
      setPaymentError(
        mutationError instanceof ApiError || mutationError instanceof Error ? mutationError.message : 'Payment failed'
      );
    }
  });

  return (
    <>
      <MetricCard label="Paid invoices" value={String(metrics?.invoicesPaid ?? 0)} detail="Successful collections." icon={<ReceiptIcon className="h-6 w-6" />} />
      <MetricCard label="Revenue" value={formatCurrency(metrics?.revenue ?? 0)} detail="Total paid invoice amount." icon={<WalletIcon className="h-6 w-6" />} />
      <MetricCard label="Overdue" value={String(metrics?.overdueInvoices ?? 0)} detail="Invoices awaiting action." icon={<AlertTriangleIcon className="h-6 w-6" />} />
      <Surface title="Invoice register">
        {paymentError ? <p className="theme-message theme-message-error mb-4">{paymentError}</p> : null}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-sm muted">
          <p>
            Showing {invoices.length ? (page - 1) * REPORTS_PAGE_SIZE + 1 : 0}-{Math.min(page * REPORTS_PAGE_SIZE, totalInvoices)} of {totalInvoices} invoices
          </p>
          <PaginationControls currentPage={page} onPageChange={setPage} totalPages={totalPages} />
        </div>
        <div className="table-shell">
          <table className="app-table min-w-[820px]">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Subscription</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="font-semibold">{invoice.invoiceNumber}</td>
                  <td>{invoice.subscriptionOrder?.subscriptionNumber ?? 'Subscription'}</td>
                  <td>{formatDate(invoice.dueDate)}</td>
                  <td><StatusBadge status={invoice.status} /></td>
                  <td className="font-semibold">{formatCurrency(invoice.totalAmount)}</td>
                  <td>
                    {invoice.status === 'confirmed' ? (
                      <button
                        className="app-btn app-btn-primary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={payMutation.isPending}
                        onClick={() => payMutation.mutate(invoice)}
                        type="button"
                      >
                        {payMutation.isPending ? 'Opening Razorpay...' : 'Pay'}
                      </button>
                    ) : (
                      <span className="muted">Closed</span>
                    )}
                  </td>
                </tr>
              ))}
              {invoices.length === 0 ? (
                <tr>
                  <td className="py-6 muted" colSpan={6}>
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
        className="app-btn app-btn-secondary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        type="button"
      >
        Previous
      </button>
      <span className="min-w-[104px] text-center text-sm text-[color:var(--color-text-secondary)]">
        Page {currentPage} / {totalPages}
      </span>
      <button
        className="app-btn app-btn-secondary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        type="button"
      >
        Next
      </button>
    </div>
  );
}
