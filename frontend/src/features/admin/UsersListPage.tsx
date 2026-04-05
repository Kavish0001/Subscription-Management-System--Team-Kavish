import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { DataTable, Column } from '@/components/DataTable';
import { useUsers } from '@/api/users';
import { useAuthStore } from '@/store/authStore';
import { Badge } from '../../components/ui/badge';
import { formatDate } from '@/lib/formatters';

type UserRow = Record<string, any>;

const columns: Column<UserRow>[] = [
  {
    header: 'Name',
    accessor: (r) => <span className="font-medium">{r.contacts?.[0]?.name ?? '—'}</span>,
  },
  {
    header: 'Email',
    accessor: (r) => String(r.email ?? ''),
  },
  {
    header: 'Role',
    accessor: (r) => (
      <Badge variant="outline" className="capitalize">
        {String(r.role ?? '').replace('_', ' ')}
      </Badge>
    ),
  },
  {
    header: 'Phone',
    accessor: (r) => r.contacts?.[0]?.phone ?? '—',
  },
  {
    header: 'Status',
    accessor: (r) => (
      <Badge className={r.isActive ? 'bg-green-100 text-green-700 border-0' : 'bg-red-100 text-red-700 border-0'}>
        {r.isActive ? 'Active' : 'Inactive'}
      </Badge>
    ),
  },
  {
    header: 'Joined',
    accessor: (r) => formatDate(r.createdAt),
  },
];

export function UsersListPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useUsers();
  const { isAdmin, isInternal } = useAuthStore();

  return (
    <div>
      <PageHeader
        title="Users & Contacts"
        subtitle={`${data?.length ?? 0} users`}
        actions={isAdmin() || isInternal() ? (
          <Button onClick={() => navigate('/admin/users/new')}>
            <Plus className="h-4 w-4 mr-2" />New User
          </Button>
        ) : undefined}
      />
      <DataTable<UserRow>
        keyExtractor={(r) => r.id}
        isLoading={isLoading}
        data={data ?? []}
        onRowClick={(r) => navigate(`/admin/users/${r.id}`)}
        columns={columns}
      />
    </div>
  );
}
