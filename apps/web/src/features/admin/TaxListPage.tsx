import { Surface } from '../../components/layout';

const taxes = [
  { name: 'GST 18%', computation: 'Percentage', amount: '18%', mode: 'percentage' },
  { name: 'Service Fee', computation: 'Fixed price', amount: 'INR 50', mode: 'fixed' }
];

export function TaxListPage() {
  return (
    <Surface
      actions={
        <button className="rounded-full bg-gradient-to-r from-amber-300 to-rose-500 px-4 py-2 text-sm font-semibold text-slate-950" type="button">
          New
        </button>
      }
      title="Taxes"
    >
      <p className="mb-4 text-slate-300">Tax list page for configuration and calculation setup.</p>
      <div className="overflow-hidden rounded-3xl border border-white/10">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/6 text-slate-300">
            <tr>
              <th className="px-4 py-3">Tax Name</th>
              <th className="px-4 py-3">Computation</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Mode</th>
            </tr>
          </thead>
          <tbody>
            {taxes.map((tax) => (
              <tr className="border-t border-white/10 text-slate-100" key={tax.name}>
                <td className="px-4 py-3">{tax.name}</td>
                <td className="px-4 py-3">{tax.computation}</td>
                <td className="px-4 py-3">{tax.amount}</td>
                <td className="px-4 py-3">{tax.mode}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Surface>
  );
}
