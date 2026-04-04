import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { Surface } from '../../components/layout';
import { apiRequest, formatCurrency, type Contact } from '../../lib/api';
import { ApiError } from '../../lib/api';
import { cartSubtotal, useCartStore } from '../../lib/cart';
import { useSession } from '../../lib/session';

const checkoutAddressKey = 'veltrix-checkout-address';
const fieldClass = 'rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3';

type CheckoutAddress = {
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export function CartPage() {
  const items = useCartStore((state) => state.items);
  const discountCode = useCartStore((state) => state.discountCode);
  const applyDiscount = useCartStore((state) => state.applyDiscount);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const [codeInput, setCodeInput] = useState(discountCode);
  const [discountMessage, setDiscountMessage] = useState<string | null>(null);

  return (
    <Surface title="Cart">
      <div className="mb-5 flex flex-wrap gap-3 text-sm text-slate-300">
        <span className="rounded-full bg-white/6 px-4 py-2">Order</span>
        <span className="rounded-full border border-white/10 px-4 py-2">Address</span>
        <span className="rounded-full border border-white/10 px-4 py-2">Payment</span>
      </div>
      {items.length === 0 ? (
        <p className="text-slate-300">Your cart is empty. Add a product from the shop first.</p>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="grid gap-4">
            {items.map((item) => (
              <div className="rounded-[24px] border border-white/10 bg-slate-950/35 p-5" key={`${item.productId}-${item.recurringPlanId}`}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="break-words text-xl font-semibold text-white">{item.name}</p>
                    <p className="mt-1 text-sm text-slate-400">{item.recurringPlanName}</p>
                    <p className="mt-3 text-sm text-slate-300">{formatCurrency(item.unitPrice)} each</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                    <input className={`${fieldClass} w-24`} min={1} onChange={(event) => updateQuantity(item.productId, item.recurringPlanId, Number(event.target.value))} type="number" value={item.quantity} />
                    <button className="rounded-full border border-white/10 px-4 py-3 text-sm text-white" onClick={() => removeItem(item.productId, item.recurringPlanId)} type="button">
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-[28px] border border-white/10 bg-slate-950/35 p-5 xl:sticky xl:top-8 xl:self-start">
            <label className="grid gap-2 text-sm text-slate-200">
              Discount code
              <div className="flex flex-col gap-3 sm:flex-row">
                <input className={`${fieldClass} min-w-0 flex-1`} onChange={(event) => setCodeInput(event.target.value)} value={codeInput} />
                <button
                  className="rounded-full bg-white/10 px-4 py-3 text-sm font-semibold text-white"
                  onClick={() => setDiscountMessage(applyDiscount(codeInput) ? 'Discount applied.' : 'Invalid code.')}
                  type="button"
                >
                  Apply
                </button>
              </div>
            </label>
            {discountMessage ? <p className="mt-3 text-sm text-slate-300">{discountMessage}</p> : null}
            <SummaryCard />
            <Link className="mt-5 inline-flex rounded-full bg-gradient-to-r from-emerald-300 to-sky-400 px-5 py-3 font-semibold text-slate-950" to="/checkout/address">
              Checkout
            </Link>
          </div>
        </div>
      )}
    </Surface>
  );
}

export function CheckoutAddressPage() {
  const navigate = useNavigate();
  const { token } = useSession();
  const items = useCartStore((state) => state.items);
  const [useAlternateAddress, setUseAlternateAddress] = useState(false);
  const [alternateAddress, setAlternateAddress] = useState({
    line1: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India'
  });

  const contactQuery = useQuery({
    queryKey: ['portal-contact'],
    queryFn: () => apiRequest<Contact>('/contacts/me', { token })
  });

  const defaultAddress = contactQuery.data?.addresses.find((address) => address.isDefault) ?? contactQuery.data?.addresses[0];

  return (
    <Surface title="Address">
      {items.length === 0 ? (
        <p className="text-slate-300">Cart is empty.</p>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="grid gap-4">
            <div className="rounded-[28px] border border-white/10 bg-slate-950/35 p-5">
              <p className="text-sm font-semibold text-slate-200">Default address</p>
              {defaultAddress ? (
                <div className="mt-3">
                  <AddressPreview address={defaultAddress} />
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-400">No default address found.</p>
              )}
            </div>
            <label className="flex items-center gap-3 text-sm text-slate-200">
              <input checked={useAlternateAddress} onChange={(event) => setUseAlternateAddress(event.target.checked)} type="checkbox" />
              Use a different address
            </label>
            {useAlternateAddress ? (
              <div className="grid gap-4 md:grid-cols-2">
                <input className={fieldClass} onChange={(event) => setAlternateAddress((value) => ({ ...value, line1: event.target.value }))} placeholder="Address line 1" value={alternateAddress.line1} />
                <input className={fieldClass} onChange={(event) => setAlternateAddress((value) => ({ ...value, city: event.target.value }))} placeholder="City" value={alternateAddress.city} />
                <input className={fieldClass} onChange={(event) => setAlternateAddress((value) => ({ ...value, state: event.target.value }))} placeholder="State" value={alternateAddress.state} />
                <input className={fieldClass} onChange={(event) => setAlternateAddress((value) => ({ ...value, postalCode: event.target.value }))} placeholder="Postal code" value={alternateAddress.postalCode} />
              </div>
            ) : null}
          </div>
          <SummaryCard
            actions={
              <button
                className="rounded-full bg-gradient-to-r from-emerald-300 to-sky-400 px-5 py-3 font-semibold text-slate-950"
                onClick={() => {
                  const chosenAddress = useAlternateAddress && alternateAddress.line1 ? alternateAddress : defaultAddress;
                  window.sessionStorage.setItem(checkoutAddressKey, JSON.stringify(chosenAddress ?? null));
                  navigate('/checkout/payment');
                }}
                type="button"
              >
                Continue
              </button>
            }
          />
        </div>
      )}
    </Surface>
  );
}

export function CheckoutPaymentPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { token } = useSession();
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clear);
  const discountCode = useCartStore((state) => state.discountCode);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [error, setError] = useState<string | null>(null);

  const contactQuery = useQuery({
    queryKey: ['payment-contact'],
    queryFn: () => apiRequest<Contact>('/contacts/me', { token })
  });

  const paymentMutation = useMutation({
    mutationFn: async () => {
      if (!contactQuery.data) {
        throw new ApiError('Contact not loaded', 400);
      }

      return apiRequest<{ subscriptionIds: string[]; invoiceIds: string[] }>('/checkout/complete', {
        token,
        method: 'POST',
        body: JSON.stringify({
          paymentMethod,
          discountCode: discountCode || undefined,
          lines: items.map((item) => ({
            productId: item.productId,
            recurringPlanId: item.recurringPlanId,
            quantity: item.quantity
          }))
        })
      });
    },
    onSuccess: async (result) => {
      clearCart();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['portal-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['portal-invoice'] })
      ]);
      navigate(`/checkout/success?subscriptions=${result.subscriptionIds.join(',')}&invoices=${result.invoiceIds.join(',')}`);
    },
    onError: (mutationError) => {
      setError(mutationError instanceof ApiError ? mutationError.message : 'Payment failed');
    }
  });

  return (
    <Surface title="Payment">
      {items.length === 0 ? (
        <p className="text-slate-300">Cart is empty.</p>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="rounded-[28px] border border-white/10 bg-slate-950/35 p-5">
            <p className="mb-4 text-slate-300">Demo gateway is active for the hackathon flow.</p>
            <select className={`${fieldClass} mb-4 max-w-[220px]`} onChange={(event) => setPaymentMethod(event.target.value)} value={paymentMethod}>
              <option value="card">Card</option>
              <option value="upi">UPI</option>
              <option value="netbanking">Net Banking</option>
            </select>
            <div className="rounded-[24px] border border-white/10 bg-white/6 p-4 text-sm text-slate-300">
              <p className="font-semibold text-white">Delivery / invoice address</p>
              <div className="mt-3">
                <AddressBlock />
              </div>
            </div>
            {error ? <p className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
          </div>
          <SummaryCard
            actions={
              <button className="rounded-full bg-gradient-to-r from-sky-300 to-indigo-400 px-5 py-3 font-semibold text-slate-950" onClick={() => paymentMutation.mutate()} type="button">
                Pay now
              </button>
            }
          />
        </div>
      )}
    </Surface>
  );
}

export function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const subscriptions = searchParams.get('subscriptions')?.split(',').filter(Boolean) ?? [];
  const invoices = searchParams.get('invoices')?.split(',').filter(Boolean) ?? [];

  return (
    <Surface title="Thanks for your order">
      <p className="text-slate-300">Payment processed successfully. Thanks for your order.</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link className="rounded-full bg-gradient-to-r from-emerald-300 to-sky-400 px-5 py-3 font-semibold text-slate-950" to="/account/orders">
          View my orders
        </Link>
        {subscriptions[0] ? (
          <Link className="rounded-full border border-white/10 bg-white/6 px-5 py-3 font-semibold text-white" to={`/account/orders/${subscriptions[0]}`}>
            Open latest order
          </Link>
        ) : null}
        {invoices[0] ? (
          <Link className="rounded-full border border-white/10 bg-white/6 px-5 py-3 font-semibold text-white" to={`/account/invoices/${invoices[0]}`}>
            Open invoice
          </Link>
        ) : null}
      </div>
    </Surface>
  );
}

function SummaryCard({ actions }: { actions?: React.ReactNode }) {
  const items = useCartStore((state) => state.items);
  const discountPercent = useCartStore((state) => state.discountPercent);
  const subtotal = cartSubtotal(items);
  const discountAmount = subtotal * (discountPercent / 100);
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = taxableAmount * 0.18;
  const total = taxableAmount + taxAmount;

  return (
    <div className="rounded-[28px] border border-white/10 bg-slate-950/35 p-5 xl:sticky xl:top-8 xl:self-start">
      <div className="grid gap-2 text-slate-200">
        <p>Subtotal: {formatCurrency(subtotal)}</p>
        <p>Discount: {formatCurrency(discountAmount)}</p>
        <p>Tax: {formatCurrency(taxAmount)}</p>
        <p className="text-lg font-semibold">Total: {formatCurrency(total)}</p>
      </div>
      <div className="mt-5">{actions}</div>
    </div>
  );
}

function AddressBlock() {
  const rawAddress = window.sessionStorage.getItem(checkoutAddressKey);

  if (!rawAddress) {
    return <p className="text-sm text-slate-400">Default address will be used.</p>;
  }

  try {
    const parsed = JSON.parse(rawAddress) as CheckoutAddress | null;

    if (!parsed?.line1) {
      return <p className="text-sm text-slate-400">Default address will be used.</p>;
    }

    return <AddressPreview address={parsed} />;
  } catch {
    return <p className="text-sm text-slate-400">Default address will be used.</p>;
  }
}

function AddressPreview({ address }: { address: CheckoutAddress }) {
  return (
    <div className="rounded-[20px] border border-white/8 bg-slate-950/30 px-4 py-3 text-sm text-slate-300">
      <p className="break-words text-white">{address.line1}</p>
      {address.line2 ? <p className="mt-1 break-words">{address.line2}</p> : null}
      <p className="mt-1 break-words">
        {address.city}, {address.state} {address.postalCode}
      </p>
      <p className="mt-1">{address.country}</p>
    </div>
  );
}
