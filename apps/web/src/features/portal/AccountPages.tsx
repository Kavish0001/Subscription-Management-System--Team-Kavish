import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { downloadSubscriptionPdf } from './orderPdf';
import { CalendarRepeatIcon, CreditCardIcon, DownloadIcon, PrinterIcon, ReceiptIcon } from '../../components/icons';
import { StatusBadge, Surface } from '../../components/layout';
import { ApiError } from '../../lib/api';
import {
  apiRequest,
  formatCurrency,
  formatDate,
  type Contact,
  type Invoice,
  type PaginatedResponse,
  type RazorpayOrder,
  type RazorpayVerificationResult,
  type Subscription
} from '../../lib/api';
import { openRazorpayCheckout } from '../../lib/razorpay';
import { useSession } from '../../lib/session';

const fieldClass = 'app-input';
const ORDERS_PAGE_SIZE = 12;

export function ProfilePage() {
  const queryClient = useQueryClient();
  const { token, user } = useSession();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    companyName: '',
    line1: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India'
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const contactQuery = useQuery({
    queryKey: ['profile-contact'],
    queryFn: () => apiRequest<Contact>('/contacts/me', { token })
  });
  const ordersQuery = useQuery({
    queryKey: ['profile-orders'],
    queryFn: () =>
      apiRequest<PaginatedResponse<Subscription>>('/subscriptions?page=1&pageSize=3', { token })
  });

  const latestSubscriptions = ordersQuery.data?.items ?? [];
  const defaultAddress = contactQuery.data?.addresses.find((address) => address.isDefault) ?? contactQuery.data?.addresses[0];

  useEffect(() => {
    if (!contactQuery.data) {
      return;
    }

    setForm({
      name: contactQuery.data.name ?? '',
      phone: contactQuery.data.phone ?? '',
      companyName: contactQuery.data.companyName ?? '',
      line1: defaultAddress?.line1 ?? '',
      city: defaultAddress?.city ?? '',
      state: defaultAddress?.state ?? '',
      postalCode: defaultAddress?.postalCode ?? '',
      country: defaultAddress?.country ?? 'India'
    });
  }, [contactQuery.data, defaultAddress]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!contactQuery.data) {
        throw new ApiError('Contact not loaded', 400);
      }

      return apiRequest(`/contacts/${contactQuery.data.id}`, {
        token,
        method: 'PATCH',
        body: JSON.stringify({
          name: form.name,
          phone: form.phone || undefined,
          companyName: form.companyName || undefined,
          addresses: [
            {
              type: 'billing',
              line1: form.line1,
              city: form.city,
              state: form.state,
              postalCode: form.postalCode,
              country: form.country,
              isDefault: true
            }
          ]
        })
      });
    },
    onSuccess: async () => {
      setError(null);
      setMessage('Profile updated successfully.');
      await queryClient.invalidateQueries({ queryKey: ['profile-contact'] });
    },
    onError: (mutationError) => {
      setMessage(null);
      setError(mutationError instanceof ApiError ? mutationError.message : 'Unable to update profile');
    }
  });

  return (
    <Surface
      description="Manage your contact details, billing address, and security settings in one place."
      title="My Account"
    >
      <AccountTabs active="profile" />
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="app-card grid gap-4 p-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <p className="eyebrow mb-2">Account profile</p>
            <h3 className="section-title">Contact and billing details</h3>
          </div>
          <EditableField label="Name">
            <input className={fieldClass} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} value={form.name} />
          </EditableField>
          <ReadOnlyField label="Email" value={user?.email ?? ''} />
          <EditableField label="Phone Number">
            <input className={fieldClass} onChange={(event) => setForm((value) => ({ ...value, phone: event.target.value }))} value={form.phone} />
          </EditableField>
          <ReadOnlyField label="Related Contact" value={contactQuery.data?.id ?? 'Linked automatically'} />
          <EditableField label="Company">
            <input className={fieldClass} onChange={(event) => setForm((value) => ({ ...value, companyName: event.target.value }))} value={form.companyName} />
          </EditableField>
          <EditableField label="Address">
            <input className={fieldClass} onChange={(event) => setForm((value) => ({ ...value, line1: event.target.value }))} value={form.line1} />
          </EditableField>
          <EditableField label="City">
            <input className={fieldClass} onChange={(event) => setForm((value) => ({ ...value, city: event.target.value }))} value={form.city} />
          </EditableField>
          <EditableField label="State">
            <input className={fieldClass} onChange={(event) => setForm((value) => ({ ...value, state: event.target.value }))} value={form.state} />
          </EditableField>
          <EditableField label="Postal Code">
            <input className={fieldClass} onChange={(event) => setForm((value) => ({ ...value, postalCode: event.target.value }))} value={form.postalCode} />
          </EditableField>
          {message ? <p className="theme-message theme-message-success md:col-span-2">{message}</p> : null}
          {error ? <p className="theme-message theme-message-error md:col-span-2">{error}</p> : null}
          <div className="flex items-end gap-3 md:col-span-2">
            <button className="app-btn app-btn-primary" onClick={() => saveMutation.mutate()} type="button">
              Save Profile
            </button>
            <Link className="app-btn app-btn-secondary" to="/reset-password">
              Change Password
            </Link>
          </div>
        </div>
        <div className="app-card p-6">
          <p className="eyebrow mb-2">Subscription snapshot</p>
          <h3 className="section-title">Your subscriptions</h3>
          <div className="mt-4 grid gap-3">
            {latestSubscriptions.map((subscription) => (
              <div className="app-soft-panel px-4 py-3" key={subscription.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[color:var(--color-text-primary)]">{subscription.subscriptionNumber}</p>
                    <p className="text-sm muted">{subscription.recurringPlan?.name ?? 'Recurring plan'}</p>
                  </div>
                  <StatusBadge status={subscription.status} />
                </div>
                <p className="mt-2 text-sm muted">
                  Start {formatDate(subscription.startDate)} | Next invoice {formatDate(subscription.nextInvoiceDate)}
                </p>
              </div>
            ))}
            {latestSubscriptions.length === 0 ? <p className="text-sm muted">No subscriptions yet.</p> : null}
          </div>
        </div>
      </div>
    </Surface>
  );
}

export function OrdersPage() {
  const { token } = useSession();
  const [page, setPage] = useState(1);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadingOrderId, setDownloadingOrderId] = useState<string | null>(null);
  const subscriptionsQuery = useQuery({
    queryKey: ['portal-orders', page],
    queryFn: () =>
      apiRequest<PaginatedResponse<Subscription>>(`/subscriptions?page=${page}&pageSize=${ORDERS_PAGE_SIZE}`, { token })
  });
  const orders = subscriptionsQuery.data?.items ?? [];
  const totalOrders = subscriptionsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalOrders / ORDERS_PAGE_SIZE));

  const handleDownloadPdf = async (subscriptionId: string) => {
    try {
      setDownloadError(null);
      setDownloadingOrderId(subscriptionId);
      const subscription = await apiRequest<Subscription>(`/subscriptions/${subscriptionId}`, { token });
      await downloadSubscriptionPdf(subscription);
    } catch (downloadErrorValue) {
      setDownloadError(
        downloadErrorValue instanceof ApiError || downloadErrorValue instanceof Error
          ? downloadErrorValue.message
          : 'Unable to download order PDF'
      );
    } finally {
      setDownloadingOrderId(null);
    }
  };

  return (
    <Surface description="Review subscription orders, totals, and printable details." title="My Account">
      <AccountTabs active="orders" />
      <div className="mb-5">
        <p className="eyebrow mb-2">Orders</p>
        <h3 className="section-title">My Orders</h3>
      </div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-sm muted">
        <p>
          Showing {orders.length ? (page - 1) * ORDERS_PAGE_SIZE + 1 : 0}-{Math.min(page * ORDERS_PAGE_SIZE, totalOrders)} of {totalOrders} orders
        </p>
        <PaginationControls currentPage={page} onPageChange={setPage} totalPages={totalPages} />
      </div>
      {downloadError ? <p className="theme-message theme-message-error mb-4">{downloadError}</p> : null}
      <div className="table-shell">
        <table className="app-table min-w-[820px] text-left text-sm">
          <thead>
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Download</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((subscription) => (
              <tr key={subscription.id}>
                <td className="px-4 py-3">
                  <Link className="font-semibold text-[color:var(--color-primary-strong)]" to={`/account/orders/${subscription.id}`}>
                    {subscription.subscriptionNumber}
                  </Link>
                </td>
                <td className="px-4 py-3">{formatDate(subscription.createdAt)}</td>
                <td className="px-4 py-3">{formatCurrency(subscription.totalAmount)}</td>
                <td className="px-4 py-3"><StatusBadge status={subscription.status} /></td>
                <td className="px-4 py-3">
                  <button
                    className="font-semibold text-[color:var(--color-primary-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={downloadingOrderId === subscription.id}
                    onClick={() => void handleDownloadPdf(subscription.id)}
                    type="button"
                  >
                    {downloadingOrderId === subscription.id ? 'Preparing PDF...' : 'Download PDF'}
                  </button>
                </td>
              </tr>
            ))}
            {orders.length === 0 ? (
              <tr>
                <td className="px-4 py-6" colSpan={5}>
                  No orders found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Surface>
  );
}

export function OrderDetailPage() {
  return <SubscriptionDetailView mode="detail" />;
}

export function SubscriptionPreviewPage() {
  return <SubscriptionDetailView mode="preview" />;
}

export function InvoiceDetailPage() {
  const queryClient = useQueryClient();
  const { id } = useParams();
  const { token } = useSession();
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const invoiceQuery = useQuery({
    queryKey: ['portal-invoice', id],
    queryFn: () => apiRequest<Invoice>(`/invoices/${id}`, { token }),
    enabled: Boolean(id)
  });

  const payMutation = useMutation({
    mutationFn: async () => {
      const order = await apiRequest<RazorpayOrder>('/payments/razorpay/order', {
        token,
        method: 'POST',
        body: JSON.stringify({
          purpose: 'invoice',
          invoiceId: id
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
        queryClient.invalidateQueries({ queryKey: ['portal-invoice', id] }),
        queryClient.invalidateQueries({ queryKey: ['portal-orders'] })
      ]);
    },
    onError: (mutationError) => {
      setPaymentError(
        mutationError instanceof ApiError || mutationError instanceof Error ? mutationError.message : 'Payment failed'
      );
    }
  });

  const invoice = invoiceQuery.data;

  if (!invoice) {
    return (
      <Surface title="Invoice">
        <p className="muted">Invoice not found.</p>
      </Surface>
    );
  }

  return (
    <Surface
      className="invoice-page-shell"
      title={invoice.invoiceNumber}
      actions={
        <div className="invoice-screen-actions flex flex-wrap gap-3">
          {invoice.subscriptionOrder ? (
            <Link className="app-btn app-btn-secondary" to={`/account/orders/${invoice.subscriptionOrder.id}`}>
              <ReceiptIcon className="mr-2 inline h-4 w-4" />
              Subscription
            </Link>
          ) : null}
          <button className="app-btn app-btn-secondary" onClick={() => window.print()} type="button">
            <PrinterIcon className="mr-2 inline h-4 w-4" />
            Print
          </button>
          {invoice.status === 'confirmed' ? (
            <button className="app-btn app-btn-primary" disabled={payMutation.isPending} onClick={() => payMutation.mutate()} type="button">
              <CreditCardIcon className="mr-2 inline h-4 w-4" />
              {payMutation.isPending ? 'Opening Razorpay...' : 'Pay with Razorpay'}
            </button>
          ) : null}
        </div>
      }
    >
      <AccountTabs active="orders" />
      {paymentError ? <p className="theme-message theme-message-error mb-4">{paymentError}</p> : null}
      <div className="invoice-screen-summary mb-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="app-card p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--color-primary-strong)]">Invoice overview</p>
              <h3 className="mt-2 text-xl font-bold text-[color:var(--color-text-primary)]">{invoice.invoiceNumber}</h3>
            </div>
            <StatusBadge status={invoice.status} />
          </div>
          <div className="grid gap-3 text-sm muted sm:grid-cols-2">
            <InvoiceMetaRow icon={<CalendarRepeatIcon className="h-4 w-4" />} label="Invoice date" value={formatDate(invoice.invoiceDate)} />
            <InvoiceMetaRow icon={<CalendarRepeatIcon className="h-4 w-4" />} label="Due date" value={formatDate(invoice.dueDate)} />
            <InvoiceMetaRow icon={<ReceiptIcon className="h-4 w-4" />} label="Reference" value={invoice.subscriptionOrder?.subscriptionNumber ?? 'Subscription'} />
            <InvoiceMetaRow icon={<CreditCardIcon className="h-4 w-4" />} label="Amount due" value={formatCurrency(invoice.amountDue)} />
          </div>
        </div>
        <div className="app-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--color-primary-strong)]">Payment summary</p>
          <div className="mt-4 grid gap-3">
            <SummaryRow label="Subtotal" value={formatCurrency(invoice.subtotalAmount)} />
            <SummaryRow label="Discount" value={formatCurrency(invoice.discountAmount)} />
            <SummaryRow label="Tax" value={formatCurrency(invoice.taxAmount)} />
            <SummaryRow label="Total" value={formatCurrency(invoice.totalAmount)} />
            <SummaryRow label="Paid" value={formatCurrency(invoice.paidAmount)} />
            <SummaryRow label="Amount due" value={formatCurrency(invoice.amountDue)} />
          </div>
        </div>
      </div>

      <article className="invoice-print-sheet">
        <div className="invoice-doc-header">
          <div>
            <p className="invoice-doc-kicker">Veltrix Subscription ERP</p>
            <h2>Tax Invoice</h2>
            <p className="invoice-doc-muted">
              Source: {invoice.sourceLabel} {invoice.paymentTermLabel ? `| Payment term: ${invoice.paymentTermLabel}` : ''}
            </p>
          </div>
          <div className="invoice-doc-badge">
            <span>Invoice No.</span>
            <strong>{invoice.invoiceNumber}</strong>
          </div>
        </div>

        <div className="invoice-doc-meta">
          <div className="invoice-doc-panel">
            <p className="invoice-doc-label">Invoice details</p>
            <div className="invoice-doc-list">
              <InvoicePrintRow label="Invoice number" value={invoice.invoiceNumber} />
              <InvoicePrintRow label="Status" value={invoice.status.toUpperCase()} />
              <InvoicePrintRow label="Invoice date" value={formatDate(invoice.invoiceDate)} />
              <InvoicePrintRow label="Due date" value={formatDate(invoice.dueDate)} />
            </div>
          </div>
          <div className="invoice-doc-panel">
            <p className="invoice-doc-label">Subscription reference</p>
            <div className="invoice-doc-list">
              <InvoicePrintRow label="Order number" value={invoice.subscriptionOrder?.subscriptionNumber ?? 'Subscription'} />
              <InvoicePrintRow label="Source label" value={invoice.sourceLabel} />
              <InvoicePrintRow label="Currency" value={invoice.currencyCode} />
              <InvoicePrintRow label="Payment term" value={invoice.paymentTermLabel ?? 'Standard'} />
            </div>
          </div>
        </div>

        <div className="invoice-doc-table-shell">
          <table className="invoice-doc-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Line Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((line) => (
                <tr key={line.id}>
                  <td>{line.productNameSnapshot}</td>
                  <td>{line.quantity}</td>
                  <td>{formatCurrency(line.unitPrice)}</td>
                  <td>{formatCurrency(line.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="invoice-doc-footer">
          <div className="invoice-doc-panel">
            <p className="invoice-doc-label">Payments</p>
            {invoice.payments.length > 0 ? (
              <div className="invoice-doc-payments">
                {invoice.payments.map((payment) => (
                  <div className="invoice-doc-payment" key={payment.id}>
                    <div>
                      <strong>{payment.paymentReference}</strong>
                      <p>{payment.paymentMethod} via {payment.provider}</p>
                    </div>
                    <div className="invoice-doc-payment-amount">
                      <strong>{formatCurrency(payment.amount)}</strong>
                      <p>{payment.paidAt ? formatDate(payment.paidAt) : payment.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="invoice-doc-muted">No recorded payments yet.</p>
            )}
          </div>

          <div className="invoice-doc-totals">
            <InvoicePrintRow label="Subtotal" value={formatCurrency(invoice.subtotalAmount)} />
            <InvoicePrintRow label="Discount" value={formatCurrency(invoice.discountAmount)} />
            <InvoicePrintRow label="Tax" value={formatCurrency(invoice.taxAmount)} />
            <InvoicePrintRow label="Total" value={formatCurrency(invoice.totalAmount)} />
            <InvoicePrintRow label="Paid" value={formatCurrency(invoice.paidAmount)} />
            <InvoicePrintRow label="Amount due" value={formatCurrency(invoice.amountDue)} strong />
          </div>
        </div>
      </article>
    </Surface>
  );
}

function SubscriptionDetailView({ mode }: { mode: 'detail' | 'preview' }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { token } = useSession();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const hasAutoDownloaded = useRef(false);
  const subscriptionQuery = useQuery({
    queryKey: ['portal-order', id],
    queryFn: () => apiRequest<Subscription>(`/subscriptions/${id}`, { token }),
    enabled: Boolean(id)
  });

  const workflowMutation = useMutation({
    mutationFn: async (action: 'confirm' | 'renew' | 'upsell' | 'close' | 'pause' | 'resume') => {
      if (!id) {
        throw new ApiError('Subscription not found', 404);
      }

      return apiRequest<Subscription>(`/subscriptions/${id}/${action}`, {
        token,
        method: 'POST',
        body: action === 'upsell' ? JSON.stringify({}) : undefined
      });
    },
    onSuccess: async (result, action) => {
      setError(null);
      setMessage(
        action === 'confirm'
          ? 'Quotation confirmed.'
          : action === 'close'
            ? 'Subscription closed.'
            : action === 'pause'
              ? 'Subscription paused.'
              : action === 'resume'
                ? 'Subscription resumed.'
                : action === 'renew'
                  ? `Renewal created: ${result.subscriptionNumber}`
                  : `Upsell created: ${result.subscriptionNumber}`
      );

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['portal-order', id] }),
        queryClient.invalidateQueries({ queryKey: ['portal-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['profile-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-dashboard-subscriptions'] })
      ]);

      if (action === 'renew' || action === 'upsell') {
        navigate(`/account/orders/${result.id}`);
      }
    },
    onError: (mutationError) => {
      setMessage(null);
      setError(mutationError instanceof ApiError ? mutationError.message : 'Subscription action failed');
    }
  });

  const subscription = subscriptionQuery.data;
  const hasCompletedPurchase = Boolean(subscription?.invoices.some((invoice) => invoice.status === 'paid'));
  const canConfirm = mode === 'detail' && ['draft', 'quotation', 'quotation_sent'].includes(subscription?.status ?? '');
  const canRenew = mode === 'detail' && hasCompletedPurchase;
  const canUpsell = mode === 'detail' && hasCompletedPurchase;
  const canClose =
    mode === 'detail' &&
    ['confirmed', 'active'].includes(subscription?.status ?? '') &&
    Boolean(subscription?.recurringPlan?.isClosable);
  const canPause =
    mode === 'detail' &&
    ['confirmed', 'active'].includes(subscription?.status ?? '') &&
    Boolean(subscription?.recurringPlan?.isPausable);
  const canResume = mode === 'detail' && subscription?.status === 'paused' && Boolean(subscription?.recurringPlan?.isPausable);
  const shouldAutoDownloadPdf = mode === 'detail' && searchParams.get('print') === '1';
  const historyItems = useMemo(
    () =>
      (subscription?.childOrders ?? []).map((child) => ({
        ...child,
        label: child.relationType === 'upsell' ? 'Upsell' : 'Renewal'
      })),
    [subscription?.childOrders]
  );

  const handleDownloadPdf = async () => {
    if (!subscription) {
      return;
    }

    try {
      setError(null);
      setIsDownloadingPdf(true);
      await downloadSubscriptionPdf(subscription);
    } catch (downloadErrorValue) {
      setError(
        downloadErrorValue instanceof ApiError || downloadErrorValue instanceof Error
          ? downloadErrorValue.message
          : 'Unable to download order PDF'
      );
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  useEffect(() => {
    if (!subscription || !shouldAutoDownloadPdf || hasAutoDownloaded.current) {
      return;
    }

    hasAutoDownloaded.current = true;
    const timer = window.setTimeout(() => {
      void handleDownloadPdf();
    }, 180);

    return () => {
      window.clearTimeout(timer);
    };
  }, [handleDownloadPdf, shouldAutoDownloadPdf, subscription]);

  if (!subscription) {
    return (
      <Surface title={mode === 'preview' ? 'Preview' : 'Order'}>
        <p className="muted">Order not found.</p>
      </Surface>
    );
  }

  return (
    <Surface
      title={mode === 'preview' ? `${subscription.subscriptionNumber} Preview` : subscription.subscriptionNumber}
      actions={
        mode === 'detail' ? (
          <div className="flex flex-wrap gap-3">
            {canConfirm ? (
              <button className="app-btn app-btn-primary px-4 py-2 text-sm" onClick={() => workflowMutation.mutate('confirm')} type="button">
                Confirm
              </button>
            ) : null}
            {canRenew ? (
              <button className="app-btn app-btn-secondary px-4 py-2 text-sm" onClick={() => workflowMutation.mutate('renew')} type="button">
                Renew
              </button>
            ) : null}
            {canUpsell ? (
              <button className="app-btn app-btn-secondary px-4 py-2 text-sm" onClick={() => workflowMutation.mutate('upsell')} type="button">
                Upsell
              </button>
            ) : null}
            {canClose ? (
              <button className="app-btn app-btn-secondary px-4 py-2 text-sm" onClick={() => workflowMutation.mutate('close')} type="button">
                Close
              </button>
            ) : null}
            {canPause ? (
              <button className="app-btn app-btn-secondary px-4 py-2 text-sm" onClick={() => workflowMutation.mutate('pause')} type="button">
                Pause
              </button>
            ) : null}
            {canResume ? (
              <button className="app-btn app-btn-secondary px-4 py-2 text-sm" onClick={() => workflowMutation.mutate('resume')} type="button">
                Resume
              </button>
            ) : null}
            <button className="app-btn app-btn-secondary px-4 py-2 text-sm" disabled={isDownloadingPdf} onClick={() => void handleDownloadPdf()} type="button">
              <DownloadIcon className="h-4 w-4" />
              {isDownloadingPdf ? 'Preparing PDF...' : 'Download PDF'}
            </button>
          </div>
        ) : null
      }
    >
      <AccountTabs active="orders" />
      {mode === 'preview' ? (
        <p className="theme-message theme-message-warning mb-4">
          Quotation preview. Review plan, billing, products, and totals before confirmation.
        </p>
      ) : null}
      {message ? <p className="theme-message theme-message-success mb-4">{message}</p> : null}
      {error ? <p className="theme-message theme-message-error mb-4">{error}</p> : null}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="muted">
            {subscription.customerContact.name} | {subscription.status} | {subscription.recurringPlan?.name ?? 'Recurring plan'}
          </p>
          <div className="table-shell mt-5">
            <table className="app-table min-w-[720px]">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {subscription.lines.map((line) => (
                  <tr key={line.id}>
                    <td>
                      <p>{line.productNameSnapshot}</p>
                      {line.variant?.name ? <p className="text-xs muted">{line.variant.name}</p> : null}
                    </td>
                    <td>{line.quantity}</td>
                    <td>{formatCurrency(line.unitPrice)}</td>
                    <td className="font-semibold">{formatCurrency(line.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            {subscription.invoices.map((invoice) => (
              <Link className="app-btn app-btn-secondary px-4 py-3 text-sm" key={invoice.id} to={`/account/invoices/${invoice.id}`}>
                {invoice.invoiceNumber}
              </Link>
            ))}
            {subscription.invoices.length === 0 ? <span className="app-btn app-btn-secondary border-dashed px-4 py-3 text-sm text-[color:var(--color-text-secondary)]">No invoices yet</span> : null}
          </div>
        </div>
        <div className="grid gap-4">
          <div className="app-card p-5">
            <p className="text-sm font-semibold text-[color:var(--color-text-primary)]">Subscription summary</p>
            <div className="mt-4 grid gap-3 text-sm">
              <SummaryRow label="Source" value={subscription.sourceChannel} />
              <SummaryRow label="Quotation Date" value={formatDate(subscription.quotationDate)} />
              <SummaryRow label="Quotation Expires" value={formatDate(subscription.quotationExpiresAt)} />
              <SummaryRow label="Start Date" value={formatDate(subscription.startDate)} />
              <SummaryRow label="Next Invoice" value={formatDate(subscription.nextInvoiceDate)} />
              <SummaryRow label="Expiration Date" value={formatDate(subscription.expirationDate)} />
              <SummaryRow label="Payment Term" value={subscription.paymentTermLabel ?? 'Standard'} />
              <SummaryRow label="Untaxed Amount" value={formatCurrency(subscription.subtotalAmount)} />
              <SummaryRow label="Discount" value={formatCurrency(subscription.discountAmount)} />
              <SummaryRow label="Tax" value={formatCurrency(subscription.taxAmount)} />
              <SummaryRow label="Total" value={formatCurrency(subscription.totalAmount)} />
            </div>
          </div>
          <div className="app-card p-5">
            <p className="text-sm font-semibold text-[color:var(--color-text-primary)]">Lifecycle history</p>
            <div className="mt-4 grid gap-3">
              {subscription.parentOrder ? (
                <Link className="app-soft-panel rounded-2xl px-4 py-3 text-sm font-medium text-[color:var(--color-text-primary)]" to={`/account/orders/${subscription.parentOrder.id}`}>
                  Parent order: {subscription.parentOrder.subscriptionNumber} | {subscription.parentOrder.status}
                </Link>
              ) : (
                <div className="app-soft-panel rounded-2xl px-4 py-3 text-sm text-[color:var(--color-text-secondary)]">This is the root subscription.</div>
              )}
              {historyItems.map((child) => (
                <Link className="app-soft-panel rounded-2xl px-4 py-3 text-sm font-medium text-[color:var(--color-text-primary)]" key={child.id} to={`/account/orders/${child.id}`}>
                  {child.label}: {child.subscriptionNumber} | {child.status} | {formatDate(child.createdAt)}
                </Link>
              ))}
              {historyItems.length === 0 ? <div className="app-soft-panel rounded-2xl border-dashed px-4 py-3 text-sm text-[color:var(--color-text-secondary)]">No renewals or upsells yet.</div> : null}
            </div>
          </div>
          {subscription.notes ? (
            <div className="app-card p-5">
              <p className="text-sm font-semibold text-[color:var(--color-text-primary)]">Notes</p>
              <p className="mt-3 text-sm muted">{subscription.notes}</p>
            </div>
          ) : null}
        </div>
      </div>
    </Surface>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-card-muted)] px-4 py-3">
      <span className="muted">{label}</span>
      <span className="text-right font-semibold text-[color:var(--color-text-primary)]">{value}</span>
    </div>
  );
}

function InvoiceMetaRow({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-card-muted)] px-4 py-3">
      <div className="mt-0.5 text-[color:var(--color-primary-strong)]">{icon}</div>
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">{label}</p>
        <p className="mt-1 font-medium text-[color:var(--color-text-primary)]">{value}</p>
      </div>
    </div>
  );
}

function InvoicePrintRow({
  label,
  value,
  strong = false
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="invoice-doc-row">
      <span>{label}</span>
      <strong className={strong ? 'invoice-doc-strong' : undefined}>{value}</strong>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="app-label">
      {label}
      <div className="app-readonly">{value}</div>
    </label>
  );
}

function AccountTabs({
  active
}: Readonly<{
  active: 'profile' | 'orders';
}>) {
  const tabs = [
    { id: 'profile' as const, label: 'Profile', to: '/account/profile' },
    { id: 'orders' as const, label: 'Orders', to: '/account/orders' }
  ];

  return (
    <div className="mb-6 flex flex-wrap gap-2 rounded-[24px] border border-[color:var(--color-border)] bg-[color:var(--color-card-muted)] p-2">
      {tabs.map((tab) => (
        <Link
          className={
            tab.id === active
              ? 'rounded-[18px] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--color-text-primary)] shadow-[0_10px_24px_rgba(15,23,42,0.08)]'
              : 'rounded-[18px] px-4 py-2 text-sm font-medium text-[color:var(--color-text-secondary)] transition hover:bg-white/70 hover:text-[color:var(--color-text-primary)]'
          }
          key={tab.id}
          to={tab.to}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

function EditableField({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="app-label">
      {label}
      {children}
    </label>
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
        className="app-btn app-btn-secondary px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        type="button"
      >
        Previous
      </button>
      <span className="min-w-[104px] text-center text-sm muted">
        Page {currentPage} / {totalPages}
      </span>
      <button
        className="app-btn app-btn-secondary px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        type="button"
      >
        Next
      </button>
    </div>
  );
}
