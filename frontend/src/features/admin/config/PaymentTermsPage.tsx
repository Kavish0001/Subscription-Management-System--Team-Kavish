import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DataTable } from '@/components/DataTable';
import { PaymentTermsAPI, usePaymentTerms } from '@/api/config';
import { Plus } from 'lucide-react';

export function PaymentTermsPage() {
  const { data, isLoading } = usePaymentTerms();
  const createMut = PaymentTermsAPI.useCreate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', earlyDiscount: 0, earlyDiscountDays: 0 });
  const [selected, setSelected] = useState<any>(null);

  return (
    <div>
      <PageHeader
        title="Payment Terms"
        subtitle={`${data?.length ?? 0} terms`}
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />New Term
          </Button>
        }
      />
      <DataTable
        keyExtractor={r => r.id}
        isLoading={isLoading}
        data={data ?? []}
        onRowClick={r => setSelected(r)}
        columns={[
          { header: 'Name', accessor: r => <span className="font-medium">{r.name}</span> },
          { header: 'Early Discount', accessor: r => r.earlyDiscount ? `${r.earlyDiscount}% (within ${r.earlyDiscountDays} days)` : '—' },
          { header: 'Due Lines', accessor: r => `${r.lines?.length ?? 0} lines` },
        ]}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Payment Term</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Immediate Payment, Net 30" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Early Discount (%)</Label>
                <Input type="number" value={form.earlyDiscount} onChange={e => setForm(f => ({ ...f, earlyDiscount: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label>Within (days)</Label>
                <Input type="number" value={form.earlyDiscountDays} onChange={e => setForm(f => ({ ...f, earlyDiscountDays: Number(e.target.value) }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMut.mutate(form, { onSuccess: () => { setOpen(false); setForm({ name: '', earlyDiscount: 0, earlyDiscountDays: 0 }); } })} disabled={createMut.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View lines modal */}
      {selected && (
        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{selected.name} — Due Lines</DialogTitle></DialogHeader>
            {selected.lines?.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">No due lines configured.</p>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b"><th className="text-left pb-2 font-medium">Type</th><th className="text-right pb-2 font-medium">Value</th><th className="text-right pb-2 font-medium">After Days</th></tr></thead>
                <tbody>
                  {selected.lines?.map((l: any) => (
                    <tr key={l.id} className="border-b">
                      <td className="py-2 capitalize">{l.dueType}</td>
                      <td className="py-2 text-right">{l.dueValue}{l.dueType === 'percent' ? '%' : ' ₹'}</td>
                      <td className="py-2 text-right">{l.afterDays} days</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
