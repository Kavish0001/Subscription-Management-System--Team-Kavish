import { MetricCard, Surface } from '../../components/layout';

export function DashboardPage() {
  return (
    <>
      <MetricCard label="Active subscriptions" value="128" detail="Live contracts under billing." />
      <MetricCard label="MRR" value="INR 4.2L" detail="Updated from paid invoices." />
      <MetricCard label="Overdue invoices" value="12" detail="Needs collection attention." />
      <Surface title="Workflow coverage">
        <p className="max-w-3xl text-slate-300">
          This scaffold already includes admin catalog routes, subscription creation, invoice
          generation, mock payments, role-based auth, and portal navigation.
        </p>
      </Surface>
    </>
  );
}
