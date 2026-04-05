import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { Surface } from '../../components/layout';
import {
  apiRequest,
  ApiError,
  formatCurrency,
  formatDate,
  planIntervalLabel,
  type Discount,
  type PaginatedResponse,
  type Product,
  type RecurringPlan
} from '../../lib/api';
import { useSession } from '../../lib/session';

const fieldClass = 'rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3';

export function RecurringPlanListPage() {
  const { token } = useSession();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    intervalCount: '1',
    intervalUnit: 'month' as 'day' | 'week' | 'month' | 'year',
    price: '999',
    minimumQuantity: '1',
    startDate: '',
    endDate: '',
    autoCloseEnabled: false,
    autoCloseAfterCount: '1',
    autoCloseAfterUnit: 'month' as 'day' | 'week' | 'month' | 'year',
    isClosable: true,
    isPausable: true,
    isRenewable: true
  });

  const plansQuery = useQuery({
    queryKey: ['admin-recurring-plans'],
    queryFn: () => apiRequest<RecurringPlan[]>('/recurring-plans', { token })
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiRequest('/recurring-plans', {
        token,
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          intervalCount: Number(form.intervalCount),
          intervalUnit: form.intervalUnit,
          price: Number(form.price),
          minimumQuantity: Number(form.minimumQuantity),
          startDate: form.startDate || undefined,
          endDate: form.endDate || undefined,
          autoCloseEnabled: form.autoCloseEnabled,
          autoCloseAfterCount: form.autoCloseEnabled ? Number(form.autoCloseAfterCount) : undefined,
          autoCloseAfterUnit: form.autoCloseEnabled ? form.autoCloseAfterUnit : undefined,
          isClosable: form.isClosable,
          isPausable: form.isPausable,
          isRenewable: form.isRenewable
        })
      }),
    onSuccess: async () => {
      setError(null);
      setForm({
        name: '',
        intervalCount: '1',
        intervalUnit: 'month',
        price: '999',
        minimumQuantity: '1',
        startDate: '',
        endDate: '',
        autoCloseEnabled: false,
        autoCloseAfterCount: '1',
        autoCloseAfterUnit: 'month',
        isClosable: true,
        isPausable: true,
        isRenewable: true
      });
      await queryClient.invalidateQueries({ queryKey: ['admin-recurring-plans'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-config-recurring-plans-options'] });
      await queryClient.invalidateQueries({ queryKey: ['portal-plans'] });
    },
    onError: (mutationError) => {
      setError(mutationError instanceof ApiError ? mutationError.message : 'Unable to save recurring plan');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) =>
      apiRequest<void>(`/recurring-plans/${id}`, {
        token,
        method: 'DELETE'
      }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['admin-recurring-plans'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-config-recurring-plans-options'] });
      await queryClient.invalidateQueries({ queryKey: ['portal-plans'] });
    },
    onError: (mutationError) => {
      setError(mutationError instanceof ApiError ? mutationError.message : 'Unable to delete recurring plan');
    }
  });

  const rows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return (plansQuery.data ?? []).filter((entry) => !normalizedSearch || entry.name.toLowerCase().includes(normalizedSearch));
  }, [plansQuery.data, search]);

  const createValidationError = validateRecurringPlanDraft(form);

  return (
    <Surface title="Recurring Plans" description="Set billing cadence, quantity rules, lifecycle capabilities, and automatic close windows.">
      {error ? <Message error={error} /> : null}
      <ToolbarSearch search={search} setSearch={setSearch} />
      <div className="mb-6 grid gap-4 rounded-[28px] border border-white/10 bg-slate-950/35 p-5 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Recurring name">
          <input className={fieldClass} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} value={form.name} />
        </Field>
        <Field label="Price">
          <input className={fieldClass} min="0" onChange={(event) => setForm((value) => ({ ...value, price: event.target.value }))} type="number" value={form.price} />
        </Field>
        <Field label="Billing period">
          <div className="grid gap-3 sm:grid-cols-[120px_minmax(0,1fr)]">
            <input className={fieldClass} min="1" onChange={(event) => setForm((value) => ({ ...value, intervalCount: event.target.value }))} type="number" value={form.intervalCount} />
            <select className={fieldClass} onChange={(event) => setForm((value) => ({ ...value, intervalUnit: event.target.value as 'day' | 'week' | 'month' | 'year' }))} value={form.intervalUnit}>
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
              <option value="year">Year</option>
            </select>
          </div>
        </Field>
        <Field label="Minimum quantity">
          <input className={fieldClass} min="1" onChange={(event) => setForm((value) => ({ ...value, minimumQuantity: event.target.value }))} type="number" value={form.minimumQuantity} />
        </Field>
        <Field label="Start date">
          <input className={fieldClass} onChange={(event) => setForm((value) => ({ ...value, startDate: event.target.value }))} type="date" value={form.startDate} />
        </Field>
        <Field label="End date">
          <input className={fieldClass} onChange={(event) => setForm((value) => ({ ...value, endDate: event.target.value }))} type="date" value={form.endDate} />
        </Field>
        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-slate-200">
          <input checked={form.autoCloseEnabled} onChange={(event) => setForm((value) => ({ ...value, autoCloseEnabled: event.target.checked }))} type="checkbox" />
          Automatic close
        </label>
        <Field label="Auto-close after">
          <div className="grid gap-3 sm:grid-cols-[120px_minmax(0,1fr)]">
            <input className={fieldClass} disabled={!form.autoCloseEnabled} min="1" onChange={(event) => setForm((value) => ({ ...value, autoCloseAfterCount: event.target.value }))} type="number" value={form.autoCloseAfterCount} />
            <select className={fieldClass} disabled={!form.autoCloseEnabled} onChange={(event) => setForm((value) => ({ ...value, autoCloseAfterUnit: event.target.value as 'day' | 'week' | 'month' | 'year' }))} value={form.autoCloseAfterUnit}>
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
              <option value="year">Year</option>
            </select>
          </div>
        </Field>
        <ToggleCard checked={form.isClosable} label="Closable" onChange={(checked) => setForm((value) => ({ ...value, isClosable: checked }))} />
        <ToggleCard checked={form.isPausable} label="Pausable" onChange={(checked) => setForm((value) => ({ ...value, isPausable: checked }))} />
        <ToggleCard checked={form.isRenewable} label="Renewable" onChange={(checked) => setForm((value) => ({ ...value, isRenewable: checked }))} />
        <button
          className="rounded-full bg-gradient-to-r from-amber-300 to-rose-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60 xl:justify-self-start"
          disabled={createMutation.isPending}
          onClick={() => {
            if (createValidationError) {
              setError(createValidationError);
              return;
            }

            createMutation.mutate();
          }}
          type="button"
        >
          {createMutation.isPending ? 'Saving...' : 'Save Plan'}
        </button>
      </div>
      <DataTable
        columns={['Plan', 'Lifecycle', 'Window', 'Usage', 'Updated', 'Actions']}
        rows={rows.map((plan) => (
          <tr className="border-t border-white/10 text-slate-100" key={plan.id}>
            <td className="px-4 py-3">
              <p className="font-semibold">{plan.name}</p>
              <p className="text-xs text-slate-400">{planIntervalLabel(plan)} | {formatCurrency(plan.price)}</p>
            </td>
            <td className="px-4 py-3 text-slate-300">
              {[
                plan.isClosable ? 'Closable' : 'Not closable',
                plan.isPausable ? 'Pausable' : 'Not pausable',
                plan.isRenewable ? 'Renewable' : 'Not renewable'
              ].join(' | ')}
            </td>
            <td className="px-4 py-3 text-slate-300">
              <p>{plan.startDate ? `Start ${formatDate(plan.startDate)}` : 'Start anytime'}</p>
              <p className="text-xs text-slate-400">
                {plan.autoCloseEnabled && plan.autoCloseAfterCount && plan.autoCloseAfterUnit
                  ? `Auto-close after ${plan.autoCloseAfterCount} ${plan.autoCloseAfterUnit}(s)`
                  : plan.endDate
                    ? `Ends ${formatDate(plan.endDate)}`
                    : 'No auto-close window'}
              </p>
            </td>
            <td className="px-4 py-3 text-slate-300">
              <p>Min qty {plan.minimumQuantity}</p>
              <p className="text-xs text-slate-400">{plan.productsCount ?? 0} products | {plan.subscriptionsCount ?? 0} subscriptions</p>
            </td>
            <td className="px-4 py-3 text-slate-300">{formatDate(plan.updatedAt)}</td>
            <td className="px-4 py-3">
              <button className="rounded-full border border-rose-400/25 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-200" onClick={() => deleteMutation.mutate(plan.id)} type="button">
                Delete
              </button>
            </td>
          </tr>
        ))}
      />
    </Surface>
  );
}

export function DiscountListPage() {
  const { token } = useSession();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    code: '',
    discountType: 'percentage' as 'fixed' | 'percentage',
    value: '10',
    minimumPurchase: '0',
    minimumQuantity: '1',
    startDate: '',
    endDate: '',
    limitUsageEnabled: false,
    usageLimit: '1',
    scopeType: 'subscriptions' as 'all_products' | 'selected_products' | 'subscriptions',
    productIds: [] as string[]
  });

  const discountsQuery = useQuery({
    queryKey: ['admin-discounts'],
    queryFn: () => apiRequest<Discount[]>('/discounts', { token })
  });

  const productsQuery = useQuery({
    queryKey: ['admin-discount-products'],
    queryFn: () => apiRequest<PaginatedResponse<Product>>('/admin/products?page=1&pageSize=100&isActive=true', { token })
  });

  const products = productsQuery.data?.items ?? [];

  const createMutation = useMutation({
    mutationFn: () =>
      apiRequest('/discounts', {
        token,
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          code: form.code || undefined,
          discountType: form.discountType,
          value: Number(form.value),
          minimumPurchase: Number(form.minimumPurchase || 0),
          minimumQuantity: Number(form.minimumQuantity || 1),
          startDate: form.startDate || undefined,
          endDate: form.endDate || undefined,
          limitUsageEnabled: form.limitUsageEnabled,
          usageLimit: form.limitUsageEnabled ? Number(form.usageLimit) : undefined,
          scopeType: form.scopeType,
          productIds: form.scopeType === 'selected_products' ? form.productIds : undefined
        })
      }),
    onSuccess: async () => {
      setError(null);
      setForm({
        name: '',
        code: '',
        discountType: 'percentage',
        value: '10',
        minimumPurchase: '0',
        minimumQuantity: '1',
        startDate: '',
        endDate: '',
        limitUsageEnabled: false,
        usageLimit: '1',
        scopeType: 'subscriptions',
        productIds: []
      });
      await queryClient.invalidateQueries({ queryKey: ['admin-discounts'] });
    },
    onError: (mutationError) => {
      setError(mutationError instanceof ApiError ? mutationError.message : 'Unable to save discount');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) =>
      apiRequest<void>(`/discounts/${id}`, {
        token,
        method: 'DELETE'
      }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['admin-discounts'] });
    },
    onError: (mutationError) => {
      setError(mutationError instanceof ApiError ? mutationError.message : 'Unable to delete discount');
    }
  });

  const rows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return (discountsQuery.data ?? []).filter(
      (entry) =>
        !normalizedSearch ||
        entry.name.toLowerCase().includes(normalizedSearch) ||
        (entry.code ?? '').toLowerCase().includes(normalizedSearch)
    );
  }, [discountsQuery.data, search]);

  const createValidationError = validateDiscountDraft(form);

  return (
    <Surface title="Discounts" description="Admin-only discount rules with value type, eligibility thresholds, dates, limited usage, and optional product targeting.">
      {error ? <Message error={error} /> : null}
      <ToolbarSearch search={search} setSearch={setSearch} />
      <div className="mb-6 grid gap-4 rounded-[28px] border border-white/10 bg-slate-950/35 p-5 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Discount name">
          <input className={fieldClass} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} value={form.name} />
        </Field>
        <Field label="Code">
          <input className={fieldClass} onChange={(event) => setForm((value) => ({ ...value, code: event.target.value }))} value={form.code} />
        </Field>
        <Field label="Type">
          <select className={fieldClass} onChange={(event) => setForm((value) => ({ ...value, discountType: event.target.value as 'fixed' | 'percentage' }))} value={form.discountType}>
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed price</option>
          </select>
        </Field>
        <Field label="Value">
          <input className={fieldClass} min="0" onChange={(event) => setForm((value) => ({ ...value, value: event.target.value }))} type="number" value={form.value} />
        </Field>
        <Field label="Minimum purchase">
          <input className={fieldClass} min="0" onChange={(event) => setForm((value) => ({ ...value, minimumPurchase: event.target.value }))} type="number" value={form.minimumPurchase} />
        </Field>
        <Field label="Minimum quantity">
          <input className={fieldClass} min="1" onChange={(event) => setForm((value) => ({ ...value, minimumQuantity: event.target.value }))} type="number" value={form.minimumQuantity} />
        </Field>
        <Field label="Start date">
          <input className={fieldClass} onChange={(event) => setForm((value) => ({ ...value, startDate: event.target.value }))} type="date" value={form.startDate} />
        </Field>
        <Field label="End date">
          <input className={fieldClass} onChange={(event) => setForm((value) => ({ ...value, endDate: event.target.value }))} type="date" value={form.endDate} />
        </Field>
        <Field label="Applies to">
          <select className={fieldClass} onChange={(event) => setForm((value) => ({ ...value, scopeType: event.target.value as 'all_products' | 'selected_products' | 'subscriptions', productIds: event.target.value === 'selected_products' ? value.productIds : [] }))} value={form.scopeType}>
            <option value="subscriptions">Subscriptions</option>
            <option value="all_products">All products</option>
            <option value="selected_products">Selected products</option>
          </select>
        </Field>
        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-slate-200">
          <input checked={form.limitUsageEnabled} onChange={(event) => setForm((value) => ({ ...value, limitUsageEnabled: event.target.checked }))} type="checkbox" />
          Limit usage
        </label>
        <Field label="Usage limit">
          <input className={fieldClass} disabled={!form.limitUsageEnabled} min="1" onChange={(event) => setForm((value) => ({ ...value, usageLimit: event.target.value }))} type="number" value={form.usageLimit} />
        </Field>
        {form.scopeType === 'selected_products' ? (
          <div className="rounded-[24px] border border-white/10 bg-slate-950/25 p-4 md:col-span-2 xl:col-span-4">
            <p className="mb-3 text-sm font-semibold text-slate-200">Products</p>
            <div className="grid gap-3 lg:grid-cols-2">
              {products.map((product) => (
                <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-sm text-slate-200" key={product.id}>
                  <input
                    checked={form.productIds.includes(product.id)}
                    onChange={(event) =>
                      setForm((value) => ({
                        ...value,
                        productIds: event.target.checked
                          ? [...value.productIds, product.id]
                          : value.productIds.filter((entry) => entry !== product.id)
                      }))
                    }
                    type="checkbox"
                  />
                  <span>
                    <span className="block font-semibold text-white">{product.name}</span>
                    <span className="text-xs text-slate-400">{formatCurrency(product.baseSalesPrice)}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        ) : null}
        <button
          className="rounded-full bg-gradient-to-r from-amber-300 to-rose-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60 xl:justify-self-start"
          disabled={createMutation.isPending}
          onClick={() => {
            if (createValidationError) {
              setError(createValidationError);
              return;
            }

            createMutation.mutate();
          }}
          type="button"
        >
          {createMutation.isPending ? 'Saving...' : 'Save Discount'}
        </button>
      </div>
      <DataTable
        columns={['Discount', 'Eligibility', 'Scope', 'Window', 'Updated', 'Actions']}
        rows={rows.map((discount) => (
          <tr className="border-t border-white/10 text-slate-100" key={discount.id}>
            <td className="px-4 py-3">
              <p className="font-semibold">{discount.name}</p>
              <p className="text-xs text-slate-400">
                {discount.code ? `${discount.code} | ` : ''}
                {discount.discountType === 'percentage' ? `${discount.value}%` : formatCurrency(discount.value)}
              </p>
            </td>
            <td className="px-4 py-3 text-slate-300">
              <p>Min purchase {formatCurrency(discount.minimumPurchase ?? 0)}</p>
              <p className="text-xs text-slate-400">Min qty {discount.minimumQuantity ?? 1}</p>
            </td>
            <td className="px-4 py-3 text-slate-300">
              <p>{discount.scopeType.replaceAll('_', ' ')}</p>
              <p className="text-xs text-slate-400">
                {discount.products?.length ? discount.products.map((product) => product.name).join(', ') : 'All matching records'}
              </p>
            </td>
            <td className="px-4 py-3 text-slate-300">
              <p>{discount.startDate ? formatDate(discount.startDate) : 'Starts immediately'} to {discount.endDate ? formatDate(discount.endDate) : 'no end date'}</p>
              <p className="text-xs text-slate-400">
                {discount.limitUsageEnabled ? `${discount.usageCount}/${discount.usageLimit ?? 0} used` : 'Unlimited usage'}
              </p>
            </td>
            <td className="px-4 py-3 text-slate-300">{formatDate(discount.updatedAt ?? discount.createdAt)}</td>
            <td className="px-4 py-3">
              <button className="rounded-full border border-rose-400/25 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-200" onClick={() => deleteMutation.mutate(discount.id)} type="button">
                Delete
              </button>
            </td>
          </tr>
        ))}
      />
    </Surface>
  );
}

function ToolbarSearch({ search, setSearch }: { search: string; setSearch: (value: string) => void }) {
  return (
    <div className="mb-5">
      <input className={fieldClass} onChange={(event) => setSearch(event.target.value)} placeholder="Search records" value={search} />
    </div>
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

function ToggleCard({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-slate-200">
      <input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
      {label}
    </label>
  );
}

function DataTable({ columns, rows }: { columns: string[]; rows: React.ReactNode[] }) {
  return (
    <div className="overflow-x-auto overflow-y-hidden rounded-3xl border border-white/10">
      <table className="min-w-[960px] w-full text-left text-sm">
        <thead className="bg-white/6 text-slate-300">
          <tr>
            {columns.map((column) => (
              <th className="px-4 py-3" key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows : (
            <tr className="border-t border-white/10 text-slate-400">
              <td className="px-4 py-6" colSpan={columns.length}>No records yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Message({ error }: { error: string }) {
  return <p className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>;
}

function validateRecurringPlanDraft(form: {
  name: string;
  intervalCount: string;
  price: string;
  minimumQuantity: string;
  startDate: string;
  endDate: string;
  autoCloseEnabled: boolean;
  autoCloseAfterCount: string;
}) {
  if (!form.name.trim()) {
    return 'Recurring name is required';
  }

  if (Number.isNaN(Number(form.intervalCount)) || Number(form.intervalCount) < 1) {
    return 'Billing period count must be at least 1';
  }

  if (Number.isNaN(Number(form.price)) || Number(form.price) < 0) {
    return 'Price must be a valid non-negative amount';
  }

  if (Number.isNaN(Number(form.minimumQuantity)) || Number(form.minimumQuantity) < 1) {
    return 'Minimum quantity must be at least 1';
  }

  if (form.startDate && form.endDate && form.endDate < form.startDate) {
    return 'End date cannot be before start date';
  }

  if (form.autoCloseEnabled && (Number.isNaN(Number(form.autoCloseAfterCount)) || Number(form.autoCloseAfterCount) < 1)) {
    return 'Auto-close duration is required when automatic close is enabled';
  }

  return null;
}

function validateDiscountDraft(form: {
  name: string;
  value: string;
  minimumPurchase: string;
  minimumQuantity: string;
  startDate: string;
  endDate: string;
  limitUsageEnabled: boolean;
  usageLimit: string;
  scopeType: 'all_products' | 'selected_products' | 'subscriptions';
  productIds: string[];
}) {
  if (!form.name.trim()) {
    return 'Discount name is required';
  }

  if (Number.isNaN(Number(form.value)) || Number(form.value) < 0) {
    return 'Discount value must be a valid non-negative amount';
  }

  if (Number.isNaN(Number(form.minimumPurchase)) || Number(form.minimumPurchase) < 0) {
    return 'Minimum purchase must be a valid non-negative amount';
  }

  if (Number.isNaN(Number(form.minimumQuantity)) || Number(form.minimumQuantity) < 1) {
    return 'Minimum quantity must be at least 1';
  }

  if (form.startDate && form.endDate && form.endDate < form.startDate) {
    return 'End date cannot be before start date';
  }

  if (form.limitUsageEnabled && (Number.isNaN(Number(form.usageLimit)) || Number(form.usageLimit) < 1)) {
    return 'Usage limit is required when limited usage is enabled';
  }

  if (form.scopeType === 'selected_products' && form.productIds.length === 0) {
    return 'Select at least one product for a product-specific discount';
  }

  return null;
}
