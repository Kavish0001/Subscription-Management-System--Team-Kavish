import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';

import { Surface } from '../../components/layout';
import { apiRequest, formatCurrency, formatDate, type Contact, type Invoice, type Subscription } from '../../lib/api';
import { useSession } from '../../lib/session';

const fieldClass = 'rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3';

export function ProfilePage() {
  const { token, user } = useSession();
  const contactQuery = useQuery({
    queryKey: ['profile-contact'],
    queryFn: () => apiRequest<Contact>('/contacts/me', { token })
  });
  const ordersQuery = useQuery({
    queryKey: ['profile-orders'],
    queryFn: () => apiRequest<Subscription[]>('/subscriptions', { token })
  });

  const latestSubscriptions = ordersQuery.data?.slice(0, 3) ?? [];

  return (
    <Surface title="My Profile">
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="grid gap-4 md:grid-cols-2">
          <ReadOnlyField label="Name" value={contactQuery.data?.name ?? 'Portal User'} />
          <ReadOnlyField label="Email" value={user?.email ?? ''} />
          <ReadOnlyField label="Phone Number" value={contactQuery.data?.phone ?? 'Not set'} />
          <ReadOnlyField label="Related Contact" value={contactQuery.data?.id ?? 'Linked automatically'} />
          <ReadOnlyField
            label="Address"
            value={
              contactQuery.data?.addresses[0]
                ? `${contactQuery.data.addresses[0].line1}, ${contactQuery.data.addresses[0].city}`
                : 'No address'
            }
          />
          <div className="flex items-end">
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
                  {subscription.recurringPlan?.name ?? 'Recurring plan'} • {subscription.status}
                </p>
                <p className="text-sm text-slate-400">
                  Start {formatDate(subscription.startDate)} • Next invoice {formatDate(subscription.nextInvoiceDate)}
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
  const subscriptionsQuery = useQuery({
    queryKey: ['portal-orders'],
    queryFn: () => apiRequest<Subscription[]>('/subscriptions', { token })
  });

  return (
    <Surface title="My Orders">
      <div className="overflow-hidden rounded-3xl border border-white/10">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/6 text-slate-300">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Download</th>
            </tr>
          </thead>
          <tbody>
            {subscriptionsQuery.data?.map((subscription) => (
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
                  <button className="text-amber-300" onClick={() => window.print()} type="button">
                    Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Surface>
  );
}

export function OrderDetailPage() {
  const { id } = useParams();
  const { token } = useSession();
  const subscriptionQuery = useQuery({
    queryKey: ['portal-order', id],
    queryFn: () => apiRequest<Subscription>(`/subscriptions/${id}`, { token }),
    enabled: Boolean(id)
  });

  const subscription = subscriptionQuery.data;

  if (!subscription) {
    return (
      <Surface title="Order">
        <p className="text-slate-300">Order not found.</p>
      </Surface>
    );
  }

  return (
    <Surface title={subscription.subscriptionNumber}>
      <p className="text-slate-300">
        {subscription.customerContact.name} • {subscription.status} • {subscription.recurringPlan?.name ?? 'Recurring plan'}
      </p>
      <div className="mt-5 overflow-hidden rounded-3xl border border-white/10">
        <table className="min-w-full text-left text-sm">
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
                <td className="px-4 py-3">{line.productNameSnapshot}</td>
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
      </div>
    </Surface>
  );
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
      title={invoice.invoiceNumber}
      actions={
        <div className="flex flex-wrap gap-3">
          {invoice.subscriptionOrder ? (
            <Link className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-semibold text-white" to={`/account/orders/${invoice.subscriptionOrder.id}`}>
              Subscription
            </Link>
          ) : null}
          <button className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-semibold text-white" onClick={() => window.print()} type="button">
            Print
          </button>
          {invoice.status !== 'paid' ? (
            <button className="rounded-full bg-gradient-to-r from-sky-300 to-indigo-400 px-4 py-2 text-sm font-semibold text-slate-950" onClick={() => payMutation.mutate()} type="button">
              Pay
            </button>
          ) : null}
        </div>
      }
    >
      <p className="mb-4 text-slate-300">
        Due {formatDate(invoice.dueDate)} • Amount Due {formatCurrency(invoice.amountDue)}
      </p>
      <div className="overflow-hidden rounded-3xl border border-white/10">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/6 text-slate-300">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Quantity</th>
              <th className="px-4 py-3">Unit Price</th>
              <th className="px-4 py-3">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((line) => (
              <tr className="border-t border-white/10 text-slate-100" key={line.id}>
                <td className="px-4 py-3">{line.productNameSnapshot}</td>
                <td className="px-4 py-3">{line.quantity}</td>
                <td className="px-4 py-3">{formatCurrency(line.unitPrice)}</td>
                <td className="px-4 py-3">{formatCurrency(line.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Surface>
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
