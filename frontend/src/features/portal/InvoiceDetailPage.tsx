import { useParams, useNavigate } from 'react-router-dom';
import { useInvoice, useMockPayment } from '@/api/invoices';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Printer, ArrowLeft, CreditCard, FileText } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export function InvoiceDetailPage() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const { data: invoice, isLoading } = useInvoice(invoiceId!);
  const payMut = useMockPayment();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-16">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Invoice not found</p>
        <Button variant="ghost" size="sm" className="mt-2" onClick={() => navigate('/account/orders')}>Back to Orders</Button>
      </div>
    );
  }

  const isPaid = invoice.status === 'paid';

  return (
    <div className="max-w-3xl">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" />Back
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{invoice.invoiceNumber}</h1>
          {invoice.subscriptionOrder?.subscriptionNumber && (
            <p className="text-muted-foreground text-sm mt-1">
              Order: <span className="font-mono">{invoice.subscriptionOrder.subscriptionNumber}</span>
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <StatusBadge status={invoice.status} />
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" />Print
          </Button>
          {!isPaid && (
            <Button size="sm" onClick={() => payMut.mutate(invoice.id)} disabled={payMut.isPending}>
              <CreditCard className="h-4 w-4 mr-1" />
              {payMut.isPending ? 'Processing...' : 'Pay Now'}
            </Button>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-card border rounded-lg p-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Invoice Details</h3>
          <dl className="space-y-2 text-sm">
            {[
              ['Invoice Date', formatDate(invoice.invoiceDate)],
              ['Due Date', invoice.dueDate ? formatDate(invoice.dueDate) : '—'],
              ['Payment Term', invoice.paymentTermLabel ?? '—'],
            ].map(([k, v]) => (
              <div key={String(k)} className="flex justify-between">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Bill To</h3>
          <p className="font-medium">{invoice.contact?.name ?? invoice.subscriptionOrder?.customerContact?.name}</p>
          <p className="text-sm text-muted-foreground mt-1">{invoice.contact?.email ?? invoice.subscriptionOrder?.customerContact?.email}</p>
        </div>
      </div>

      {/* Line items */}
      <div className="bg-card border rounded-lg overflow-hidden mb-6">
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
              {(invoice.lines ?? invoice.subscriptionOrder?.lines)?.map((l: any, i: number) => (
                <tr key={l.id ?? i} className="border-t">
                  <td className="p-3 font-medium">{l.productNameSnapshot}</td>
                  <td className="p-3 text-right">{l.quantity}</td>
                  <td className="p-3 text-right">{formatCurrency(l.unitPrice)}</td>
                  <td className="p-3 text-right">{formatCurrency(l.taxAmount ?? 0)}</td>
                  <td className="p-3 text-right font-medium">{formatCurrency(l.lineTotal)}</td>
                </tr>
              ))}
              {Number(invoice.discountAmount) > 0 && (
                <tr className="border-t bg-green-50">
                  <td className="p-3 text-green-700 font-medium" colSpan={4}>Discount</td>
                  <td className="p-3 text-right text-green-700 font-medium">-{formatCurrency(invoice.discountAmount)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="p-4 border-t flex justify-end">
          <div className="w-56 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Untaxed Amount</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>{formatCurrency(invoice.taxAmount)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-base">
              <span>Total</span>
              <span>{formatCurrency(invoice.totalAmount)}</span>
            </div>
            {isPaid && invoice.payments?.[0] && (
              <div className="flex justify-between text-green-600">
                <span>Paid on {formatDate(invoice.payments[0].paidAt)}</span>
                <span>{formatCurrency(invoice.payments[0].amount)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold pt-1">
              <span>Amount Due</span>
              <span className={isPaid ? 'text-green-600' : 'text-destructive'}>
                {formatCurrency(isPaid ? 0 : invoice.totalAmount)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Payments */}
      {invoice.payments?.length > 0 && (
        <div className="bg-card border rounded-lg p-4">
          <h3 className="font-medium mb-3 text-sm">Payment History</h3>
          <div className="space-y-2">
            {invoice.payments.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium capitalize">{p.method}</span>
                  <span className="text-muted-foreground ml-2">{formatDate(p.paidAt)}</span>
                </div>
                <span className="font-medium text-green-600">{formatCurrency(p.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
