import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { useSubscriptions } from '@/api/subscriptions';
import { formatCurrency, formatDate } from '@/lib/formatters';

const renderNumber = (r: any) => <span className="font-mono text-sm">{r.subscriptionNumber}</span>;
const renderCustomer = (r: any) => r.customerContact?.name ?? '—';
const renderProducts = (r: any) => <span className="text-muted-foreground line-clamp-1">{r.lines?.map((l: any) => l.product?.name).join(', ') || '—'}</span>;
const renderStatus = (r: any) => <StatusBadge status={r.status} />;
const renderPlan = (r: any) => r.recurringPlan?.name ?? '—';
const renderExpiration = (r: any) => r.expirationDate ? formatDate(r.expirationDate) : '—';
const renderTotal = (r: any) => <span className="font-medium">{formatCurrency(r.totalAmount)}</span>;

export function SubscriptionsListPage() {
  const { data, isLoading } = useSubscriptions();
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader title="Subscriptions" subtitle={`${data?.length ?? 0} total`} actions={<Button onClick={() => navigate('/admin/subscriptions/new')}><Plus className="h-4 w-4 mr-2" />New</Button>} />
      <DataTable
        keyExtractor={(r: any) => r.id}
        isLoading={isLoading}
        data={data ?? []}
        onRowClick={(r: any) => navigate(`/admin/subscriptions/${r.id}`)}
        columns={[
          { header: 'Number', accessor: renderNumber },
          { header: 'Customer', accessor: renderCustomer },
          { header: 'Products', accessor: renderProducts },
          { header: 'Status', accessor: renderStatus },
          { header: 'Plan', accessor: renderPlan },
          { header: 'Expiration', accessor: renderExpiration },
          { header: 'Total', accessor: renderTotal },
        ]}
      />
    </div>
  );
}
