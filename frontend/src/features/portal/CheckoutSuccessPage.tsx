import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { CheckCircle, Download, Package } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { StatusBadge } from '@/components/StatusBadge';

export function CheckoutSuccessPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const sub = state?.subscription;
  const invoice = state?.invoice;

  useEffect(() => {
    if (!sub) navigate('/');
  }, [sub]);

  if (!sub) return null;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Success header */}
      <div className="text-center mb-8">
        <div className="inline-flex p-4 bg-green-100 rounded-full mb-4">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Order Placed Successfully!</h1>
        <p className="text-muted-foreground">
          Thank you for your order. Your subscription <span className="font-mono font-medium text-foreground">{sub.subscriptionNumber}</span> has been created.
        </p>
      </div>

      {/* Order summary */}
      <div className="bg-card border rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Order Summary</h3>
          <StatusBadge status={sub.status} />
        </div>

        <div className="space-y-3 mb-4">
          {sub.lines?.map((l: any) => (
            <div key={l.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-muted rounded flex items-center justify-center text-xs font-bold text-muted-foreground">
                  {l.productNameSnapshot?.[0]}
                </div>
                <div>
                  <p className="text-sm font-medium">{l.productNameSnapshot}</p>
                  <p className="text-xs text-muted-foreground">Qty: {l.quantity}</p>
                </div>
              </div>
              <span className="text-sm font-medium">{formatCurrency(l.lineTotal)}</span>
            </div>
          ))}
        </div>

        <Separator className="my-4" />

        <div className="space-y-2 text-sm">
          {Number(sub.discountAmount) > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>-{formatCurrency(sub.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(sub.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax</span>
            <span>{formatCurrency(sub.taxAmount)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-bold text-base">
            <span>Total</span>
            <span className="text-primary">{formatCurrency(sub.totalAmount)}</span>
          </div>
          {invoice && (
            <div className="flex justify-between text-green-600 pt-1">
              <span>Payment Status</span>
              <StatusBadge status={invoice.status} />
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        <Button onClick={() => {
          // Native browser dialog allows "Save as PDF" which is standard practice for modern web apps
          window.print();
        }} variant="outline">
          <Download className="h-4 w-4 mr-2" />Download Receipt (PDF)
        </Button>
        <Button asChild>
          <Link to="/account/orders">
            <Package className="h-4 w-4 mr-2" />View My Orders
          </Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link to="/shop">Continue Shopping</Link>
        </Button>
      </div>
    </div>
  );
}
