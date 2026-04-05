import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DataTable } from '@/components/DataTable';
import { QuotationTemplatesAPI, useQuotationTemplates, useRecurringPlans } from '@/api/config';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';

export function QuotationTemplatesPage() {
  const { data, isLoading } = useQuotationTemplates();
  const { data: plans } = useRecurringPlans();
  const createMut = QuotationTemplatesAPI.useCreate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', validityDays: 30, recurringPlanId: '', description: '' });
  const [selected, setSelected] = useState<any>(null);

  return (
    <div>
      <PageHeader
        title="Quotation Templates"
        subtitle={`${data?.length ?? 0} templates`}
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />New Template
          </Button>
        }
      />
      <DataTable
        keyExtractor={r => r.id}
        isLoading={isLoading}
        data={data ?? []}
        onRowClick={r => setSelected(r)}
        columns={[
          { header: 'Template Name', accessor: r => <span className="font-medium">{r.name}</span> },
          { header: 'Validity', accessor: r => `${r.validityDays} days` },
          { header: 'Recurring Plan', accessor: r => r.recurringPlan?.name ?? '—' },
          { header: 'Products', accessor: r => <Badge variant="secondary">{r.lines?.length ?? 0} lines</Badge> },
          { header: 'Status', accessor: r => <Badge className={r.isActive ? 'bg-green-100 text-green-700 border-0' : 'bg-gray-100 text-gray-700 border-0'}>{r.isActive ? 'Active' : 'Inactive'}</Badge> },
        ]}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Quotation Template</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Template Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Standard Monthly" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Validity (days)</Label><Input type="number" value={form.validityDays} onChange={e => setForm(f => ({ ...f, validityDays: Number(e.target.value) }))} /></div>
              <div className="space-y-1"><Label>Recurring Plan</Label>
                <Select value={form.recurringPlanId || 'none'} onValueChange={v => setForm(f => ({ ...f, recurringPlanId: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {plans?.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1"><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMut.mutate(form, { onSuccess: () => { setOpen(false); setForm({ name: '', validityDays: 30, recurringPlanId: '', description: '' }); } })} disabled={createMut.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selected && (
        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{selected.name}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{selected.description || 'No description'}</p>
              <table className="w-full text-sm">
                <thead><tr className="border-b"><th className="text-left pb-2 font-medium">Product</th><th className="text-right pb-2 font-medium">Qty</th><th className="text-right pb-2 font-medium">Unit Price</th></tr></thead>
                <tbody>
                  {selected.lines?.map((l: any) => (
                    <tr key={l.id} className="border-b">
                      <td className="py-1.5">{l.product?.name}</td>
                      <td className="py-1.5 text-right">{l.quantity}</td>
                      <td className="py-1.5 text-right">₹{l.unitPrice}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
