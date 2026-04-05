import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DataTable } from '@/components/DataTable';
import { RecurringPlansAPI, useRecurringPlans } from '@/api/config';
import { Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const emptyForm = { name: '', price: 0, intervalCount: 1, intervalUnit: 'month', minimumQuantity: 1, isClosable: false, isPausable: false, isRenewable: false };

export function RecurringPlansPage() {
  const { data, isLoading } = useRecurringPlans();
  const createMut = RecurringPlansAPI.useCreate();
  const updateMut = RecurringPlansAPI.useUpdate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(emptyForm);
  const [editing, setEditing] = useState<any>(null);

  const openEdit = (item: any) => {
    setEditing(item);
    setForm({ name: item.name, price: Number(item.price), intervalCount: item.intervalCount, intervalUnit: item.intervalUnit, minimumQuantity: item.minimumQuantity, isClosable: item.isClosable, isPausable: item.isPausable, isRenewable: item.isRenewable });
    setOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Recurring Plans"
        subtitle={`${data?.length ?? 0} plans`}
        actions={
          <Button onClick={() => { setEditing(null); setForm(emptyForm); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />New Plan
          </Button>
        }
      />
      <DataTable
        keyExtractor={r => r.id}
        isLoading={isLoading}
        data={data ?? []}
        onRowClick={openEdit}
        columns={[
          { header: 'Plan Name', accessor: r => <span className="font-medium">{r.name}</span> },
          { header: 'Interval', accessor: r => `Every ${r.intervalCount} ${r.intervalUnit}(s)` },
          { header: 'Price', accessor: r => formatCurrency(r.price) },
          { header: 'Min Qty', accessor: 'minimumQuantity' },
          { header: 'Renewable', accessor: r => r.isRenewable ? '✓' : '—' },
          { header: 'Closable', accessor: r => r.isClosable ? '✓' : '—' },
          { header: 'Pausable', accessor: r => r.isPausable ? '✓' : '—' },
        ]}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Plan' : 'New Recurring Plan'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1"><Label>Plan Name</Label><Input value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} placeholder="e.g. Monthly Plan" /></div>
            <div className="space-y-1"><Label>Price (₹)</Label><Input type="number" value={form.price} onChange={e => setForm((f: any) => ({ ...f, price: Number(e.target.value) }))} /></div>
            <div className="space-y-1"><Label>Min Qty</Label><Input type="number" value={form.minimumQuantity} onChange={e => setForm((f: any) => ({ ...f, minimumQuantity: Number(e.target.value) }))} /></div>
            <div className="space-y-1"><Label>Interval Count</Label><Input type="number" value={form.intervalCount} onChange={e => setForm((f: any) => ({ ...f, intervalCount: Number(e.target.value) }))} /></div>
            <div className="space-y-1"><Label>Interval Unit</Label>
              <Select value={form.intervalUnit} onValueChange={v => setForm((f: any) => ({ ...f, intervalUnit: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="year">Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 flex gap-6 pt-2">
              {[['isRenewable', 'Renewable'], ['isClosable', 'Closable'], ['isPausable', 'Pausable']].map(([k, l]) => (
                <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Switch checked={form[k]} onCheckedChange={v => setForm((f: any) => ({ ...f, [k]: v }))} />{l}
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              if (editing) updateMut.mutate({ id: editing.id, ...form }, { onSuccess: () => setOpen(false) });
              else createMut.mutate(form, { onSuccess: () => setOpen(false) });
            }} disabled={createMut.isPending || updateMut.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
