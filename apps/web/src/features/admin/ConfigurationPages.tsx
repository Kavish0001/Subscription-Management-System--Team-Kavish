import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type ReactNode } from 'react';

import { Surface } from '../../components/layout';
import {
  apiRequest,
  ApiError,
  formatCurrency,
  formatDate,
  type PaginatedResponse,
  type PaymentTermConfig,
  type Product,
  type ProductAttributeConfig,
  type QuotationTemplateConfig,
  type RecurringPlan
} from '../../lib/api';
import { useSession } from '../../lib/session';

const fieldClass = 'rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3';

type AttributeValueDraft = {
  value: string;
  extraPrice: string;
};

type TemplateLineDraft = {
  productId: string;
  quantity: string;
  unitPrice: string;
};

const blankAttributeValue = (): AttributeValueDraft => ({
  value: '',
  extraPrice: '0'
});

const blankTemplateLine = (): TemplateLineDraft => ({
  productId: '',
  quantity: '1',
  unitPrice: '0'
});

export function AttributeListPage() {
  const { token } = useSession();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [values, setValues] = useState<AttributeValueDraft[]>([blankAttributeValue()]);
  const [error, setError] = useState<string | null>(null);

  const attributesQuery = useQuery({
    queryKey: ['admin-config-attributes'],
    queryFn: () => apiRequest<ProductAttributeConfig[]>('/attributes', { token })
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      apiRequest<ProductAttributeConfig>('/attributes', {
        token,
        method: 'POST',
        body: JSON.stringify({
          name,
          values: values
            .filter((entry) => entry.value.trim())
            .map((entry) => ({
              value: entry.value.trim(),
              extraPrice: Number(entry.extraPrice || 0)
            }))
        })
      }),
    onSuccess: async () => {
      setError(null);
      setName('');
      setValues([blankAttributeValue()]);
      await queryClient.invalidateQueries({ queryKey: ['admin-config-attributes'] });
    },
    onError: (mutationError) => {
      setError(mutationError instanceof ApiError ? mutationError.message : 'Unable to save attribute');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) =>
      apiRequest<void>(`/attributes/${id}`, {
        token,
        method: 'DELETE'
      }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['admin-config-attributes'] });
    },
    onError: (mutationError) => {
      setError(mutationError instanceof ApiError ? mutationError.message : 'Unable to delete attribute');
    }
  });

  const rows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return (attributesQuery.data ?? []).filter((entry) => !normalizedSearch || entry.name.toLowerCase().includes(normalizedSearch));
  }, [attributesQuery.data, search]);

  const createValidationError = validateAttributeDraft(name, values);

  return (
    <Surface title="Attributes" description="Create reusable product attributes and the extra-price values that products can use as variants.">
      {error ? <Message error={error} /> : null}
      <ConfigToolbar search={search} setSearch={setSearch} />
      <div className="mb-6 rounded-[28px] border border-white/10 bg-slate-950/35 p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Attribute name">
            <input className={fieldClass} onChange={(event) => setName(event.target.value)} value={name} />
          </Field>
          <div className="flex items-end justify-end">
            <button
              className="rounded-full bg-gradient-to-r from-amber-300 to-rose-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
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
              {createMutation.isPending ? 'Saving...' : 'Save Attribute'}
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-400">Use a unique attribute name and add at least one active value.</p>
        <div className="mt-5 rounded-[24px] border border-white/10 bg-slate-950/25 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-200">Attribute values</p>
            <button className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-semibold text-white" onClick={() => setValues((current) => [...current, blankAttributeValue()])} type="button">
              Add Value
            </button>
          </div>
          <div className="grid gap-3">
            {values.map((entry, index) => (
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]" key={`${index}-${entry.value}`}>
                <input
                  className={fieldClass}
                  onChange={(event) =>
                    setValues((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, value: event.target.value } : item)))
                  }
                  placeholder="Value"
                  value={entry.value}
                />
                <input
                  className={fieldClass}
                  min="0"
                  onChange={(event) =>
                    setValues((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, extraPrice: event.target.value } : item)))
                  }
                  placeholder="Default extra price"
                  type="number"
                  value={entry.extraPrice}
                />
                <button
                  className="rounded-full border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200"
                  onClick={() =>
                    setValues((current) => (current.length === 1 ? [blankAttributeValue()] : current.filter((_, itemIndex) => itemIndex !== index)))
                  }
                  type="button"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
      <ConfigTable
        columns={['Attribute', 'Values', 'Status', 'Updated', 'Actions']}
        rows={rows.map((entry) => (
          <tr className="border-t border-white/10 text-slate-100" key={entry.id}>
            <td className="px-4 py-3 font-semibold">{entry.name}</td>
            <td className="px-4 py-3">
              <div className="flex flex-wrap gap-2">
                {entry.values.length ? entry.values.map((value) => (
                  <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-slate-200" key={value.id}>
                    {value.value} {Number(value.extraPrice) > 0 ? `| +${formatCurrency(value.extraPrice)}` : ''}
                  </span>
                )) : <span className="text-slate-400">No values</span>}
              </div>
            </td>
            <td className="px-4 py-3">{entry.isActive ? 'Active' : 'Archived'}</td>
            <td className="px-4 py-3 text-slate-300">{formatDate(entry.updatedAt)}</td>
            <td className="px-4 py-3">
              <button className="rounded-full border border-rose-400/25 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-200" onClick={() => deleteMutation.mutate(entry.id)} type="button">
                Delete
              </button>
            </td>
          </tr>
        ))}
      />
    </Surface>
  );
}

export function PaymentTermListPage() {
  const { token } = useSession();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dueDays, setDueDays] = useState('0');
  const [error, setError] = useState<string | null>(null);

  const paymentTermsQuery = useQuery({
    queryKey: ['admin-config-payment-terms'],
    queryFn: () => apiRequest<PaymentTermConfig[]>('/payment-terms', { token })
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      apiRequest<PaymentTermConfig>('/payment-terms', {
        token,
        method: 'POST',
        body: JSON.stringify({
          name,
          description: description || undefined,
          dueDays: Number(dueDays)
        })
      }),
    onSuccess: async () => {
      setError(null);
      setName('');
      setDescription('');
      setDueDays('0');
      await queryClient.invalidateQueries({ queryKey: ['admin-config-payment-terms'] });
    },
    onError: (mutationError) => {
      setError(mutationError instanceof ApiError ? mutationError.message : 'Unable to save payment term');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) =>
      apiRequest<void>(`/payment-terms/${id}`, {
        token,
        method: 'DELETE'
      }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['admin-config-payment-terms'] });
    },
    onError: (mutationError) => {
      setError(mutationError instanceof ApiError ? mutationError.message : 'Unable to delete payment term');
    }
  });

  const rows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return (paymentTermsQuery.data ?? []).filter((entry) => !normalizedSearch || entry.name.toLowerCase().includes(normalizedSearch));
  }, [paymentTermsQuery.data, search]);

  const createValidationError = validatePaymentTermDraft(name, dueDays);

  return (
    <Surface title="Payment Terms" description="Reusable payment-term labels for quotations and subscriptions.">
      {error ? <Message error={error} /> : null}
      <ConfigToolbar search={search} setSearch={setSearch} />
      <div className="mb-6 rounded-[28px] border border-white/10 bg-slate-950/35 p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Payment term">
            <input className={fieldClass} onChange={(event) => setName(event.target.value)} value={name} />
          </Field>
          <Field label="Due in days">
            <input className={fieldClass} min="0" onChange={(event) => setDueDays(event.target.value)} type="number" value={dueDays} />
          </Field>
          <Field className="md:col-span-2" label="Description">
            <textarea className={fieldClass} onChange={(event) => setDescription(event.target.value)} rows={3} value={description} />
          </Field>
        </div>
        <div className="mt-4">
          <button
            className="rounded-full bg-gradient-to-r from-amber-300 to-rose-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
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
            {createMutation.isPending ? 'Saving...' : 'Save Payment Term'}
          </button>
        </div>
      </div>
      <ConfigTable
        columns={['Payment Term', 'Due', 'Status', 'Updated', 'Actions']}
        rows={rows.map((entry) => (
          <tr className="border-t border-white/10 text-slate-100" key={entry.id}>
            <td className="px-4 py-3">
              <p className="font-semibold">{entry.name}</p>
              <p className="text-xs text-slate-400">{entry.description || 'No description'}</p>
            </td>
            <td className="px-4 py-3 text-slate-300">{entry.dueDays} day(s)</td>
            <td className="px-4 py-3">{entry.isActive ? 'Active' : 'Archived'}</td>
            <td className="px-4 py-3 text-slate-300">{formatDate(entry.updatedAt)}</td>
            <td className="px-4 py-3">
              <button className="rounded-full border border-rose-400/25 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-200" onClick={() => deleteMutation.mutate(entry.id)} type="button">
                Delete
              </button>
            </td>
          </tr>
        ))}
      />
    </Surface>
  );
}

export function QuotationTemplateListPage() {
  const { token } = useSession();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [validityDays, setValidityDays] = useState('30');
  const [recurringPlanId, setRecurringPlanId] = useState('');
  const [paymentTermLabel, setPaymentTermLabel] = useState('');
  const [isLastForever, setIsLastForever] = useState(true);
  const [durationCount, setDurationCount] = useState('12');
  const [durationUnit, setDurationUnit] = useState<'week' | 'month' | 'year'>('month');
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<TemplateLineDraft[]>([blankTemplateLine()]);
  const [error, setError] = useState<string | null>(null);

  const templatesQuery = useQuery({
    queryKey: ['admin-config-quotation-templates'],
    queryFn: () => apiRequest<QuotationTemplateConfig[]>('/quotation-templates', { token })
  });

  const recurringPlansQuery = useQuery({
    queryKey: ['admin-config-recurring-plans-options'],
    queryFn: () => apiRequest<RecurringPlan[]>('/recurring-plans', { token })
  });

  const paymentTermsQuery = useQuery({
    queryKey: ['admin-config-payment-terms-options'],
    queryFn: () => apiRequest<PaymentTermConfig[]>('/payment-terms', { token })
  });

  const productsQuery = useQuery({
    queryKey: ['admin-config-products-options'],
    queryFn: () => apiRequest<PaginatedResponse<Product>>('/admin/products?page=1&pageSize=100&isActive=true', { token })
  });

  const products = productsQuery.data?.items ?? [];

  const createMutation = useMutation({
    mutationFn: async () =>
      apiRequest<QuotationTemplateConfig>('/quotation-templates', {
        token,
        method: 'POST',
        body: JSON.stringify({
          name,
          validityDays: Number(validityDays),
          recurringPlanId: recurringPlanId || null,
          paymentTermLabel,
          isLastForever,
          durationCount: isLastForever ? null : Number(durationCount),
          durationUnit: isLastForever ? null : durationUnit,
          description: description || undefined,
          lines: lines
            .filter((line) => line.productId)
            .map((line) => ({
              productId: line.productId,
              quantity: Number(line.quantity),
              unitPrice: Number(line.unitPrice)
            }))
        })
      }),
    onSuccess: async () => {
      setError(null);
      setName('');
      setValidityDays('30');
      setRecurringPlanId('');
      setPaymentTermLabel('');
      setIsLastForever(true);
      setDurationCount('12');
      setDurationUnit('month');
      setDescription('');
      setLines([blankTemplateLine()]);
      await queryClient.invalidateQueries({ queryKey: ['admin-config-quotation-templates'] });
    },
    onError: (mutationError) => {
      setError(mutationError instanceof ApiError ? mutationError.message : 'Unable to save quotation template');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) =>
      apiRequest<void>(`/quotation-templates/${id}`, {
        token,
        method: 'DELETE'
      }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['admin-config-quotation-templates'] });
    },
    onError: (mutationError) => {
      setError(mutationError instanceof ApiError ? mutationError.message : 'Unable to delete quotation template');
    }
  });

  const rows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return (templatesQuery.data ?? []).filter(
      (entry) =>
        !normalizedSearch ||
        entry.name.toLowerCase().includes(normalizedSearch) ||
        entry.paymentTermLabel.toLowerCase().includes(normalizedSearch)
    );
  }, [search, templatesQuery.data]);

  const createValidationError = validateQuotationTemplateDraft({
    name,
    validityDays,
    paymentTermLabel,
    isLastForever,
    durationCount,
    durationUnit,
    lines
  });

  return (
    <Surface title="Quotation Templates" description="Save reusable quotation setups with validity, plan defaults, lifecycle duration, and product lines.">
      {error ? <Message error={error} /> : null}
      <ConfigToolbar search={search} setSearch={setSearch} />
      <div className="mb-6 rounded-[28px] border border-white/10 bg-slate-950/35 p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Template name">
            <input className={fieldClass} onChange={(event) => setName(event.target.value)} value={name} />
          </Field>
          <Field label="Quotation validity in days">
            <input className={fieldClass} min="1" onChange={(event) => setValidityDays(event.target.value)} type="number" value={validityDays} />
          </Field>
          <Field label="Recurring plan">
            <select className={fieldClass} onChange={(event) => setRecurringPlanId(event.target.value)} value={recurringPlanId}>
              <option value="">Select recurring plan</option>
              {(recurringPlansQuery.data ?? []).map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Payment term">
            <select className={fieldClass} onChange={(event) => setPaymentTermLabel(event.target.value)} value={paymentTermLabel}>
              <option value="">Select payment term</option>
              {(paymentTermsQuery.data ?? []).map((term) => (
                <option key={term.id} value={term.name}>
                  {term.name}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-slate-200">
            <input checked={isLastForever} onChange={(event) => setIsLastForever(event.target.checked)} type="checkbox" />
            Last forever
          </label>
          <Field label="End after">
            <div className="grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
              <input className={fieldClass} disabled={isLastForever} min="1" onChange={(event) => setDurationCount(event.target.value)} type="number" value={durationCount} />
              <select className={fieldClass} disabled={isLastForever} onChange={(event) => setDurationUnit(event.target.value as 'week' | 'month' | 'year')} value={durationUnit}>
                <option value="week">Week</option>
                <option value="month">Month</option>
                <option value="year">Year</option>
              </select>
            </div>
          </Field>
          <Field className="md:col-span-2" label="Description">
            <textarea className={fieldClass} onChange={(event) => setDescription(event.target.value)} rows={3} value={description} />
          </Field>
        </div>
        <div className="mt-5 rounded-[24px] border border-white/10 bg-slate-950/25 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-200">Template product lines</p>
            <button className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-semibold text-white" onClick={() => setLines((current) => [...current, blankTemplateLine()])} type="button">
              Add Line
            </button>
          </div>
          <div className="grid gap-3">
            {lines.map((line, index) => {
              const selectedProduct = products.find((product) => product.id === line.productId);
              return (
                <div className="grid gap-3 rounded-2xl border border-white/10 bg-slate-950/30 p-4 md:grid-cols-[minmax(0,1fr)_120px_180px_auto]" key={`${line.productId}-${index}`}>
                  <select
                    className={fieldClass}
                    onChange={(event) => {
                      const productId = event.target.value;
                      const product = products.find((entry) => entry.id === productId);
                      setLines((current) =>
                        current.map((entry, entryIndex) =>
                          entryIndex === index
                            ? {
                                ...entry,
                                productId,
                                unitPrice: String(product?.baseSalesPrice ?? entry.unitPrice)
                              }
                            : entry
                        )
                      );
                    }}
                    value={line.productId}
                  >
                    <option value="">Select product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                  <input
                    className={fieldClass}
                    min="1"
                    onChange={(event) => setLines((current) => current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, quantity: event.target.value } : entry)))}
                    placeholder="Qty"
                    type="number"
                    value={line.quantity}
                  />
                  <input
                    className={fieldClass}
                    min="0"
                    onChange={(event) => setLines((current) => current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, unitPrice: event.target.value } : entry)))}
                    placeholder="Unit price"
                    type="number"
                    value={line.unitPrice}
                  />
                  <button
                    className="rounded-full border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200"
                    onClick={() => setLines((current) => (current.length === 1 ? [blankTemplateLine()] : current.filter((_, entryIndex) => entryIndex !== index)))}
                    type="button"
                  >
                    Remove
                  </button>
                  {selectedProduct ? <p className="md:col-span-4 text-xs text-slate-400">{selectedProduct.description || 'No description'}</p> : null}
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-4">
          <button
            className="rounded-full bg-gradient-to-r from-amber-300 to-rose-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
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
            {createMutation.isPending ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>
      <ConfigTable
        columns={['Template', 'Plan / Term', 'Lines', 'Updated', 'Actions']}
        rows={rows.map((entry) => (
          <tr className="border-t border-white/10 text-slate-100" key={entry.id}>
            <td className="px-4 py-3">
              <p className="font-semibold">{entry.name}</p>
              <p className="text-xs text-slate-400">
                Valid {entry.validityDays} day(s)
                {entry.isLastForever ? ' | Last forever' : entry.durationCount && entry.durationUnit ? ` | End after ${entry.durationCount} ${entry.durationUnit}(s)` : ''}
              </p>
            </td>
            <td className="px-4 py-3 text-slate-300">
              <p>{entry.recurringPlan?.name ?? 'No recurring plan'}</p>
              <p className="text-xs text-slate-400">{entry.paymentTermLabel}</p>
            </td>
            <td className="px-4 py-3">
              <div className="grid gap-1 text-xs text-slate-300">
                {entry.lines.length ? entry.lines.map((line) => (
                  <p key={line.id}>
                    {line.productName} x {line.quantity} | {formatCurrency(line.unitPrice)}
                  </p>
                )) : <p className="text-slate-400">No preset lines</p>}
              </div>
            </td>
            <td className="px-4 py-3 text-slate-300">{formatDate(entry.updatedAt)}</td>
            <td className="px-4 py-3">
              <button className="rounded-full border border-rose-400/25 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-200" onClick={() => deleteMutation.mutate(entry.id)} type="button">
                Delete
              </button>
            </td>
          </tr>
        ))}
      />
    </Surface>
  );
}

function ConfigToolbar({ search, setSearch }: { search: string; setSearch: (value: string) => void }) {
  return (
    <div className="mb-5">
      <input className={fieldClass} onChange={(event) => setSearch(event.target.value)} placeholder="Search records" value={search} />
    </div>
  );
}

function ConfigTable({ columns, rows }: { columns: string[]; rows: ReactNode[] }) {
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

function Field({ children, className, label }: { children: ReactNode; className?: string; label: string }) {
  return (
    <label className={`grid gap-2 text-sm text-slate-200 ${className ?? ''}`}>
      {label}
      {children}
    </label>
  );
}

function Message({ error }: { error: string }) {
  return <p className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>;
}

function validateAttributeDraft(name: string, values: AttributeValueDraft[]) {
  if (!name.trim()) {
    return 'Attribute name is required';
  }

  const activeValues = values.filter((entry) => entry.value.trim());
  if (activeValues.length === 0) {
    return 'Add at least one attribute value';
  }

  const keys = new Set<string>();
  for (const entry of activeValues) {
    const normalized = entry.value.trim().toLowerCase();
    if (keys.has(normalized)) {
      return 'Duplicate attribute values are not allowed';
    }

    if (Number.isNaN(Number(entry.extraPrice)) || Number(entry.extraPrice) < 0) {
      return 'Default extra price must be a valid non-negative amount';
    }

    keys.add(normalized);
  }

  return null;
}

function validatePaymentTermDraft(name: string, dueDays: string) {
  if (!name.trim()) {
    return 'Payment term name is required';
  }

  if (Number.isNaN(Number(dueDays)) || Number(dueDays) < 0) {
    return 'Due days must be a valid non-negative number';
  }

  return null;
}

function validateQuotationTemplateDraft(input: {
  name: string;
  validityDays: string;
  paymentTermLabel: string;
  isLastForever: boolean;
  durationCount: string;
  durationUnit: 'week' | 'month' | 'year';
  lines: TemplateLineDraft[];
}) {
  if (!input.name.trim()) {
    return 'Template name is required';
  }

  if (Number.isNaN(Number(input.validityDays)) || Number(input.validityDays) < 1) {
    return 'Quotation validity must be at least 1 day';
  }

  if (!input.paymentTermLabel.trim()) {
    return 'Payment term is required';
  }

  if (!input.isLastForever && (Number.isNaN(Number(input.durationCount)) || Number(input.durationCount) < 1)) {
    return `End-after duration is required in ${input.durationUnit}(s)`;
  }

  const activeLines = input.lines.filter((line) => line.productId);
  if (activeLines.length === 0) {
    return 'Add at least one product line';
  }

  for (const line of activeLines) {
    if (Number.isNaN(Number(line.quantity)) || Number(line.quantity) < 1) {
      return 'Line quantity must be at least 1';
    }

    if (Number.isNaN(Number(line.unitPrice)) || Number(line.unitPrice) < 0) {
      return 'Line unit price must be a valid non-negative amount';
    }
  }

  return null;
}
