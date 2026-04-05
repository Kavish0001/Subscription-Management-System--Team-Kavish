import { useReportsSummary } from '@/api/reports';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { StatusBadge } from '@/components/StatusBadge';
import { TrendingUp, Users, AlertCircle, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';

export function DashboardPage() {
  const { data, isLoading } = useReportsSummary();

  const metrics = [
    { label: 'Active Subscriptions', value: data?.activeSubscriptions ?? 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'MRR', value: formatCurrency(data?.mrr ?? 0), icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Overdue Invoices', value: data?.overdueInvoices ?? 0, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Total Revenue', value: formatCurrency(data?.totalRevenue ?? 0), icon: DollarSign, color: 'text-violet-600', bg: 'bg-violet-50' },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Overview of your subscription business" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {metrics.map(m => (
          <Card key={m.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${m.bg}`}><m.icon className={`h-5 w-5 ${m.color}`} /></div>
                <div>
                  {isLoading ? <div className="h-7 w-20 bg-muted rounded animate-pulse mb-1" /> : <p className="text-2xl font-bold">{m.value}</p>}
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Recent Subscriptions</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <div className="space-y-3">{Array.from({length:4}).map((_,i)=><div key={i} className="h-10 bg-muted rounded animate-pulse" />)}</div> :
            <div className="space-y-2">
              {data?.recentSubscriptions?.map((s: any) => (
                <Link key={s.id} to={`/admin/subscriptions/${s.id}`} className="flex items-center justify-between p-2 rounded hover:bg-muted transition-colors">
                  <div><p className="text-sm font-medium">{s.subscriptionNumber}</p><p className="text-xs text-muted-foreground">{s.customerContact?.name}</p></div>
                  <div className="text-right"><StatusBadge status={s.status} /><p className="text-xs text-muted-foreground mt-1">{formatDate(s.createdAt)}</p></div>
                </Link>
              ))}
            </div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Recent Payments</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <div className="space-y-3">{Array.from({length:4}).map((_,i)=><div key={i} className="h-10 bg-muted rounded animate-pulse" />)}</div> :
            <div className="space-y-2">
              {data?.recentPayments?.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded hover:bg-muted">
                  <div><p className="text-sm font-medium">{p.invoice?.contact?.name}</p><p className="text-xs text-muted-foreground">{p.invoice?.invoiceNumber}</p></div>
                  <div className="text-right"><p className="text-sm font-semibold text-green-600">{formatCurrency(p.amount)}</p><p className="text-xs text-muted-foreground">{p.paidAt ? formatDate(p.paidAt) : ''}</p></div>
                </div>
              ))}
            </div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
