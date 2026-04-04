import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { Surface } from '../../components/layout';
import {
  apiRequest,
  ApiError,
  formatDate,
  type PaymentTermConfig,
  type ProductAttributeConfig,
  type QuotationTemplateConfig,
  type RecurringPlan
} from '../../lib/api';
import { useSession } from '../../lib/session';

const fieldClass = 'rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3';

export function AttributeListPage() {
  const { token } = useSession();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
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
        body: JSON.stringify({ name })
      }),
    onSuccess: async () => {
      setError(null);
      setName('');
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

  return (
    <Surface title="Attributes" description="Attribute masters used by product variants. Configuration is managed from this dedicated list page.">
      {error ? <Message error={error} /> : null}
      <ConfigToolbar search={search} setSearch={setSearch} />
      <div className="mb-6 rounded-[28px] border border-white/10 bg-slate-950/35 p-5">
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <Field label="Attribute name">
            <input className={fieldClass} onChange={(event) => setName(event.target.value)} value={name} />
          </Field>
          <div className="flex items-end">
            <button className="rounded-full bg-gradient-to-r from-amber-300 to-rose-500 px-4 py-2 text-sm font-semibold text-slate-950" onClick={() => createMutation.mutate()} type="button">
              New
            </button>
          </div>
        </div>
      </div>
      <ConfigTable
        columns={['Attribute', 'Values', 'Status', 'Updated', 'Actions']}
        rows={rows.map((entry) => (
          <tr className="border-t border-white/10 text-slate-100" key={entry.id}>
            <td className="px-4 py-3 font-semibold">{entry.name}</td>
            <td className="px-4 py-3 text-slate-300">{entry.valuesCount}</td>
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

  return (
    <Surface title="Payment Terms" description="Reusable payment-term labels for subscription and quotation setup.">
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
          <button className="rounded-full bg-gradient-to-r from-amber-300 to-rose-500 px-4 py-2 text-sm font-semibold text-slate-950" onClick={() => createMutation.mutate()} type="button">
            New
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
  const [description, setDescription] = useState('');
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
          description: description || undefined
        })
      }),
    onSuccess: async () => {
      setError(null);
      setName('');
      setValidityDays('30');
      setRecurringPlanId('');
      setPaymentTermLabel('');
      setDescription('');
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

  return (
    <Surface title="Quotation Templates" description="Template-level defaults for subscription quotations, validity, recurring plans, and payment terms.">
      {error ? <Message error={error} /> : null}
      <ConfigToolbar search={search} setSearch={setSearch} />
      <div className="mb-6 rounded-[28px] border border-white/10 bg-slate-950/35 p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Template name">
            <input className={fieldClass} onChange={(event) => setName(event.target.value)} value={name} />
          </Field>
          <Field label="Validity days">
            <input className={fieldClass} min="1" onChange={(event) => setValidityDays(event.target.value)} type="number" value={validityDays} />
          </Field>
          <Field label="Recurring plan">
            <select className={fieldClass} onChange={(event) => setRecurringPlanId(event.target.value)} value={recurringPlanId}>
              <option value="">None</option>
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
          <Field className="md:col-span-2" label="Description">
            <textarea className={fieldClass} onChange={(event) => setDescription(event.target.value)} rows={3} value={description} />
          </Field>
        </div>
        <div className="mt-4">
          <button className="rounded-full bg-gradient-to-r from-amber-300 to-rose-500 px-4 py-2 text-sm font-semibold text-slate-950" onClick={() => createMutation.mutate()} type="button">
            New
          </button>
        </div>
      </div>
      <ConfigTable
        columns={['Template', 'Recurring Plan', 'Payment Term', 'Updated', 'Actions']}
        rows={rows.map((entry) => (
          <tr className="border-t border-white/10 text-slate-100" key={entry.id}>
            <td className="px-4 py-3">
              <p className="font-semibold">{entry.name}</p>
              <p className="text-xs text-slate-400">{entry.validityDays} day validity | {entry.linesCount} lines</p>
            </td>
            <td className="px-4 py-3 text-slate-300">{entry.recurringPlan?.name ?? 'None'}</td>
            <td className="px-4 py-3 text-slate-300">{entry.paymentTermLabel}</td>
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

function ConfigTable({ columns, rows }: { columns: string[]; rows: React.ReactNode[] }) {
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

function Field({ children, className, label }: { children: React.ReactNode; className?: string; label: string }) {
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
