import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { useMyContacts } from '@/api/contacts';
import { useCreateSubscription } from '@/api/subscriptions';
import { useCreateInvoice, useMockPayment } from '@/api/invoices';
import { Button } from '@/components/ui/button';
import { OrderSummaryCard } from '@/components/OrderSummaryCard';
import { Card, CardContent } from '@/components/ui/card';
import { CreditCard, Building2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CheckoutPaymentPage() {
  const navigate = useNavigate();
  const { items, discount, clear } = useCartStore();
  const { user } = useAuthStore();
  const { data: contacts } = useMyContacts();
  const [method, setMethod] = useState('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const createSubMut = useCreateSubscription();
  const createInvoiceMut = useCreateInvoice();
  const mockPaymentMut = useMockPayment();

  const defaultContact = contacts?.find((c: any) => c.isDefault) ?? contacts?.[0];

  const handlePay = async () => {
    if (!defaultContact) {
      setError('No contact found. Please complete your profile first.');
      return;
    }
    setIsProcessing(true);
    setError('');
    try {
      const sub = await createSubMut.mutateAsync({
        customerContactId: defaultContact.id,
        sourceChannel: 'portal',
        lines: items.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          productNameSnapshot: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: 0,
        })),
        discountCode: discount?.code,
      });
      const invoice = await createInvoiceMut.mutateAsync(sub.id);
      await mockPaymentMut.mutateAsync(invoice.id);
      clear();
      navigate('/checkout/success', { state: { subscription: sub, invoice } });
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm mb-8">
        {['Order Review', 'Address', 'Payment'].map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            {i > 0 && <div className="h-px w-8 bg-primary/30" />}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${i === 2 ? 'bg-primary text-primary-foreground' : 'bg-primary/20 text-primary'}`}>
              <span>{i + 1}</span><span>{step}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <p className="font-medium mb-3">Select Payment Method</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { value: 'card', label: 'Credit / Debit Card', icon: CreditCard },
                { value: 'upi', label: 'UPI / Net Banking', icon: Building2 },
              ].map(m => (
                <button
                  key={m.value}
                  onClick={() => setMethod(m.value)}
                  className={cn('flex items-center gap-3 p-4 rounded-lg border text-left transition-colors', method === m.value ? 'border-primary bg-primary/5' : 'hover:border-primary/50 border-border')}
                >
                  <m.icon className={cn('h-5 w-5', method === m.value ? 'text-primary' : 'text-muted-foreground')} />
                  <span className={cn('font-medium text-sm', method === m.value ? 'text-foreground' : 'text-muted-foreground')}>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="pt-4 pb-4 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-700">
                <span className="font-medium">Demo mode:</span> This is a test payment. No real transaction will occur.
              </p>
            </CardContent>
          </Card>

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/checkout/address')}>Back</Button>
            <Button size="lg" onClick={handlePay} disabled={isProcessing || !defaultContact}>
              {isProcessing ? 'Processing...' : 'Complete Payment'}
            </Button>
          </div>
        </div>
        <div><OrderSummaryCard /></div>
      </div>
    </div>
  );
}
