import { useNavigate, Link } from 'react-router-dom';
import { useMySubscriptions } from '@/api/subscriptions';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Package } from 'lucide-react';

export function OrdersListPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useMySubscriptions();

  return (
    <div>
      {/* Account tabs */}
      <div className="flex gap-2 mb-6">
        <Link to="/account/profile" className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
          My Profile
        </Link>
        <div className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
          My Orders
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6">
        <Package className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-bold">My Orders</h1>
        {data && <span className="text-sm text-muted-foreground">({data.length} total)</span>}
      </div>

      {!isLoading && data?.length === 0 ? (
        <div className="text-center py-16">
          <Package className="h-14 w-14 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-4">You haven't placed any orders yet.</p>
          <Link to="/shop" className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium">
            Browse Products
          </Link>
        </div>
      ) : (
        <DataTable
          keyExtractor={r => r.id}
          isLoading={isLoading}
          data={data ?? []}
          onRowClick={r => navigate(`/account/orders/${r.subscriptionNumber}`)}
          columns={[
            { header: 'Order ID', accessor: r => <span className="font-mono text-sm font-medium">{r.subscriptionNumber}</span> },
            { header: 'Date', accessor: r => formatDate(r.createdAt) },
            { header: 'Plan', accessor: r => r.recurringPlan?.name ?? 'One-time' },
            { header: 'Items', accessor: r => `${r.lines?.length ?? 0} item(s)` },
            { header: 'Total', accessor: r => <span className="font-medium">{formatCurrency(r.totalAmount)}</span> },
            { header: 'Status', accessor: r => <StatusBadge status={r.status} /> },
          ]}
        />
      )}
    </div>
  );
}
