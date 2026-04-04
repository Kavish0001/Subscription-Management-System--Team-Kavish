import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Surface } from '../../components/layout';
import { apiRequest, formatCurrency, formatDate, type Discount, type Product, type RecurringPlan, type Subscription } from '../../lib/api';
import { ApiError } from '../../lib/api';
import { useSession } from '../../lib/session';

type ResourceKind = 'subscriptions' | 'products' | 'recurring-plans' | 'discounts';

export function ResourceListPage({
  title,
  description,
  resource
}: {
  title: string;
  description: string;
  resource: ResourceKind;
}) {
  const queryClient = useQueryClient();
  const { token } = useSession();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    slug: '',
    description: '',
    baseSalesPrice: '999',
    costPrice: '249'
  });
  const [planForm, setPlanForm] = useState({
    name: '',
    intervalCount: '1',
    intervalUnit: 'month',
    price: '999',
    minimumQuantity: '1'
  });
  const [discountForm, setDiscountForm] = useState({
    name: '',
    code: '',
    discountType: 'percentage',
    value: '10',
    minimumPurchase: '500',
    scopeType: 'subscriptions'
  });

  const productsQuery = useQuery({
    queryKey: ['admin-products'],
    queryFn: () =>
      apiRequest<{ items: Product[] }>('/products?page=1&pageSize=50', { token }).then(
        (result) => result.items
      ),
    enabled: resource === 'products'
  });

  const plansQuery = useQuery({
    queryKey: ['admin-plans'],
    queryFn: () => apiRequest<RecurringPlan[]>('/recurring-plans', { token }),
    enabled: resource === 'recurring-plans'
  });

  const discountsQuery = useQuery({
    queryKey: ['admin-discounts'],
    queryFn: () => apiRequest<Discount[]>('/discounts', { token }),
    enabled: resource === 'discounts'
  });

  const subscriptionsQuery = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: () => apiRequest<Subscription[]>('/subscriptions', { token }),
    enabled: resource === 'subscriptions'
  });

  const rows = useMemo(() => {
    if (resource === 'products') {
      return productsQuery.data ?? [];
    }

    if (resource === 'recurring-plans') {
      return plansQuery.data ?? [];
    }

    if (resource === 'discounts') {
      return discountsQuery.data ?? [];
    }

    return subscriptionsQuery.data ?? [];
  }, [discountsQuery.data, plansQuery.data, productsQuery.data, resource, subscriptionsQuery.data]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (resource === 'products') {
        return apiRequest('/products', {
          token,
          method: 'POST',
          body: JSON.stringify({
            name: productForm.name,
            slug: productForm.slug || slugify(productForm.name),
            description: productForm.description,
            productType: 'service',
            baseSalesPrice: Number(productForm.baseSalesPrice),
            costPrice: Number(productForm.costPrice),
            isSubscriptionEnabled: true
          })
        });
      }

      if (resource === 'recurring-plans') {
        return apiRequest('/recurring-plans', {
          token,
          method: 'POST',
          body: JSON.stringify({
            name: planForm.name,
            intervalCount: Number(planForm.intervalCount),
            intervalUnit: planForm.intervalUnit,
            price: Number(planForm.price),
            minimumQuantity: Number(planForm.minimumQuantity),
            autoCloseEnabled: false,
            isClosable: true,
            isPausable: true,
            isRenewable: true
          })
        });
      }

      return apiRequest('/discounts', {
        token,
        method: 'POST',
        body: JSON.stringify({
          name: discountForm.name,
          code: discountForm.code || undefined,
          discountType: discountForm.discountType,
          value: Number(discountForm.value),
          minimumPurchase: Number(discountForm.minimumPurchase),
          scopeType: discountForm.scopeType,
          limitUsageEnabled: false
        })
      });
    },
    onSuccess: async () => {
      setError(null);
      setIsCreating(false);
      await queryClient.invalidateQueries({
        queryKey:
          resource === 'products'
            ? ['admin-products']
            : resource === 'recurring-plans'
              ? ['admin-plans']
              : ['admin-discounts']
      });
    },
    onError: (mutationError) => {
      setError(mutationError instanceof ApiError ? mutationError.message : 'Unable to save record');
    }
  });

  const workflowMutation = useMutation({
    mutationFn: async (input: { action: 'send-quotation' | 'confirm' | 'invoice'; subscription: Subscription }) => {
      if (input.action === 'invoice') {
        return apiRequest('/invoices', {
          token,
          method: 'POST',
          body: JSON.stringify({
            subscriptionOrderId: input.subscription.id,
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            sourceLabel: 'Backoffice'
          })
        });
      }

      return apiRequest(`/subscriptions/${input.subscription.id}/${input.action}`, {
        token,
        method: 'POST'
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
    },
    onError: (mutationError) => {
      setError(mutationError instanceof ApiError ? mutationError.message : 'Workflow action failed');
    }
  });

  return (
    <Surface
      title={title}
      actions={
        resource === 'subscriptions' ? (
          <Link
            className="rounded-full bg-gradient-to-r from-amber-300 to-rose-500 px-4 py-2 text-sm font-semibold text-slate-950"
            to="/admin/subscriptions/new"
          >
            New
          </Link>
        ) : (
          <button
            className="rounded-full bg-gradient-to-r from-amber-300 to-rose-500 px-4 py-2 text-sm font-semibold text-slate-950"
            onClick={() => setIsCreating((value) => !value)}
            type="button"
          >
            {isCreating ? 'Close' : 'New'}
          </button>
        )
      }
    >
      <p className="mb-4 text-slate-300">{description}</p>
      {error ? <p className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
      {isCreating && resource !== 'subscriptions' ? (
        <div className="mb-6 rounded-[28px] border border-white/10 bg-slate-950/35 p-5">
          {resource === 'products' ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Product name">
                <input className={fieldClass} onChange={(event) => setProductForm((value) => ({ ...value, name: event.target.value }))} value={productForm.name} />
              </Field>
              <Field label="Slug">
                <input className={fieldClass} onChange={(event) => setProductForm((value) => ({ ...value, slug: event.target.value }))} value={productForm.slug} />
              </Field>
              <Field label="Description">
                <textarea className={fieldClass} onChange={(event) => setProductForm((value) => ({ ...value, description: event.target.value }))} rows={4} value={productForm.description} />
              </Field>
              <Field label="Sales price">
                <input className={fieldClass} onChange={(event) => setProductForm((value) => ({ ...value, baseSalesPrice: event.target.value }))} type="number" value={productForm.baseSalesPrice} />
              </Field>
              <Field label="Cost price">
                <input className={fieldClass} onChange={(event) => setProductForm((value) => ({ ...value, costPrice: event.target.value }))} type="number" value={productForm.costPrice} />
              </Field>
            </div>
          ) : null}
          {resource === 'recurring-plans' ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Recurring name">
                <input className={fieldClass} onChange={(event) => setPlanForm((value) => ({ ...value, name: event.target.value }))} value={planForm.name} />
              </Field>
              <Field label="Price">
                <input className={fieldClass} onChange={(event) => setPlanForm((value) => ({ ...value, price: event.target.value }))} type="number" value={planForm.price} />
              </Field>
              <Field label="Billing count">
                <input className={fieldClass} onChange={(event) => setPlanForm((value) => ({ ...value, intervalCount: event.target.value }))} type="number" value={planForm.intervalCount} />
              </Field>
              <Field label="Billing period">
                <select className={fieldClass} onChange={(event) => setPlanForm((value) => ({ ...value, intervalUnit: event.target.value }))} value={planForm.intervalUnit}>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                </select>
              </Field>
            </div>
          ) : null}
          {resource === 'discounts' ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Discount name">
                <input className={fieldClass} onChange={(event) => setDiscountForm((value) => ({ ...value, name: event.target.value }))} value={discountForm.name} />
              </Field>
              <Field label="Code">
                <input className={fieldClass} onChange={(event) => setDiscountForm((value) => ({ ...value, code: event.target.value }))} value={discountForm.code} />
              </Field>
              <Field label="Mode">
                <select className={fieldClass} onChange={(event) => setDiscountForm((value) => ({ ...value, discountType: event.target.value }))} value={discountForm.discountType}>
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed</option>
                </select>
              </Field>
              <Field label="Value">
                <input className={fieldClass} onChange={(event) => setDiscountForm((value) => ({ ...value, value: event.target.value }))} type="number" value={discountForm.value} />
              </Field>
            </div>
          ) : null}
          <div className="mt-4">
            <button className="rounded-full bg-gradient-to-r from-emerald-300 to-sky-400 px-4 py-2 text-sm font-semibold text-slate-950" onClick={() => createMutation.mutate()} type="button">
              Save record
            </button>
          </div>
        </div>
      ) : null}
      <div className="overflow-hidden rounded-3xl border border-white/10">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/6 text-slate-300">
            {resource === 'subscriptions' ? (
              <tr>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Next Invoice</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            ) : (
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            )}
          </thead>
          <tbody>
            {resource === 'products'
              ? (rows as Product[]).map((product) => (
                  <tr className="border-t border-white/10 text-slate-100" key={product.id}>
                    <td className="px-4 py-3">{product.name}</td>
                    <td className="px-4 py-3">{product.isSubscriptionEnabled ? 'Subscription' : 'Standard'}</td>
                    <td className="px-4 py-3">{formatCurrency(product.baseSalesPrice)}</td>
                    <td className="px-4 py-3 text-slate-300">{product.slug}</td>
                  </tr>
                ))
              : null}
            {resource === 'recurring-plans'
              ? (rows as RecurringPlan[]).map((plan) => (
                  <tr className="border-t border-white/10 text-slate-100" key={plan.id}>
                    <td className="px-4 py-3">{plan.name}</td>
                    <td className="px-4 py-3">Active</td>
                    <td className="px-4 py-3">{formatCurrency(plan.price)}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {plan.intervalCount} {plan.intervalUnit}
                    </td>
                  </tr>
                ))
              : null}
            {resource === 'discounts'
              ? (rows as Discount[]).map((discount) => (
                  <tr className="border-t border-white/10 text-slate-100" key={discount.id}>
                    <td className="px-4 py-3">{discount.name}</td>
                    <td className="px-4 py-3">{discount.discountType}</td>
                    <td className="px-4 py-3">{formatCurrency(discount.minimumPurchase ?? 0)}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {discount.discountType === 'percentage' ? `${discount.value}%` : formatCurrency(discount.value)}
                    </td>
                  </tr>
                ))
              : null}
            {resource === 'subscriptions'
              ? (rows as Subscription[]).map((subscription) => (
                  <tr className="border-t border-white/10 text-slate-100" key={subscription.id}>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-semibold">{subscription.subscriptionNumber}</p>
                        <p className="text-xs text-slate-400">{formatDate(subscription.createdAt)}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">{subscription.customerContact.name}</td>
                    <td className="px-4 py-3">{subscription.status}</td>
                    <td className="px-4 py-3">{formatDate(subscription.nextInvoiceDate)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {subscription.status === 'draft' ? (
                          <button className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white" onClick={() => workflowMutation.mutate({ action: 'send-quotation', subscription })} type="button">
                            Send
                          </button>
                        ) : null}
                        {subscription.status === 'quotation_sent' ? (
                          <button className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white" onClick={() => workflowMutation.mutate({ action: 'confirm', subscription })} type="button">
                            Confirm
                          </button>
                        ) : null}
                        {subscription.invoices.length === 0 ? (
                          <button className="rounded-full bg-gradient-to-r from-amber-300 to-rose-500 px-3 py-1 text-xs font-semibold text-slate-950" onClick={() => workflowMutation.mutate({ action: 'invoice', subscription })} type="button">
                            Create Invoice
                          </button>
                        ) : (
                          <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                            {subscription.invoices[0]?.status}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              : null}
            {rows.length === 0 ? (
              <tr className="border-t border-white/10 text-slate-400">
                <td className="px-4 py-6" colSpan={resource === 'subscriptions' ? 5 : 4}>
                  No records yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
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

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const fieldClass = 'rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3';
