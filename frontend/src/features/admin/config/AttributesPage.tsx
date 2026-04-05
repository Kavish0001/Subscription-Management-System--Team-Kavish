import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DataTable } from '@/components/DataTable';
import { AttributesAPI, useAttributes, useAddAttributeValue } from '@/api/config';
import { Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

export function AttributesPage() {
  const { data, isLoading } = useAttributes();
  const createMut = AttributesAPI.useCreate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [selected, setSelected] = useState<any>(null);
  const [valueForm, setValueForm] = useState({ value: '', extraPrice: 0 });
  const addValueMut = useAddAttributeValue();

  return (
    <div>
      <PageHeader
        title="Attributes"
        subtitle={`${data?.length ?? 0} attributes`}
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />New Attribute
          </Button>
        }
      />
      <DataTable
        keyExtractor={r => r.id}
        isLoading={isLoading}
        data={data ?? []}
        onRowClick={r => setSelected(r)}
        columns={[
          { header: 'Attribute Name', accessor: r => <span className="font-medium">{r.name}</span> },
          { header: 'Description', accessor: r => r.description ?? '—' },
          { header: 'Values', accessor: r => `${r.values?.length ?? 0} values` },
        ]}
      />

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Attribute</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Color, Size" /></div>
            <div className="space-y-1"><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMut.mutate(form, { onSuccess: () => { setOpen(false); setForm({ name: '', description: '' }); } })}
              disabled={createMut.isPending}
            >Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail/values dialog */}
      {selected && (
        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{selected.name} — Values</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <table className="w-full text-sm">
                <thead><tr className="border-b"><th className="text-left pb-1 font-medium">Value</th><th className="text-right pb-1 font-medium">Extra Price</th></tr></thead>
                <tbody>
                  {selected.values?.map((v: any) => (
                    <tr key={v.id} className="border-b">
                      <td className="py-1.5">{v.value}</td>
                      <td className="py-1.5 text-right">{formatCurrency(v.extraPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex gap-2 items-end pt-2 border-t">
                <div className="space-y-1 flex-1">
                  <Label>Value</Label>
                  <Input value={valueForm.value} onChange={e => setValueForm(f => ({ ...f, value: e.target.value }))} placeholder="e.g. Red, Large" />
                </div>
                <div className="space-y-1 w-28">
                  <Label>Extra Price (₹)</Label>
                  <Input type="number" value={valueForm.extraPrice} onChange={e => setValueForm(f => ({ ...f, extraPrice: Number(e.target.value) }))} />
                </div>
                <Button size="sm" onClick={() => addValueMut.mutate({ id: selected.id, ...valueForm }, { onSuccess: (d) => { setSelected((s: any) => ({ ...s, values: [...(s.values ?? []), d] })); setValueForm({ value: '', extraPrice: 0 }); } })}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
