import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusMap: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700' },
  quotation_sent: { label: 'Quotation Sent', className: 'bg-blue-100 text-blue-700' },
  confirmed: { label: 'Confirmed', className: 'bg-orange-100 text-orange-700' },
  active: { label: 'Active', className: 'bg-green-100 text-green-700' },
  paused: { label: 'Paused', className: 'bg-yellow-100 text-yellow-700' },
  closed: { label: 'Closed', className: 'bg-red-100 text-red-700' },
  paid: { label: 'Paid', className: 'bg-green-100 text-green-700' },
  overdue: { label: 'Overdue', className: 'bg-red-100 text-red-700' },
  succeeded: { label: 'Succeeded', className: 'bg-green-100 text-green-700' },
  failed: { label: 'Failed', className: 'bg-red-100 text-red-700' },
  pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700' },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusMap[status] ?? { label: status, className: 'bg-gray-100 text-gray-700' };
  return (
    <Badge className={cn('font-medium border-0 text-xs', config.className)}>
      {config.label}
    </Badge>
  );
}
