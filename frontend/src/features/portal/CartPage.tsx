import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '@/store/cartStore';
import { useValidateDiscount } from '@/api/contacts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OrderSummaryCard } from '@/components/OrderSummaryCard';
import { formatCurrency } from '@/lib/formatters';
import { Trash2, ShoppingBag, Tag } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';

export function CartPage() {
  const { items, removeItem, updateQty, applyDiscount, removeDiscount, discount } = useCartStore();
  const [code, setCode] = useState('');
  const validateMut = useValidateDiscount();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
        <p className="text-muted-foreground mb-6">Looks like you haven't added anything yet.</p>
        <Button asChild><Link to="/shop">Browse Products</Link></Button>
      </div>
    );
  }

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Shopping Cart</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm mb-8">
        {['Order Review', 'Address', 'Payment'].map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            {i > 0 && <div className="h-px w-8 bg-border" />}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${i === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              <span>{i + 1}</span><span>{step}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Items */}
          <div className="bg-card border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Product</th>
                    <th className="text-center p-3 font-medium w-28">Quantity</th>
                    <th className="text-right p-3 font-medium w-28">Price</th>
                    <th className="text-right p-3 font-medium w-28">Amount</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={`${item.productId}-${item.variantId}`} className="border-t">
                      <td className="p-3">
                        <p className="font-medium">{item.productName}</p>
                      </td>
                      <td className="p-3">
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={e => updateQty(item.productId, item.variantId, Number(e.target.value))}
                          className="h-7 text-center w-16 mx-auto"
                        />
                      </td>
                      <td className="p-3 text-right text-muted-foreground">{formatCurrency(item.unitPrice)}</td>
                      <td className="p-3 text-right font-medium">{formatCurrency(item.unitPrice * item.quantity)}</td>
                      <td className="p-3">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(item.productId, item.variantId)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Discount code */}
          <div className="bg-card border rounded-lg p-4">
            <p className="text-sm font-medium mb-3 flex items-center gap-2"><Tag className="h-4 w-4" />Discount Code</p>
            {discount ? (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-md px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-green-700">{discount.ruleName}</p>
                  <p className="text-xs text-green-600">-{formatCurrency(discount.discountAmount)} saved</p>
                </div>
                <Button variant="ghost" size="sm" onClick={removeDiscount} className="text-red-500 hover:text-red-700">Remove</Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Enter code (e.g. SAVE20)"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  className="max-w-xs"
                />
                <Button
                  variant="outline"
                  onClick={() => validateMut.mutate({ code, subtotal }, {
                    onSuccess: (d) => { applyDiscount({ code, discountAmount: d.discountAmount, ruleName: d.rule.name }); setCode(''); }
                  })}
                  disabled={validateMut.isPending || !code}
                >
                  {validateMut.isPending ? 'Checking...' : 'Apply'}
                </Button>
              </div>
            )}
            {validateMut.isError && (
              <p className="text-sm text-destructive mt-2">{(validateMut.error as any)?.response?.data?.error ?? 'Invalid discount code'}</p>
            )}
          </div>

          <div className="flex justify-end">
            {user ? (
              <Button size="lg" onClick={() => navigate('/checkout/address')}>
                Proceed to Checkout
              </Button>
            ) : (
              <Button size="lg" asChild>
                <Link to="/login">Login to Checkout</Link>
              </Button>
            )}
          </div>
        </div>

        <div><OrderSummaryCard /></div>
      </div>
    </div>
  );
}
