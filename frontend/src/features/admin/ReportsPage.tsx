import { useReportsSummary } from '@/api/reports';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { formatCurrency } from '@/lib/formatters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6'];

export function ReportsPage() {
  const { data, isLoading } = useReportsSummary();

  const statusData = [
    { name: 'Active', value: data?.activeSubscriptions ?? 0 },
    { name: 'Overdue', value: data?.overdueInvoices ?? 0 },
  ];

  const revenueData = data?.recentPayments?.map((p: any, i: number) => ({
    name: `#${i + 1}`, amount: Number(p.amount),
  })) ?? [];

  return (
    <div>
      <PageHeader title="Reports" subtitle="Business performance overview" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Revenue (Recent Payments)</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <div className="h-[300px] bg-muted rounded animate-pulse" /> :
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={v => `₹${v}`} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v: any) => formatCurrency(v)} cursor={{fill: 'transparent'}} />
                <Bar dataKey="amount" fill="#7c3aed" radius={[4,4,0,0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Subscription Overview</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-center">
            {isLoading ? <div className="h-[300px] bg-muted rounded animate-pulse w-full" /> :
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie 
                  data={statusData} 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={55} 
                  outerRadius={80} 
                  paddingAngle={5} 
                  dataKey="value" 
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {statusData.map((entry, i) => <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                <Tooltip formatter={(value: number) => [value, 'Subscriptions']} />
              </PieChart>
            </ResponsiveContainer>}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Key Metrics</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Active Subscriptions', value: data?.activeSubscriptions ?? 0 },
                { label: 'Monthly Recurring Revenue', value: formatCurrency(data?.mrr ?? 0) },
                { label: 'Total Revenue', value: formatCurrency(data?.totalRevenue ?? 0) },
                { label: 'Overdue Invoices', value: data?.overdueInvoices ?? 0 },
              ].map(m => (
                <div key={m.label} className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-primary">{m.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Top 3 Selling Products</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <div className="space-y-3">{[1,2,3].map(i=><div key={`skel-top-${i}`} className="h-10 bg-muted rounded animate-pulse" />)}</div> :
            <div className="space-y-3">
              {data?.topProducts?.map((p: any) => (
                <div key={`top-${p.name}`} className="flex justify-between items-center bg-green-50/50 p-3 rounded-md border border-green-100">
                   <div>
                     <p className="text-sm font-semibold">{p.name}</p>
                     <p className="text-xs text-muted-foreground">{p.sales} Sales</p>
                   </div>
                   <p className="text-sm font-bold text-green-700">{formatCurrency(p.revenue)}</p>
                </div>
              ))}
              {(!data?.topProducts || data.topProducts.length === 0) && <p className="text-sm text-center text-muted-foreground p-4">Not enough data</p>}
            </div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Needs Attention (Bottom 3)</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <div className="space-y-3">{[1,2,3].map(i=><div key={`skel-bot-${i}`} className="h-10 bg-muted rounded animate-pulse" />)}</div> :
            <div className="space-y-3">
              {data?.bottomProducts?.map((p: any) => (
                <div key={`bot-${p.name}`} className="flex justify-between items-center bg-red-50/50 p-3 rounded-md border border-red-100">
                   <div>
                     <p className="text-sm font-semibold">{p.name}</p>
                     <p className="text-xs text-muted-foreground">{p.sales} Sales</p>
                   </div>
                   <p className="text-sm font-bold text-red-700">{formatCurrency(p.revenue)}</p>
                </div>
              ))}
              {(!data?.bottomProducts || data.bottomProducts.length === 0) && <p className="text-sm text-center text-muted-foreground p-4">Not enough data</p>}
            </div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
