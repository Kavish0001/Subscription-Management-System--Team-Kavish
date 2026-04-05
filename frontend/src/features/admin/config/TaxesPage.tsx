import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DataTable } from '@/components/DataTable';
import { TaxRulesAPI, useTaxRules } from '@/api/config';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const emptyForm = { name: '', ratePercent: 0, taxType: 'GST', isInclusive: false, isActive: true };

export function TaxesPage() {
  const { data, isLoading } = useTaxRules();
  const createMut = TaxRulesAPI.useCreate();
  const updateMut = TaxRulesAPI.useUpdate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(emptyForm);
  const [editing, setEditing] = useState<any>(null);

  const openEdit = (item: any) => {
    setEditing(item);
    setForm({ name: item.name, ratePercent: Number(item.ratePercent), taxType: item.taxType, isInclusive: item.isInclusive, isActive: item.isActive });
    setOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Tax Rules"
        subtitle={`${data?.length ?? 0} rules`}
        actions={
          <Button onClick={() => { setEditing(null); setForm(emptyForm); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />New Tax
          </Button>
        }
      />
      <DataTable
        keyExtractor={r => r.id}
        isLoading={isLoading}
        data={data ?? []}
        onRowClick={openEdit}
        columns={[
          { header: 'Tax Name', accessor: r => <span className="font-medium">{r.name}</span> },
          { header: 'Rate', accessor: r => <strong>{r.ratePercent}%</strong> },
          { header: 'Type', accessor: 'taxType' },
          { header: 'Inclusive', accessor: r => r.isInclusive ? 'Yes' : 'No' },
          { header: 'Status', accessor: r => <Badge className={r.isActive ? 'bg-green-100 text-green-700 border-0' : 'bg-gray-100 text-gray-700 border-0'}>{r.isActive ? 'Active' : 'Inactive'}</Badge> },
        ]}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Tax Rule' : 'New Tax Rule'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Tax Name</Label><Input value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} placeholder="e.g. GST 18%" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Rate (%)</Label><Input type="number" step="0.01" value={form.ratePercent} onChange={e => setForm((f: any) => ({ ...f, ratePercent: Number(e.target.value) }))} /></div>
              <div className="space-y-1"><Label>Tax Type</Label><Input value={form.taxType} onChange={e => setForm((f: any) => ({ ...f, taxType: e.target.value }))} placeholder="GST, VAT, etc." /></div>
            </div>
            <div className="flex gap-6 pt-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer"><Switch checked={form.isInclusive} onCheckedChange={v => setForm((f: any) => ({ ...f, isInclusive: v }))} />Price Inclusive</label>
              <label className="flex items-center gap-2 text-sm cursor-pointer"><Switch checked={form.isActive} onCheckedChange={v => setForm((f: any) => ({ ...f, isActive: v }))} />Active</label>
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
