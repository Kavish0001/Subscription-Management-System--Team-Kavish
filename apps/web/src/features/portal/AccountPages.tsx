import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { CalendarRepeatIcon, CreditCardIcon, PrinterIcon, ReceiptIcon } from '../../components/icons';
import { StatusBadge, Surface } from '../../components/layout';
import { ApiError } from '../../lib/api';
import { apiRequest, formatCurrency, formatDate, type Contact, type Invoice, type PaginatedResponse, type Subscription } from '../../lib/api';
import { useSession } from '../../lib/session';

const fieldClass = 'rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3';
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
    <Surface title="My Profile">
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="grid gap-4 md:grid-cols-2">
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
          {message ? <p className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 md:col-span-2">{message}</p> : null}
          {error ? <p className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 md:col-span-2">{error}</p> : null}
          <div className="flex items-end gap-3 md:col-span-2">
            <button className="rounded-full bg-gradient-to-r from-emerald-300 to-sky-400 px-4 py-3 text-sm font-semibold text-slate-950" onClick={() => saveMutation.mutate()} type="button">
              Save Profile
            </button>
            <Link className="rounded-full border border-white/10 bg-white/6 px-4 py-3 text-sm font-semibold text-white" to="/reset-password">
              Change Password
            </Link>
          </div>
        </div>
        <div className="rounded-[28px] border border-white/10 bg-slate-950/35 p-5">
          <p className="text-sm font-semibold text-slate-200">Your subscriptions</p>
          <div className="mt-4 grid gap-3">
            {latestSubscriptions.map((subscription) => (
              <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3" key={subscription.id}>
                <p className="font-semibold text-white">{subscription.subscriptionNumber}</p>
                <p className="text-sm text-slate-300">
                  {subscription.recurringPlan?.name ?? 'Recurring plan'} | {subscription.status}
                </p>
                <p className="text-sm text-slate-400">
                  Start {formatDate(subscription.startDate)} | Next invoice {formatDate(subscription.nextInvoiceDate)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Surface>
  );
}

export function OrdersPage() {
  const { token } = useSession();
  const [page, setPage] = useState(1);
  const subscriptionsQuery = useQuery({
    queryKey: ['portal-orders', page],
    queryFn: () =>
      apiRequest<PaginatedResponse<Subscription>>(`/subscriptions?page=${page}&pageSize=${ORDERS_PAGE_SIZE}`, { token })
  });
  const orders = subscriptionsQuery.data?.items ?? [];
  const totalOrders = subscriptionsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalOrders / ORDERS_PAGE_SIZE));

  return (
    <Surface title="My Orders">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
        <p>
          Showing {orders.length ? (page - 1) * ORDERS_PAGE_SIZE + 1 : 0}-{Math.min(page * ORDERS_PAGE_SIZE, totalOrders)} of {totalOrders} orders
        </p>
        <PaginationControls currentPage={page} onPageChange={setPage} totalPages={totalPages} />
      </div>
      <div className="overflow-x-auto overflow-y-hidden rounded-3xl border border-white/10">
        <table className="min-w-[820px] w-full text-left text-sm">
          <thead className="bg-white/6 text-slate-300">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Print</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((subscription) => (
              <tr className="border-t border-white/10 text-slate-100" key={subscription.id}>
                <td className="px-4 py-3">
                  <Link className="text-amber-300" to={`/account/orders/${subscription.id}`}>
                    {subscription.subscriptionNumber}
                  </Link>
                </td>
                <td className="px-4 py-3">{formatDate(subscription.createdAt)}</td>
                <td className="px-4 py-3">{formatCurrency(subscription.totalAmount)}</td>
                <td className="px-4 py-3">{subscription.status}</td>
                <td className="px-4 py-3">
                  <Link className="text-amber-300" to={`/account/orders/${subscription.id}?print=1`}>
                    Print
                  </Link>
                </td>
              </tr>
            ))}
            {orders.length === 0 ? (
              <tr className="border-t border-white/10 text-slate-400">
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
  const invoiceQuery = useQuery({
    queryKey: ['portal-invoice', id],
    queryFn: () => apiRequest<Invoice>(`/invoices/${id}`, { token }),
    enabled: Boolean(id)
  });

  const payMutation = useMutation({
    mutationFn: () =>
      apiRequest('/payments/mock', {
        token,
        method: 'POST',
        body: JSON.stringify({
          invoiceId: id
        })
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['portal-invoice', id] }),
        queryClient.invalidateQueries({ queryKey: ['portal-orders'] })
      ]);
    }
  });

  const invoice = invoiceQuery.data;

  if (!invoice) {
    return (
      <Surface title="Invoice">
        <p className="text-slate-300">Invoice not found.</p>
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
            <Link className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-semibold text-white" to={`/account/orders/${invoice.subscriptionOrder.id}`}>
              <ReceiptIcon className="mr-2 inline h-4 w-4" />
              Subscription
            </Link>
          ) : null}
          <button className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-semibold text-white" onClick={() => window.print()} type="button">
            <PrinterIcon className="mr-2 inline h-4 w-4" />
            Print
          </button>
          {invoice.status === 'confirmed' ? (
            <button className="rounded-full bg-gradient-to-r from-sky-300 to-indigo-400 px-4 py-2 text-sm font-semibold text-slate-950" onClick={() => payMutation.mutate()} type="button">
              <CreditCardIcon className="mr-2 inline h-4 w-4" />
              Pay
            </button>
          ) : null}
        </div>
      }
    >
      <div className="invoice-screen-summary mb-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[24px] border border-white/10 bg-slate-950/35 p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Invoice overview</p>
              <h3 className="mt-2 text-xl font-bold text-white">{invoice.invoiceNumber}</h3>
            </div>
            <StatusBadge status={invoice.status} />
          </div>
          <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
            <InvoiceMetaRow icon={<CalendarRepeatIcon className="h-4 w-4" />} label="Invoice date" value={formatDate(invoice.invoiceDate)} />
            <InvoiceMetaRow icon={<CalendarRepeatIcon className="h-4 w-4" />} label="Due date" value={formatDate(invoice.dueDate)} />
            <InvoiceMetaRow icon={<ReceiptIcon className="h-4 w-4" />} label="Reference" value={invoice.subscriptionOrder?.subscriptionNumber ?? 'Subscription'} />
            <InvoiceMetaRow icon={<CreditCardIcon className="h-4 w-4" />} label="Amount due" value={formatCurrency(invoice.amountDue)} />
          </div>
        </div>
        <div className="rounded-[24px] border border-white/10 bg-slate-950/35 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Payment summary</p>
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
  const hasAutoPrinted = useRef(false);
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
  const canConfirm = mode === 'detail' && ['draft', 'quotation', 'quotation_sent'].includes(subscription?.status ?? '');
  const canRenew =
    mode === 'detail' &&
    ['confirmed', 'in_progress', 'closed'].includes(subscription?.status ?? '') &&
    Boolean(subscription?.recurringPlan?.isRenewable);
  const canUpsell = mode === 'detail' && ['confirmed', 'in_progress', 'closed'].includes(subscription?.status ?? '');
  const canClose =
    mode === 'detail' &&
    ['confirmed', 'in_progress'].includes(subscription?.status ?? '') &&
    Boolean(subscription?.recurringPlan?.isClosable);
  const canPause =
    mode === 'detail' &&
    ['confirmed', 'in_progress'].includes(subscription?.status ?? '') &&
    Boolean(subscription?.recurringPlan?.isPausable);
  const canResume = mode === 'detail' && subscription?.status === 'paused' && Boolean(subscription?.recurringPlan?.isPausable);
  const shouldPrint = mode === 'detail' && searchParams.get('print') === '1';
  const historyItems = useMemo(
    () =>
      (subscription?.childOrders ?? []).map((child) => ({
        ...child,
        label: child.relationType === 'upsell' ? 'Upsell' : 'Renewal'
      })),
    [subscription?.childOrders]
  );

  useEffect(() => {
    if (!subscription || !shouldPrint || hasAutoPrinted.current) {
      return;
    }

    hasAutoPrinted.current = true;
    const timer = window.setTimeout(() => {
      window.print();
    }, 180);

    return () => {
      window.clearTimeout(timer);
    };
  }, [shouldPrint, subscription]);

  if (!subscription) {
    return (
      <Surface title={mode === 'preview' ? 'Preview' : 'Order'}>
        <p className="text-slate-300">Order not found.</p>
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
              <button className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-semibold text-white" onClick={() => workflowMutation.mutate('confirm')} type="button">
                Confirm
              </button>
            ) : null}
            {canRenew ? (
              <button className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-semibold text-white" onClick={() => workflowMutation.mutate('renew')} type="button">
                Renew
              </button>
            ) : null}
            {canUpsell ? (
              <button className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-semibold text-white" onClick={() => workflowMutation.mutate('upsell')} type="button">
                Upsell
              </button>
            ) : null}
            {canClose ? (
              <button className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-semibold text-white" onClick={() => workflowMutation.mutate('close')} type="button">
                Close
              </button>
            ) : null}
            {canPause ? (
              <button className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-semibold text-white" onClick={() => workflowMutation.mutate('pause')} type="button">
                Pause
              </button>
            ) : null}
            {canResume ? (
              <button className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-semibold text-white" onClick={() => workflowMutation.mutate('resume')} type="button">
                Resume
              </button>
            ) : null}
          </div>
        ) : null
      }
    >
      {mode === 'preview' ? (
        <p className="mb-4 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          Quotation preview. Review plan, billing, products, and totals before confirmation.
        </p>
      ) : null}
      {message ? <p className="mb-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{message}</p> : null}
      {error ? <p className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-slate-300">
            {subscription.customerContact.name} | {subscription.status} | {subscription.recurringPlan?.name ?? 'Recurring plan'}
          </p>
          <div className="mt-5 overflow-x-auto overflow-y-hidden rounded-3xl border border-white/10">
            <table className="min-w-[720px] w-full text-left text-sm">
              <thead className="bg-white/6 text-slate-300">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Quantity</th>
                  <th className="px-4 py-3">Unit Price</th>
                  <th className="px-4 py-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {subscription.lines.map((line) => (
                  <tr className="border-t border-white/10 text-slate-100" key={line.id}>
                    <td className="px-4 py-3">
                      <p>{line.productNameSnapshot}</p>
                      {line.variant?.name ? <p className="text-xs text-slate-400">{line.variant.name}</p> : null}
                    </td>
                    <td className="px-4 py-3">{line.quantity}</td>
                    <td className="px-4 py-3">{formatCurrency(line.unitPrice)}</td>
                    <td className="px-4 py-3">{formatCurrency(line.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            {subscription.invoices.map((invoice) => (
              <Link className="rounded-full border border-white/10 bg-white/6 px-4 py-3 text-sm font-semibold text-white" key={invoice.id} to={`/account/invoices/${invoice.id}`}>
                {invoice.invoiceNumber}
              </Link>
            ))}
            {subscription.invoices.length === 0 ? <span className="rounded-full border border-dashed border-white/10 px-4 py-3 text-sm text-slate-400">No invoices yet</span> : null}
          </div>
        </div>
        <div className="grid gap-4">
          <div className="rounded-[28px] border border-white/10 bg-slate-950/35 p-5">
            <p className="text-sm font-semibold text-slate-200">Subscription summary</p>
            <div className="mt-4 grid gap-3 text-sm text-slate-300">
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
          <div className="rounded-[28px] border border-white/10 bg-slate-950/35 p-5">
            <p className="text-sm font-semibold text-slate-200">Lifecycle history</p>
            <div className="mt-4 grid gap-3">
              {subscription.parentOrder ? (
                <Link className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-slate-200" to={`/account/orders/${subscription.parentOrder.id}`}>
                  Parent order: {subscription.parentOrder.subscriptionNumber} | {subscription.parentOrder.status}
                </Link>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-slate-300">This is the root subscription.</div>
              )}
              {historyItems.map((child) => (
                <Link className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-slate-200" key={child.id} to={`/account/orders/${child.id}`}>
                  {child.label}: {child.subscriptionNumber} | {child.status} | {formatDate(child.createdAt)}
                </Link>
              ))}
              {historyItems.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 px-4 py-3 text-sm text-slate-400">No renewals or upsells yet.</div> : null}
            </div>
          </div>
          {subscription.notes ? (
            <div className="rounded-[28px] border border-white/10 bg-slate-950/35 p-5">
              <p className="text-sm font-semibold text-slate-200">Notes</p>
              <p className="mt-3 text-sm text-slate-300">{subscription.notes}</p>
            </div>
          ) : null}
        </div>
      </div>
    </Surface>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
      <span>{label}</span>
      <span className="text-right text-white">{value}</span>
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
    <div className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
      <div className="mt-0.5 text-cyan-300">{icon}</div>
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
        <p className="mt-1 font-medium text-white">{value}</p>
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
    <label className="grid gap-2 text-sm text-slate-200">
      {label}
      <input className={fieldClass} disabled value={value} />
    </label>
  );
}

function EditableField({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="grid gap-2 text-sm text-slate-200">
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
