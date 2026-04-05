import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DataTable } from '@/components/DataTable';
import { DiscountRulesAPI } from '@/api/config';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { Badge } from '@/components/ui/badge';

const emptyForm = { name: '', code: '', type: 'percentage', value: 0, scopeType: 'all_products', isActive: true, minimumPurchase: 0, usageLimit: 0 };

export function DiscountsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['discount-rules'], queryFn: () => api.get('/api/discount-rules').then(r => r.data) });
  const createMut = DiscountRulesAPI.useCreate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(emptyForm);

  return (
    <div>
      <PageHeader
        title="Discount Rules"
        subtitle={`${data?.length ?? 0} discounts`}
        actions={
          <Button onClick={() => { setForm(emptyForm); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />New Discount
          </Button>
        }
      />
      <DataTable
        keyExtractor={r => r.id}
        isLoading={isLoading}
        data={data ?? []}
        columns={[
          { header: 'Name', accessor: r => <span className="font-medium">{r.name}</span> },
          { header: 'Code', accessor: r => <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono">{r.code}</code> },
          { header: 'Type', accessor: r => <Badge variant="outline" className="capitalize">{r.type}</Badge> },
          { header: 'Value', accessor: r => r.type === 'percentage' ? `${r.value}%` : formatCurrency(r.value) },
          { header: 'Used / Limit', accessor: r => `${r.usageCount}${r.usageLimit ? ` / ${r.usageLimit}` : ''}` },
          { header: 'Status', accessor: r => <Badge className={r.isActive ? 'bg-green-100 text-green-700 border-0' : 'bg-gray-100 text-gray-700 border-0'}>{r.isActive ? 'Active' : 'Inactive'}</Badge> },
        ]}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Discount Rule</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Name</Label><Input value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} placeholder="Summer Sale" /></div>
              <div className="space-y-1"><Label>Code</Label><Input value={form.code} onChange={e => setForm((f: any) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="SAVE20" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm((f: any) => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Value ({form.type === 'percentage' ? '%' : '₹'})</Label><Input type="number" value={form.value} onChange={e => setForm((f: any) => ({ ...f, value: Number(e.target.value) }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Min Purchase (₹)</Label><Input type="number" value={form.minimumPurchase} onChange={e => setForm((f: any) => ({ ...f, minimumPurchase: Number(e.target.value) }))} /></div>
              <div className="space-y-1"><Label>Usage Limit (0 = unlimited)</Label><Input type="number" value={form.usageLimit} onChange={e => setForm((f: any) => ({ ...f, usageLimit: Number(e.target.value) }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMut.mutate(form, { onSuccess: () => setOpen(false) })} disabled={createMut.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
