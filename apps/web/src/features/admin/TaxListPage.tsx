import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { Surface } from '../../components/layout';
import { apiRequest, formatCurrency, formatDate, type TaxRule } from '../../lib/api';
import { ApiError } from '../../lib/api';
import { useSession } from '../../lib/session';

const fieldClass = 'rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3';

export function TaxListPage() {
  const queryClient = useQueryClient();
  const { token } = useSession();
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    computation: 'percentage' as 'percentage' | 'fixed',
    amount: '18',
    taxType: 'gst'
  });

  const taxesQuery = useQuery({
    queryKey: ['admin-taxes'],
    queryFn: () => apiRequest<TaxRule[]>('/taxes', { token })
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiRequest('/taxes', {
        token,
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          computation: form.computation,
          amount: Number(form.amount),
          taxType: form.taxType,
          isInclusive: false
        })
      }),
    onSuccess: async () => {
      setError(null);
      setForm({
        name: '',
        computation: 'percentage',
        amount: '18',
        taxType: 'gst'
      });
      await queryClient.invalidateQueries({ queryKey: ['admin-taxes'] });
    },
    onError: (mutationError) => {
      setError(mutationError instanceof ApiError ? mutationError.message : 'Unable to create tax');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) =>
      apiRequest<void>(`/taxes/${id}`, {
        token,
        method: 'DELETE'
      }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['admin-taxes'] });
    },
    onError: (mutationError) => {
      setError(mutationError instanceof ApiError ? mutationError.message : 'Unable to delete tax');
    }
  });

  const rows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return (taxesQuery.data ?? []).filter((tax) => !normalizedSearch || tax.name.toLowerCase().includes(normalizedSearch));
  }, [search, taxesQuery.data]);

  return (
    <Surface
      title="Taxes"
      description="Configure fixed or percentage tax rules and attach them to products."
    >
      {error ? <p className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
      <div className="mb-5">
        <input className={fieldClass} onChange={(event) => setSearch(event.target.value)} placeholder="Search taxes" value={search} />
      </div>
      <div className="mb-6 grid gap-4 rounded-[28px] border border-white/10 bg-slate-950/35 p-5 md:grid-cols-2 xl:grid-cols-4">
        <label className="grid gap-2 text-sm text-slate-200">
          Tax name
          <input className={fieldClass} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} value={form.name} />
        </label>
        <label className="grid gap-2 text-sm text-slate-200">
          Computation
          <select className={fieldClass} onChange={(event) => setForm((value) => ({ ...value, computation: event.target.value as 'percentage' | 'fixed' }))} value={form.computation}>
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed price</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm text-slate-200">
          Amount
          <input className={fieldClass} min="0" onChange={(event) => setForm((value) => ({ ...value, amount: event.target.value }))} type="number" value={form.amount} />
        </label>
        <label className="grid gap-2 text-sm text-slate-200">
          Tax type
          <input className={fieldClass} onChange={(event) => setForm((value) => ({ ...value, taxType: event.target.value }))} value={form.taxType} />
        </label>
        <button className="rounded-full bg-gradient-to-r from-emerald-300 to-sky-400 px-4 py-2 text-sm font-semibold text-slate-950 md:col-span-2 xl:col-span-4 xl:justify-self-start" onClick={() => createMutation.mutate()} type="button">
          Save tax
        </button>
      </div>
      <div className="overflow-x-auto overflow-y-hidden rounded-3xl border border-white/10">
        <table className="min-w-[820px] w-full text-left text-sm">
          <thead className="bg-white/6 text-slate-300">
            <tr>
              <th className="px-4 py-3">Tax Name</th>
              <th className="px-4 py-3">Computation</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((tax) => (
              <tr className="border-t border-white/10 text-slate-100" key={tax.id}>
                <td className="px-4 py-3">{tax.name}</td>
                <td className="px-4 py-3 capitalize">{tax.computation}</td>
                <td className="px-4 py-3">
                  {tax.computation === 'fixed' ? formatCurrency(tax.amount ?? tax.ratePercent) : `${tax.amount ?? tax.ratePercent}%`}
                </td>
                <td className="px-4 py-3">{tax.taxType}</td>
                <td className="px-4 py-3 text-slate-300">{formatDate(tax.updatedAt ?? tax.createdAt)}</td>
                <td className="px-4 py-3">
                  <button className="rounded-full border border-rose-400/25 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-200" onClick={() => deleteMutation.mutate(tax.id)} type="button">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr className="border-t border-white/10 text-slate-400">
                <td className="px-4 py-6" colSpan={6}>No taxes yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Surface>
  );
}
