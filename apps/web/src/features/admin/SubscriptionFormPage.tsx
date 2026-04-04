import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Surface } from '../../components/layout';
import { apiRequest, formatCurrency, type Contact, type Product, type RecurringPlan, type SessionUser } from '../../lib/api';
import { ApiError } from '../../lib/api';
import { useSession } from '../../lib/session';

export function SubscriptionFormPage() {
  const navigate = useNavigate();
  const { token, user } = useSession();
  const [customerContactId, setCustomerContactId] = useState('');
  const [salespersonUserId, setSalespersonUserId] = useState('');
  const [recurringPlanId, setRecurringPlanId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [paymentTermLabel, setPaymentTermLabel] = useState('Immediate payment');
  const [notes, setNotes] = useState('');
  const [createInvoiceNow, setCreateInvoiceNow] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const contactsQuery = useQuery({
    queryKey: ['admin-contacts'],
    queryFn: () => apiRequest<Contact[]>('/contacts', { token })
  });

  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => apiRequest<Array<Pick<SessionUser, 'id' | 'email' | 'role'>>>('/users', { token }),
    enabled: user?.role === 'admin'
  });

  const productsQuery = useQuery({
    queryKey: ['subscription-form-products'],
    queryFn: () =>
      apiRequest<{ items: Product[] }>('/products?page=1&pageSize=50', { token }).then(
        (result) => result.items
      )
  });

  const plansQuery = useQuery({
    queryKey: ['subscription-form-plans'],
    queryFn: () => apiRequest<RecurringPlan[]>('/recurring-plans', { token })
  });

  useEffect(() => {
    if (!customerContactId && contactsQuery.data?.[0]) {
      setCustomerContactId(contactsQuery.data[0].id);
    }
  }, [contactsQuery.data, customerContactId]);

  useEffect(() => {
    if (!productId && productsQuery.data?.[0]) {
      setProductId(productsQuery.data[0].id);
    }
  }, [productId, productsQuery.data]);

  useEffect(() => {
    if (!salespersonUserId) {
      if (user?.role === 'admin' && usersQuery.data?.[0]) {
        setSalespersonUserId(usersQuery.data[0].id);
      } else if (user?.role === 'internal_user' || user?.role === 'admin') {
        setSalespersonUserId(user.id);
      }
    }
  }, [salespersonUserId, user, usersQuery.data]);

  const selectedProduct = useMemo(
    () => productsQuery.data?.find((product) => product.id === productId) ?? null,
    [productId, productsQuery.data]
  );

  const availablePlanIds = useMemo(
    () => selectedProduct?.planPricing.map((plan) => plan.recurringPlanId) ?? [],
    [selectedProduct]
  );

  useEffect(() => {
    const defaultPlan =
      selectedProduct?.planPricing.find((plan) => plan.isDefaultPlan)?.recurringPlanId ??
      selectedProduct?.planPricing[0]?.recurringPlanId ??
      plansQuery.data?.[0]?.id;

    if (defaultPlan && defaultPlan !== recurringPlanId) {
      setRecurringPlanId(defaultPlan);
    }
  }, [plansQuery.data, recurringPlanId, selectedProduct]);

  const unitPrice =
    Number(
      selectedProduct?.planPricing.find((plan) => plan.recurringPlanId === recurringPlanId)?.overridePrice ??
        selectedProduct?.baseSalesPrice ??
        0
    ) || 0;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProduct) {
        throw new ApiError('Select a product before saving', 400);
      }

      const subscription = await apiRequest<{ id: string }>('/subscriptions', {
        token,
        method: 'POST',
        body: JSON.stringify({
          customerContactId,
          salespersonUserId,
          recurringPlanId: recurringPlanId || undefined,
          sourceChannel: 'admin',
          paymentTermLabel,
          notes,
          lines: [
            {
              productId: selectedProduct.id,
              quantity,
              unitPrice
            }
          ]
        })
      });

      if (createInvoiceNow) {
        await apiRequest('/invoices', {
          token,
          method: 'POST',
          body: JSON.stringify({
            subscriptionOrderId: subscription.id,
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            sourceLabel: 'Backoffice form'
          })
        });
      }
    },
    onSuccess: () => {
      navigate('/admin/subscriptions');
    },
    onError: (mutationError) => {
      setError(mutationError instanceof ApiError ? mutationError.message : 'Unable to save subscription');
    }
  });

  return (
    <Surface
      title="Subscription Form"
      actions={
        <div className="flex gap-3">
          <button className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white" onClick={() => navigate('/admin/subscriptions')} type="button">
            Discard
          </button>
          <button className="rounded-full bg-gradient-to-r from-amber-300 to-rose-500 px-4 py-2 text-sm font-semibold text-slate-950" onClick={() => saveMutation.mutate()} type="button">
            Save
          </button>
        </div>
      }
    >
      {error ? <p className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Customer">
          <select className={fieldClass} onChange={(event) => setCustomerContactId(event.target.value)} value={customerContactId}>
            {contactsQuery.data?.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Salesperson">
          {user?.role === 'admin' ? (
            <select className={fieldClass} onChange={(event) => setSalespersonUserId(event.target.value)} value={salespersonUserId}>
              {usersQuery.data?.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.email} ({account.role})
                </option>
              ))}
            </select>
          ) : (
            <input className={fieldClass} disabled value={user?.email ?? ''} />
          )}
        </Field>
        <Field label="Product">
          <select className={fieldClass} onChange={(event) => setProductId(event.target.value)} value={productId}>
            {productsQuery.data?.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Recurring Plan">
          <select className={fieldClass} onChange={(event) => setRecurringPlanId(event.target.value)} value={recurringPlanId}>
            {plansQuery.data
              ?.filter((plan) => availablePlanIds.length === 0 || availablePlanIds.includes(plan.id))
              .map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Payment Term">
          <input className={fieldClass} onChange={(event) => setPaymentTermLabel(event.target.value)} value={paymentTermLabel} />
        </Field>
        <Field label="Quantity">
          <input className={fieldClass} min={1} onChange={(event) => setQuantity(Number(event.target.value))} type="number" value={quantity} />
        </Field>
        <Field label="Other Info">
          <textarea className={fieldClass} onChange={(event) => setNotes(event.target.value)} rows={5} value={notes} />
        </Field>
        <div className="rounded-[28px] border border-white/10 bg-slate-950/35 p-5 md:col-span-2">
          <p className="text-sm text-slate-300">Estimated total with tax: {formatCurrency(unitPrice * quantity * 1.18)}</p>
          <label className="mt-3 flex items-center gap-3 text-sm text-slate-200">
            <input checked={createInvoiceNow} onChange={(event) => setCreateInvoiceNow(event.target.checked)} type="checkbox" />
            Create invoice immediately
          </label>
        </div>
      </div>
    </Surface>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="grid gap-2 text-sm text-slate-200">
      {label}
      {children}
    </label>
  );
}

const fieldClass = 'rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3';
