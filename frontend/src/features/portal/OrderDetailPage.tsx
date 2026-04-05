import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSubscription, useRenewSubscription, useCloseSubscription } from '@/api/subscriptions';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Printer, RefreshCw, X, ArrowLeft, Package } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';

export function OrderDetailPage() {
  const { orderNumber } = useParams();
  const navigate = useNavigate();
  const { data: sub, isLoading } = useSubscription(orderNumber!);
  const renewMut = useRenewSubscription();
  const closeMut = useCloseSubscription();
  const [closeOpen, setCloseOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}
      </div>
    );
  }

  if (!sub) {
    return (
      <div className="text-center py-16">
        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Order not found</p>
        <Button variant="ghost" size="sm" className="mt-2" onClick={() => navigate('/account/orders')}>Back to Orders</Button>
      </div>
    );
  }

  const plan = sub.recurringPlan;

  return (
    <div>
      {/* Account tabs */}
      <div className="flex gap-2 mb-6">
        <Link to="/account/profile" className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">My Profile</Link>
        <div className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">My Orders</div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <button onClick={() => navigate('/account/orders')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors">
            <ArrowLeft className="h-4 w-4" />Back to Orders
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{sub.subscriptionNumber}</h1>
            <StatusBadge status={sub.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">Placed on {formatDate(sub.createdAt)}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" />Print
          </Button>
          {plan?.isRenewable && (
            <Button size="sm" onClick={() => renewMut.mutate(sub.id)} disabled={renewMut.isPending}>
              <RefreshCw className="h-4 w-4 mr-1" />{renewMut.isPending ? 'Renewing...' : 'Renew'}
            </Button>
          )}
          {plan?.isClosable && sub.status === 'active' && (
            <Button variant="destructive" size="sm" onClick={() => setCloseOpen(true)}>
              <X className="h-4 w-4 mr-1" />Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-card border rounded-lg p-4">
          <h3 className="font-medium mb-3 text-sm uppercase tracking-wide text-muted-foreground">Subscription Details</h3>
          <dl className="space-y-2 text-sm">
            {[
              ['Plan', plan?.name ?? 'One-time'],
              ['Start Date', sub.startDate ? formatDate(sub.startDate) : '—'],
              ['Expiration', sub.expirationDate ? formatDate(sub.expirationDate) : '—'],
              ['Next Invoice', sub.nextInvoiceDate ? formatDate(sub.nextInvoiceDate) : '—'],
            ].map(([k, v]) => (
              <div key={String(k)} className="flex justify-between">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-medium">{v || '—'}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <h3 className="font-medium mb-3 text-sm uppercase tracking-wide text-muted-foreground">Bill To</h3>
          <dl className="space-y-2 text-sm">
            {[
              ['Name', sub.customerContact?.name],
              ['Email', sub.customerContact?.email],
              ['Phone', sub.customerContact?.phone],
            ].filter(([, v]) => v).map(([k, v]) => (
              <div key={String(k)} className="flex justify-between">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-medium">{v || '—'}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Products table */}
      <div className="bg-card border rounded-lg overflow-hidden mb-6">
        <h3 className="font-medium px-4 py-3 border-b bg-muted/30">Products</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Product</th>
                <th className="text-right p-3 font-medium">Qty</th>
                <th className="text-right p-3 font-medium">Unit Price</th>
                <th className="text-right p-3 font-medium">Tax</th>
                <th className="text-right p-3 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {sub.lines?.map((l: any) => (
                <tr key={l.id} className="border-t">
                  <td className="p-3 font-medium">{l.productNameSnapshot}</td>
                  <td className="p-3 text-right">{l.quantity}</td>
                  <td className="p-3 text-right">{formatCurrency(l.unitPrice)}</td>
                  <td className="p-3 text-right">{formatCurrency(l.taxAmount)}</td>
                  <td className="p-3 text-right font-medium">{formatCurrency(l.lineTotal)}</td>
                </tr>
              ))}
              {Number(sub.discountAmount) > 0 && (
                <tr className="border-t bg-green-50">
                  <td className="p-3 text-green-700 font-medium" colSpan={4}>Discount Applied</td>
                  <td className="p-3 text-right text-green-700 font-medium">-{formatCurrency(sub.discountAmount)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t flex justify-end">
          <div className="w-48 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax Total</span>
              <span>{formatCurrency(sub.taxAmount)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-base">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(sub.totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Invoices */}
      {sub.invoices?.length > 0 && (
        <div className="bg-card border rounded-lg overflow-hidden">
          <h3 className="font-medium px-4 py-3 border-b bg-muted/30">Invoices</h3>
          <div className="divide-y">
            {sub.invoices.map((inv: any) => (
              <Link key={inv.id} to={`/account/invoices/${inv.id}`} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                <div>
                  <p className="font-medium text-sm">{inv.invoiceNumber}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(inv.invoiceDate)}</p>
                </div>
                <div className="text-right flex items-center gap-3">
                  <p className="font-medium">{formatCurrency(inv.totalAmount)}</p>
                  <StatusBadge status={inv.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={closeOpen}
        title="Cancel Subscription"
        description="Are you sure you want to cancel this subscription? This action cannot be undone."
        onConfirm={() => closeMut.mutate(sub.id, { onSuccess: () => { setCloseOpen(false); navigate('/account/orders'); } })}
        onCancel={() => setCloseOpen(false)}
        confirmLabel="Cancel Subscription"
        isLoading={closeMut.isPending}
      />
    </div>
  );
}
