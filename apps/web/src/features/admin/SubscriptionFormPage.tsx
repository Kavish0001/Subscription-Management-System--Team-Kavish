import { Surface } from '../../components/layout';

export function SubscriptionFormPage() {
  return (
    <Surface
      title="Subscription Form"
      actions={
        <div className="flex gap-3">
          <button className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white" type="button">
            Delete
          </button>
          <button className="rounded-full bg-gradient-to-r from-amber-300 to-rose-500 px-4 py-2 text-sm font-semibold text-slate-950" type="button">
            Save
          </button>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm text-slate-200">
          Customer
          <input className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3" placeholder="Search or create contact" />
        </label>
        <label className="grid gap-2 text-sm text-slate-200">
          Salesperson
          <input className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3" defaultValue="Current internal user" />
        </label>
        <label className="grid gap-2 text-sm text-slate-200">
          Quotation template
          <input className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3" placeholder="Starter annual plan" />
        </label>
        <label className="grid gap-2 text-sm text-slate-200">
          Payment term
          <input className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3" placeholder="Immediate payment" />
        </label>
        <label className="grid gap-2 text-sm text-slate-200 md:col-span-2">
          Notes
          <textarea className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3" rows={5} placeholder="Commercial notes and renewal context" />
        </label>
      </div>
    </Surface>
  );
}
