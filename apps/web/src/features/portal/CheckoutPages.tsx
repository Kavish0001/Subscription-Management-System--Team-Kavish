import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { PrinterIcon } from '../../components/icons';
import {
  apiRequest,
  ApiError,
  formatCurrency,
  formatDate,
  type CheckoutSummary,
  type Contact,
  type Invoice,
  type Subscription
} from '../../lib/api';
import { useCartStore, type CartItem } from '../../lib/cart';
import { useSession } from '../../lib/session';

const checkoutAddressKey = 'veltrix-checkout-address';
const fieldClass =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100';
const panelClass = 'rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]';
const checkoutSteps = ['order', 'address', 'payment'] as const;

type CheckoutStep = (typeof checkoutSteps)[number];

type CheckoutAddress = {
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export function CartPage() {
  const { token } = useSession();
  const items = useCartStore((state) => state.items);
  const discountCode = useCartStore((state) => state.discountCode);
  const applyDiscount = useCartStore((state) => state.applyDiscount);
  const clearDiscount = useCartStore((state) => state.clearDiscount);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const [codeInput, setCodeInput] = useState(discountCode);
  const [discountFeedback, setDiscountFeedback] = useState<string | null>(null);
  const summaryQuery = useCheckoutSummary(token);
  const summaryItems = useSummaryItems(summaryQuery.data);

  return (
    <CheckoutShell
      currentStep="order"
      description="Review selected products, adjust duration or quantity, and apply any discount code before moving ahead."
      title="Cart"
    >
      {items.length === 0 ? (
        <section className={panelClass}>
          <h2 className="text-2xl font-bold tracking-[-0.04em] text-slate-950">Your cart is empty</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Add a subscription product from the shop to start the external customer checkout flow.
          </p>
          <Link
            className="mt-6 inline-flex items-center rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            to="/shop"
          >
            Browse products
          </Link>
        </section>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-4">
            {items.map((item) => {
              const itemKey = cartItemKey(item);
              const pricedLine = summaryItems.get(itemKey);

              return (
                <article className={panelClass} key={itemKey}>
                  <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    <div className="flex min-w-0 gap-4">
                      <ProductThumb imageUrl={item.imageUrl} name={item.name} />
                      <div className="min-w-0">
                        <p className="text-lg font-semibold tracking-[-0.03em] text-slate-950">{item.name}</p>
                        <p className="mt-1 text-sm text-slate-500">{item.recurringPlanName}</p>
                        {item.variantName ? <p className="mt-1 text-sm text-slate-500">{item.variantName}</p> : null}
                        <p className="mt-3 text-sm font-medium text-slate-700">{formatCurrency(item.unitPrice)} each</p>
                        <p className="mt-1 text-sm text-slate-500">
                          Line total: {formatCurrency(pricedLine?.lineTotal ?? item.unitPrice * item.quantity)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <QuantityStepper
                        onChange={(nextQuantity) =>
                          updateQuantity(item.productId, item.recurringPlanId, nextQuantity, item.variantId ?? null)
                        }
                        value={item.quantity}
                      />
                      <button
                        className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
                        onClick={() => removeItem(item.productId, item.recurringPlanId, item.variantId ?? null)}
                        type="button"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <CheckoutSummaryCard
            actions={
              <Link
                className="inline-flex w-full items-center justify-center rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                to="/checkout/address"
              >
                Checkout
              </Link>
            }
            codeInput={codeInput}
            discountFeedback={discountFeedback}
            onApplyCode={() => {
              if (!codeInput.trim()) {
                clearDiscount();
                setDiscountFeedback('Discount code cleared.');
                return;
              }

              applyDiscount(codeInput);
              setDiscountFeedback('Discount code saved. Totals update automatically.');
            }}
            onCodeInputChange={setCodeInput}
            showDiscountInput
            summary={summaryQuery.data}
            summaryError={summaryQuery.error instanceof ApiError ? summaryQuery.error.message : null}
            summaryLoading={summaryQuery.isPending}
          />
        </div>
      )}
    </CheckoutShell>
  );
}

export function CheckoutAddressPage() {
  const navigate = useNavigate();
  const { token } = useSession();
  const items = useCartStore((state) => state.items);
  const [useAlternateAddress, setUseAlternateAddress] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [alternateAddress, setAlternateAddress] = useState<CheckoutAddress>({
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India'
  });
  const contactQuery = usePortalContact(token);
  const summaryQuery = useCheckoutSummary(token);

  const defaultAddress =
    contactQuery.data?.addresses.find((address) => address.isDefault) ?? contactQuery.data?.addresses[0];

  return (
    <CheckoutShell
      currentStep="address"
      description="Use the profile default address by default, or switch to a different delivery and billing address for this order."
      title="Address"
    >
      {items.length === 0 ? (
        <section className={panelClass}>
          <p className="text-sm text-slate-600">Cart is empty. Return to the order step first.</p>
          <Link className="mt-4 inline-flex rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700" to="/cart">
            Back to cart
          </Link>
        </section>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-4">
            <section className={panelClass}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Default address</p>
                  <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-slate-950">Profile address</h2>
                </div>
                {contactQuery.data?.companyName ? (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {contactQuery.data.companyName}
                  </span>
                ) : null}
              </div>

              {defaultAddress ? (
                <div className="mt-4">
                  <AddressPreview address={defaultAddress} />
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">No default address was found on the profile yet.</p>
              )}

              <label className="mt-5 inline-flex items-center gap-3 text-sm font-medium text-slate-700">
                <input
                  checked={useAlternateAddress}
                  className="h-4 w-4 accent-emerald-600"
                  onChange={(event) => setUseAlternateAddress(event.target.checked)}
                  type="checkbox"
                />
                Use a different address for this checkout
              </label>
            </section>

            {useAlternateAddress ? (
              <section className={panelClass}>
                <h3 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">Alternate address</h3>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <input
                    className={`${fieldClass} md:col-span-2`}
                    onChange={(event) => setAlternateAddress((value) => ({ ...value, line1: event.target.value }))}
                    placeholder="Address line 1"
                    value={alternateAddress.line1}
                  />
                  <input
                    className={`${fieldClass} md:col-span-2`}
                    onChange={(event) => setAlternateAddress((value) => ({ ...value, line2: event.target.value }))}
                    placeholder="Address line 2"
                    value={alternateAddress.line2 ?? ''}
                  />
                  <input
                    className={fieldClass}
                    onChange={(event) => setAlternateAddress((value) => ({ ...value, city: event.target.value }))}
                    placeholder="City"
                    value={alternateAddress.city}
                  />
                  <input
                    className={fieldClass}
                    onChange={(event) => setAlternateAddress((value) => ({ ...value, state: event.target.value }))}
                    placeholder="State"
                    value={alternateAddress.state}
                  />
                  <input
                    className={fieldClass}
                    onChange={(event) => setAlternateAddress((value) => ({ ...value, postalCode: event.target.value }))}
                    placeholder="Postal code"
                    value={alternateAddress.postalCode}
                  />
                  <input
                    className={fieldClass}
                    onChange={(event) => setAlternateAddress((value) => ({ ...value, country: event.target.value }))}
                    placeholder="Country"
                    value={alternateAddress.country}
                  />
                </div>
              </section>
            ) : null}

            {addressError ? (
              <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {addressError}
              </p>
            ) : null}
          </div>

          <CheckoutSummaryCard
            actions={
              <button
                className="inline-flex w-full items-center justify-center rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                onClick={() => {
                  const chosenAddress = useAlternateAddress ? alternateAddress : defaultAddress;

                  if (!chosenAddress?.line1 || !chosenAddress.city || !chosenAddress.state || !chosenAddress.postalCode) {
                    setAddressError('Complete the selected address before continuing to payment.');
                    return;
                  }

                  window.sessionStorage.setItem(checkoutAddressKey, JSON.stringify(chosenAddress));
                  setAddressError(null);
                  navigate('/checkout/payment');
                }}
                type="button"
              >
                Continue to payment
              </button>
            }
            detail={
              <div className="rounded-[22px] border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900">
                {useAlternateAddress
                  ? 'Alternate address will be used for this checkout.'
                  : 'The saved profile address is selected by default.'}
              </div>
            }
            summary={summaryQuery.data}
            summaryError={summaryQuery.error instanceof ApiError ? summaryQuery.error.message : null}
            summaryLoading={summaryQuery.isPending}
          />
        </div>
      )}
    </CheckoutShell>
  );
}

export function CheckoutPaymentPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { token } = useSession();
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clear);
  const discountCode = useCartStore((state) => state.discountCode);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi' | 'netbanking'>('card');
  const [error, setError] = useState<string | null>(null);
  const summaryQuery = useCheckoutSummary(token);

  const paymentMutation = useMutation({
    mutationFn: async () =>
      apiRequest<{ subscriptionIds: string[]; invoiceIds: string[] }>('/checkout/complete', {
        token,
        method: 'POST',
        body: JSON.stringify({
          paymentMethod,
          discountCode: discountCode || undefined,
          lines: items.map((item) => ({
            productId: item.productId,
            recurringPlanId: item.recurringPlanId,
            variantId: item.variantId,
            quantity: item.quantity
          }))
        })
      }),
    onSuccess: async (result) => {
      clearCart();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['portal-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['profile-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['portal-invoice'] })
      ]);
      navigate(`/checkout/success?subscriptions=${result.subscriptionIds.join(',')}&invoices=${result.invoiceIds.join(',')}`);
    },
    onError: (mutationError) => {
      setError(mutationError instanceof ApiError ? mutationError.message : 'Payment failed');
    }
  });

  return (
    <CheckoutShell
      currentStep="payment"
      description="A demo payment gateway is active here, so you can finish the external checkout flow and create the order immediately."
      title="Payment"
    >
      {items.length === 0 ? (
        <section className={panelClass}>
          <p className="text-sm text-slate-600">Cart is empty. Return to the order step first.</p>
          <Link className="mt-4 inline-flex rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700" to="/cart">
            Back to cart
          </Link>
        </section>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-4">
            <section className={panelClass}>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Payment gateway</p>
              <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-slate-950">Choose payment method</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Demo processing is enabled for the hackathon flow. The payment action will create the order and mark the invoice as paid.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {[
                  { id: 'card', label: 'Card' },
                  { id: 'upi', label: 'UPI' },
                  { id: 'netbanking', label: 'Net Banking' }
                ].map((option) => (
                  <button
                    className={`rounded-[24px] border px-4 py-4 text-left transition ${
                      paymentMethod === option.id
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white'
                    }`}
                    key={option.id}
                    onClick={() => setPaymentMethod(option.id as 'card' | 'upi' | 'netbanking')}
                    type="button"
                  >
                    <p className="font-semibold">{option.label}</p>
                    <p className="mt-1 text-sm opacity-80">Mock gateway enabled</p>
                  </button>
                ))}
              </div>
            </section>

            <section className={panelClass}>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Delivery and invoice address</p>
              <div className="mt-4">
                <AddressBlock />
              </div>
            </section>

            {error ? (
              <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
            ) : null}
          </div>

          <CheckoutSummaryCard
            actions={
              <button
                className="inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={paymentMutation.isPending || summaryQuery.isPending}
                onClick={() => paymentMutation.mutate()}
                type="button"
              >
                {paymentMutation.isPending ? 'Processing payment...' : 'Pay now'}
              </button>
            }
            detail={
              <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Selected method: <span className="font-semibold text-slate-950">{paymentMethod}</span>
              </div>
            }
            summary={summaryQuery.data}
            summaryError={summaryQuery.error instanceof ApiError ? summaryQuery.error.message : null}
            summaryLoading={summaryQuery.isPending}
          />
        </div>
      )}
    </CheckoutShell>
  );
}

export function CheckoutSuccessPage() {
  const { token } = useSession();
  const [searchParams] = useSearchParams();
  const subscriptions = searchParams.get('subscriptions')?.split(',').filter(Boolean) ?? [];
  const invoices = searchParams.get('invoices')?.split(',').filter(Boolean) ?? [];
  const primarySubscriptionId = subscriptions[0] ?? null;
  const primaryInvoiceId = invoices[0] ?? null;

  const subscriptionQuery = useQuery({
    queryKey: ['checkout-success-subscription', primarySubscriptionId],
    queryFn: () => apiRequest<Subscription>(`/subscriptions/${primarySubscriptionId}`, { token }),
    enabled: Boolean(primarySubscriptionId)
  });

  const invoiceQuery = useQuery({
    queryKey: ['checkout-success-invoice', primaryInvoiceId],
    queryFn: () => apiRequest<Invoice>(`/invoices/${primaryInvoiceId}`, { token }),
    enabled: Boolean(primaryInvoiceId)
  });

  const order = subscriptionQuery.data;
  const invoice = invoiceQuery.data;

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-[34px] border border-emerald-900/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(240,253,250,0.9))] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700">Order complete</p>
                <h1 className="mt-3 text-3xl font-black tracking-[-0.05em] text-slate-950 sm:text-4xl">
                  Thanks for your order
                </h1>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Payment has been processed and the subscription order is now available inside the external customer portal.
                </p>
                <p className="mt-4 text-lg font-semibold text-slate-950">
                  {order?.subscriptionNumber ?? 'Order created'}
                </p>
              </div>

              <button
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                onClick={() => window.print()}
                type="button"
              >
                <PrinterIcon className="h-4 w-4" />
                Print
              </button>
            </div>

            {primarySubscriptionId ? (
              <Link
                className="mt-6 block rounded-[28px] border border-emerald-100 bg-emerald-50/80 px-5 py-4 text-sm text-emerald-900 transition hover:border-emerald-200 hover:bg-emerald-50"
                to={`/account/orders/${primarySubscriptionId}`}
              >
                <p className="font-semibold">Your payment has been processed</p>
                <p className="mt-1">
                  Open {order?.subscriptionNumber ?? 'the order page'} directly to review subscription details, invoices, and lifecycle status.
                </p>
              </Link>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                className="inline-flex rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                to="/account/orders"
              >
                View all orders
              </Link>
              {primarySubscriptionId ? (
                <Link
                  className="inline-flex rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  to={`/account/orders/${primarySubscriptionId}`}
                >
                  Open latest order
                </Link>
              ) : null}
              {primaryInvoiceId ? (
                <Link
                  className="inline-flex rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  to={`/account/invoices/${primaryInvoiceId}`}
                >
                  Open invoice
                </Link>
              ) : null}
            </div>
          </div>

          <aside className={panelClass}>
            <p className="text-sm font-semibold text-slate-950">Order summary</p>
            <div className="mt-4 grid gap-3 text-sm text-slate-600">
              <SummaryRow label="Order" value={order?.subscriptionNumber ?? 'Processing'} />
              <SummaryRow label="Date" value={order ? formatDate(order.createdAt) : formatDate(invoice?.invoiceDate)} />
              <SummaryRow label="Subtotal" value={formatCurrency(order?.subtotalAmount ?? invoice?.subtotalAmount ?? 0)} />
              <SummaryRow label="Discount" value={formatCurrency(order?.discountAmount ?? invoice?.discountAmount ?? 0)} />
              <SummaryRow label="Taxes" value={formatCurrency(order?.taxAmount ?? invoice?.taxAmount ?? 0)} />
              <SummaryRow label="Total" value={formatCurrency(order?.totalAmount ?? invoice?.totalAmount ?? 0)} />
            </div>
            {(subscriptions.length > 1 || invoices.length > 1) ? (
              <p className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                This checkout created {subscriptions.length} subscription order(s) and {invoices.length} invoice(s).
              </p>
            ) : null}
          </aside>
        </div>
      </section>
    </div>
  );
}

function CheckoutShell({
  title,
  description,
  currentStep,
  children
}: Readonly<{
  title: string;
  description: string;
  currentStep: CheckoutStep;
  children: ReactNode;
}>) {
  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-[34px] border border-emerald-900/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(240,253,250,0.88))] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700">External checkout</p>
        <div className="mt-3 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-[-0.05em] text-slate-950 sm:text-4xl">{title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
          </div>
          <CheckoutStepTabs currentStep={currentStep} />
        </div>
      </section>

      {children}
    </div>
  );
}

function CheckoutStepTabs({ currentStep }: Readonly<{ currentStep: CheckoutStep }>) {
  const currentIndex = checkoutSteps.indexOf(currentStep);

  return (
    <div className="flex flex-wrap gap-3">
      {checkoutSteps.map((step, index) => {
        const label = step[0].toUpperCase() + step.slice(1);
        const isActive = step === currentStep;
        const isComplete = index < currentIndex;
        const to = step === 'order' ? '/cart' : `/checkout/${step}`;
        const className = `inline-flex rounded-full px-4 py-2 text-sm font-semibold transition ${
          isActive
            ? 'bg-emerald-600 text-white'
            : isComplete
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              : 'border border-slate-200 bg-white text-slate-400'
        }`;

        return isComplete ? (
          <Link className={className} key={step} to={to}>
            {label}
          </Link>
        ) : (
          <span className={className} key={step}>
            {label}
          </span>
        );
      })}
    </div>
  );
}

function CheckoutSummaryCard({
  summary,
  summaryLoading,
  summaryError,
  showDiscountInput = false,
  codeInput = '',
  onCodeInputChange,
  onApplyCode,
  discountFeedback,
  detail,
  actions
}: Readonly<{
  summary?: CheckoutSummary;
  summaryLoading: boolean;
  summaryError: string | null;
  showDiscountInput?: boolean;
  codeInput?: string;
  onCodeInputChange?: (value: string) => void;
  onApplyCode?: () => void;
  discountFeedback?: string | null;
  detail?: ReactNode;
  actions?: ReactNode;
}>) {
  return (
    <aside className={`${panelClass} xl:sticky xl:top-8 xl:self-start`}>
      <p className="text-sm font-semibold text-slate-950">Summary</p>

      <div className="mt-4 grid gap-3">
        <SummaryRow label="Subtotal" value={summaryLoading ? 'Calculating...' : formatCurrency(summary?.subtotalAmount ?? 0)} />
        <SummaryRow label="Discount" value={summaryLoading ? 'Calculating...' : formatCurrency(summary?.discountAmount ?? 0)} />
        <SummaryRow label="Taxes" value={summaryLoading ? 'Calculating...' : formatCurrency(summary?.taxAmount ?? 0)} />
        <SummaryRow emphasize label="Total" value={summaryLoading ? 'Calculating...' : formatCurrency(summary?.totalAmount ?? 0)} />
      </div>

      {showDiscountInput && onCodeInputChange && onApplyCode ? (
        <div className="mt-5">
          <label className="block text-sm font-medium text-slate-700">Discount code</label>
          <div className="mt-2 flex gap-3">
            <input
              className={`${fieldClass} min-w-0 flex-1`}
              onChange={(event) => onCodeInputChange(event.target.value)}
              placeholder="Enter code"
              value={codeInput}
            />
            <button
              className="rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              onClick={onApplyCode}
              type="button"
            >
              Apply
            </button>
          </div>
        </div>
      ) : null}

      {detail ? <div className="mt-5">{detail}</div> : null}

      {discountFeedback ? (
        <p className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {discountFeedback}
        </p>
      ) : null}

      {summary?.appliedDiscountCode && !summary.hasDiscount ? (
        <p className="mt-4 rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Saved code <span className="font-semibold">{summary.appliedDiscountCode}</span> does not currently match an active eligible discount for this cart.
        </p>
      ) : null}

      {summaryError ? (
        <p className="mt-4 rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {summaryError}
        </p>
      ) : null}

      {actions ? <div className="mt-5">{actions}</div> : null}
    </aside>
  );
}

function QuantityStepper({
  value,
  onChange
}: Readonly<{
  value: number;
  onChange: (value: number) => void;
}>) {
  return (
    <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50">
      <button
        className="h-11 w-11 text-lg font-semibold text-slate-700 transition hover:bg-white"
        onClick={() => onChange(Math.max(1, value - 1))}
        type="button"
      >
        -
      </button>
      <span className="min-w-[44px] text-center text-sm font-semibold text-slate-950">{value}</span>
      <button
        className="h-11 w-11 text-lg font-semibold text-slate-700 transition hover:bg-white"
        onClick={() => onChange(value + 1)}
        type="button"
      >
        +
      </button>
    </div>
  );
}

function ProductThumb({ imageUrl, name }: Readonly<{ imageUrl: string | null; name: string }>) {
  return imageUrl ? (
    <img
      alt={name}
      className="h-20 w-20 rounded-[24px] border border-slate-200 object-cover"
      loading="lazy"
      src={imageUrl}
    />
  ) : (
    <div className="grid h-20 w-20 place-items-center rounded-[24px] border border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
      Item
    </div>
  );
}

function SummaryRow({
  label,
  value,
  emphasize = false
}: Readonly<{
  label: string;
  value: string;
  emphasize?: boolean;
}>) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-[22px] border px-4 py-3 ${
        emphasize
          ? 'border-slate-950 bg-slate-950 text-white'
          : 'border-slate-200 bg-slate-50 text-slate-600'
      }`}
    >
      <span className={emphasize ? 'font-semibold' : undefined}>{label}</span>
      <span className={emphasize ? 'font-semibold text-white' : 'font-semibold text-slate-950'}>{value}</span>
    </div>
  );
}

function usePortalContact(token: string | null) {
  return useQuery({
    queryKey: ['portal-contact'],
    queryFn: () => apiRequest<Contact>('/contacts/me', { token })
  });
}

function useCheckoutSummary(token: string | null) {
  const items = useCartStore((state) => state.items);
  const discountCode = useCartStore((state) => state.discountCode);

  return useQuery({
    queryKey: [
      'portal-checkout-summary',
      discountCode,
      items.map((item) => ({
        productId: item.productId,
        recurringPlanId: item.recurringPlanId,
        variantId: item.variantId ?? null,
        quantity: item.quantity
      }))
    ],
    queryFn: () =>
      apiRequest<CheckoutSummary>('/checkout/summary', {
        token,
        method: 'POST',
        body: JSON.stringify({
          discountCode: discountCode || undefined,
          lines: items.map((item) => ({
            productId: item.productId,
            recurringPlanId: item.recurringPlanId,
            variantId: item.variantId,
            quantity: item.quantity
          }))
        })
      }),
    enabled: Boolean(token) && items.length > 0
  });
}

function useSummaryItems(summary?: CheckoutSummary) {
  return useMemo(
    () =>
      new Map(
        (summary?.items ?? []).map((item) => [
          checkoutSummaryKey(item.productId, item.recurringPlanId, item.variantId),
          item
        ])
      ),
    [summary]
  );
}

function cartItemKey(item: CartItem) {
  return checkoutSummaryKey(item.productId, item.recurringPlanId, item.variantId ?? null);
}

function checkoutSummaryKey(productId: string, recurringPlanId: string | null, variantId: string | null) {
  return `${productId}::${recurringPlanId ?? 'no-plan'}::${variantId ?? 'base'}`;
}

function AddressBlock() {
  const address = readStoredCheckoutAddress();

  if (!address) {
    return <p className="text-sm text-slate-500">Default profile address will be used.</p>;
  }

  return <AddressPreview address={address} />;
}

function readStoredCheckoutAddress(): CheckoutAddress | null {
  const rawAddress = window.sessionStorage.getItem(checkoutAddressKey);

  if (!rawAddress) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawAddress) as CheckoutAddress | null;
    return parsed?.line1 ? parsed : null;
  } catch {
    return null;
  }
}

function AddressPreview({ address }: Readonly<{ address: CheckoutAddress }>) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
      <p className="font-semibold text-slate-950">{address.line1}</p>
      {address.line2 ? <p className="mt-1">{address.line2}</p> : null}
      <p className="mt-1">
        {address.city}, {address.state} {address.postalCode}
      </p>
      <p className="mt-1">{address.country}</p>
    </div>
  );
}
