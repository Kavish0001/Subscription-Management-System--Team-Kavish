import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Surface } from '../../components/layout';
import { apiRequest, formatCurrency, type TaxRule } from '../../lib/api';
import { ApiError } from '../../lib/api';
import { useSession } from '../../lib/session';

export function TaxListPage() {
  const queryClient = useQueryClient();
  const { token } = useSession();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    computation: 'percentage',
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
      setIsCreating(false);
      await queryClient.invalidateQueries({ queryKey: ['admin-taxes'] });
    },
    onError: (mutationError) => {
      setError(mutationError instanceof ApiError ? mutationError.message : 'Unable to create tax');
    }
  });

  return (
    <Surface
      actions={
        <button className="rounded-full bg-gradient-to-r from-amber-300 to-rose-500 px-4 py-2 text-sm font-semibold text-slate-950" onClick={() => setIsCreating((value) => !value)} type="button">
          {isCreating ? 'Close' : 'New'}
        </button>
      }
      title="Taxes"
    >
      <p className="mb-4 text-slate-300">Tax list page for configuration and calculation setup.</p>
      {error ? <p className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
      {isCreating ? (
        <div className="mb-6 grid gap-4 rounded-[28px] border border-white/10 bg-slate-950/35 p-5 md:grid-cols-3">
          <label className="grid gap-2 text-sm text-slate-200">
            Tax Name
            <input className={fieldClass} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} value={form.name} />
          </label>
          <label className="grid gap-2 text-sm text-slate-200">
            Computation
            <select className={fieldClass} onChange={(event) => setForm((value) => ({ ...value, computation: event.target.value }))} value={form.computation}>
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed price</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm text-slate-200">
            Amount
            <input className={fieldClass} onChange={(event) => setForm((value) => ({ ...value, amount: event.target.value }))} type="number" value={form.amount} />
          </label>
          <button className="rounded-full bg-gradient-to-r from-emerald-300 to-sky-400 px-4 py-2 text-sm font-semibold text-slate-950 md:col-span-3 md:justify-self-start" onClick={() => createMutation.mutate()} type="button">
            Save tax
          </button>
        </div>
      ) : null}
      <div className="overflow-x-auto overflow-y-hidden rounded-3xl border border-white/10">
        <table className="min-w-[720px] w-full text-left text-sm">
          <thead className="bg-white/6 text-slate-300">
            <tr>
              <th className="px-4 py-3">Tax Name</th>
              <th className="px-4 py-3">Computation</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Mode</th>
            </tr>
          </thead>
          <tbody>
            {taxesQuery.data?.map((tax) => (
              <tr className="border-t border-white/10 text-slate-100" key={tax.id}>
                <td className="px-4 py-3">{tax.name}</td>
                <td className="px-4 py-3">{Number(tax.ratePercent) > 100 ? 'Fixed price' : 'Percentage'}</td>
                <td className="px-4 py-3">{Number(tax.ratePercent) > 100 ? formatCurrency(tax.ratePercent) : `${tax.ratePercent}%`}</td>
                <td className="px-4 py-3">{tax.taxType}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Surface>
  );
}

const fieldClass = 'rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3';
