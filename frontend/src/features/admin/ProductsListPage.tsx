import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import { useProducts } from '@/api/products';
import { formatCurrency } from '@/lib/formatters';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export function ProductsListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { data, isLoading } = useProducts({ search, pageSize: 50 });

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle={`${data?.items?.length ?? 0} products`}
        actions={
          <>
            <Input
              placeholder="Search products..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-48"
            />
            <Button onClick={() => navigate('/admin/products/new')}>
              <Plus className="h-4 w-4 mr-2" />New Product
            </Button>
          </>
        }
      />
      <DataTable
        keyExtractor={r => r.id}
        isLoading={isLoading}
        data={data?.items ?? []}
        onRowClick={r => navigate(`/admin/products/${r.id}`)}
        columns={[
          { header: 'Product Name', accessor: r => <span className="font-medium">{r.name}</span> },
          { header: 'Type', accessor: r => <Badge variant="outline" className="capitalize">{r.productType}</Badge> },
          { header: 'Category', accessor: r => r.category?.name ?? '—' },
          { header: 'Sales Price', accessor: r => formatCurrency(r.baseSalesPrice) },
          { header: 'Cost Price', accessor: r => formatCurrency(r.costPrice) },
          { header: 'Status', accessor: r => <Badge className={r.isActive ? 'bg-green-100 text-green-700 border-0' : 'bg-red-100 text-red-700 border-0'}>{r.isActive ? 'Active' : 'Inactive'}</Badge> },
        ]}
      />
    </div>
  );
}
