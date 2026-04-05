import { useCartStore } from '@/store/cartStore';
import { formatCurrency } from '@/lib/formatters';
import { Separator } from '@/components/ui/separator';

export function OrderSummaryCard() {
  const { items, discount, subtotal, total } = useCartStore();
  const sub = subtotal();
  const tax = sub * 0.18; // simplified; real tax from backend
  const dis = discount?.discountAmount ?? 0;

  return (
    <div className="bg-card border rounded-lg p-4 sticky top-4">
      <h3 className="font-semibold text-lg mb-4">Order Summary</h3>
      <div className="space-y-3 mb-4">
        {items.map(item => (
          <div key={`${item.productId}-${item.variantId}`} className="flex items-start gap-3">
            <div className="w-10 h-10 bg-muted rounded flex-shrink-0 flex items-center justify-center text-xs text-muted-foreground">
              {item.productName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.productName}</p>
              <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
            </div>
            <p className="text-sm font-medium">{formatCurrency(item.unitPrice * item.quantity)}</p>
          </div>
        ))}
      </div>
      <Separator className="my-3" />
      {dis > 0 && (
        <div className="flex justify-between text-sm text-green-600 mb-1">
          <span>{discount?.ruleName}</span>
          <span>-{formatCurrency(dis)}</span>
        </div>
      )}
      <div className="flex justify-between text-sm mb-1">
        <span className="text-muted-foreground">Subtotal</span>
        <span>{formatCurrency(sub)}</span>
      </div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-muted-foreground">Tax (18%)</span>
        <span>{formatCurrency(tax)}</span>
      </div>
      <Separator className="my-3" />
      <div className="flex justify-between font-semibold">
        <span>Total</span>
        <span className="text-primary">{formatCurrency(total() + tax)}</span>
      </div>
    </div>
  );
}
