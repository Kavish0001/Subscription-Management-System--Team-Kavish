import { useParams, useNavigate } from 'react-router-dom';
import { useSubscription, useCreateSubscription, useUpdateSubscription, useSendQuotation, useConfirmSubscription, useDeleteSubscription } from '@/api/subscriptions';
import { useContacts } from '@/api/contacts';
import { useRecurringPlans, useQuotationTemplates, usePaymentTerms } from '@/api/config';
import { useProducts } from '@/api/products';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, Plus, Send, CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/formatters';
import { useAuthStore } from '@/store/authStore';

export function SubscriptionFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';
  const { user } = useAuthStore();

  const { data: sub } = useSubscription(isNew ? '' : id!);
  const { data: contacts } = useContacts();
  const { data: plans } = useRecurringPlans();
  const { data: templates } = useQuotationTemplates();
  const { data: paymentTerms } = usePaymentTerms();
  const { data: productsData } = useProducts({ pageSize: 100 });

  const createMut = useCreateSubscription();
  const updateMut = useUpdateSubscription();
  const sendMut = useSendQuotation();
  const confirmMut = useConfirmSubscription();
  const deleteMut = useDeleteSubscription();

  const [form, setForm] = useState({ customerContactId: '', recurringPlanId: '', quotationTemplateId: '', paymentTermId: '', expirationDate: '', notes: '', sourceChannel: 'admin' });
  const [lines, setLines] = useState<any[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (sub) {
      setForm({ customerContactId: sub.customerContactId, recurringPlanId: sub.recurringPlanId ?? '', quotationTemplateId: sub.quotationTemplateId ?? '', paymentTermId: sub.paymentTermId ?? '', expirationDate: sub.expirationDate ? sub.expirationDate.slice(0, 10) : '', notes: sub.notes ?? '', sourceChannel: sub.sourceChannel ?? 'admin' });
      setLines(sub.lines?.map((l: any) => ({ productId: l.productId, productNameSnapshot: l.productNameSnapshot, quantity: l.quantity, unitPrice: l.unitPrice, discountAmount: l.discountAmount })) ?? []);
    }
  }, [sub]);

  const addLine = () => setLines(l => [...l, { productId: '', productNameSnapshot: '', quantity: 1, unitPrice: 0, discountAmount: 0 }]);
  const removeLine = (i: number) => setLines(l => l.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: string, value: any) => setLines(l => l.map((line, idx) => idx === i ? { ...line, [field]: value } : line));
  const setProduct = (i: number, productId: string) => {
    const prod = productsData?.items?.find((p: any) => p.id === productId);
    if (prod) updateLine(i, 'productId', productId);
    if (prod) updateLine(i, 'productNameSnapshot', prod.name);
    if (prod) updateLine(i, 'unitPrice', Number(prod.baseSalesPrice));
  };

  const subtotal = lines.reduce((s, l) => s + (l.quantity * l.unitPrice - (l.discountAmount ?? 0)), 0);

  const handleSave = () => {
    const payload = { ...form, lines };
    if (isNew) createMut.mutate(payload, { onSuccess: (d) => navigate(`/admin/subscriptions/${d.id}`) });
    else updateMut.mutate({ id, ...payload }, { onSuccess: () => {} });
  };

  const canEdit = isNew || sub?.status === 'draft' || sub?.status === 'quotation_sent';

  return (
    <div>
      <PageHeader
        title={isNew ? 'New Subscription' : sub?.subscriptionNumber ?? 'Subscription'}
        subtitle={sub ? undefined : 'Create a new subscription'}
        actions={
          <div className="flex gap-2 flex-wrap">
            {sub && <StatusBadge status={sub.status} />}
            {canEdit && <Button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>{isNew ? 'Create' : 'Save'}</Button>}
            {sub?.status === 'draft' && user?.role === 'admin' && (
              <>
                <Button variant="outline" onClick={() => sendMut.mutate(id!)} disabled={sendMut.isPending}><Send className="h-4 w-4 mr-1" />Send</Button>
                <Button variant="outline" size="icon" onClick={() => setDeleteOpen(true)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </>
            )}
            {sub?.status === 'quotation_sent' && <Button variant="outline" onClick={() => confirmMut.mutate(id!)} disabled={confirmMut.isPending}><CheckCircle className="h-4 w-4 mr-1" />Confirm</Button>}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card><CardContent className="pt-6 space-y-4">
          <div className="space-y-1">
            <Label>Customer</Label>
            <Select value={form.customerContactId} onValueChange={v => setForm(f => ({...f, customerContactId: v}))} disabled={!canEdit}>
              <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
              <SelectContent>{contacts?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Quotation Template</Label>
            <Select value={form.quotationTemplateId} onValueChange={v => setForm(f => ({...f, quotationTemplateId: v}))} disabled={!canEdit}>
              <SelectTrigger><SelectValue placeholder="Select template (optional)" /></SelectTrigger>
              <SelectContent>{templates?.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Input value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} disabled={!canEdit} placeholder="Internal notes" />
          </div>
        </CardContent></Card>

        <Card><CardContent className="pt-6 space-y-4">
          <div className="space-y-1">
            <Label>Recurring Plan</Label>
            <Select value={form.recurringPlanId} onValueChange={v => setForm(f => ({...f, recurringPlanId: v}))} disabled={!canEdit}>
              <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
              <SelectContent>{plans?.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Payment Term</Label>
            <Select value={form.paymentTermId} onValueChange={v => setForm(f => ({...f, paymentTermId: v}))} disabled={!canEdit}>
              <SelectTrigger><SelectValue placeholder="Select payment term" /></SelectTrigger>
              <SelectContent>{paymentTerms?.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Expiration Date</Label>
            <Input type="date" value={form.expirationDate} onChange={e => setForm(f => ({...f, expirationDate: e.target.value}))} disabled={!canEdit} />
          </div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="lines">
        <TabsList><TabsTrigger value="lines">Order Lines</TabsTrigger><TabsTrigger value="other">Other Info</TabsTrigger></TabsList>
        <TabsContent value="lines">
          <Card><CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b"><th className="text-left pb-2 font-medium">Product</th><th className="text-right pb-2 font-medium w-24">Qty</th><th className="text-right pb-2 font-medium w-28">Unit Price</th><th className="text-right pb-2 font-medium w-28">Discount</th><th className="text-right pb-2 font-medium w-28">Amount</th>{canEdit && <th className="w-8" />}</tr></thead>
                <tbody>
                  {lines.map((line, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-2 pr-2">
                        <Select value={line.productId} onValueChange={v => setProduct(i, v)} disabled={!canEdit}>
                          <SelectTrigger className="h-8"><SelectValue placeholder="Select product" /></SelectTrigger>
                          <SelectContent>{productsData?.items?.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </td>
                      <td className="py-2 px-1"><Input type="number" value={line.quantity} onChange={e => updateLine(i, 'quantity', Number(e.target.value))} className="h-8 text-right w-20 ml-auto" disabled={!canEdit} /></td>
                      <td className="py-2 px-1"><Input type="number" value={line.unitPrice} onChange={e => updateLine(i, 'unitPrice', Number(e.target.value))} className="h-8 text-right w-24 ml-auto" disabled={!canEdit} /></td>
                      <td className="py-2 px-1"><Input type="number" value={line.discountAmount} onChange={e => updateLine(i, 'discountAmount', Number(e.target.value))} className="h-8 text-right w-24 ml-auto" disabled={!canEdit} /></td>
                      <td className="py-2 text-right font-medium">{formatCurrency(line.quantity * line.unitPrice - (line.discountAmount ?? 0))}</td>
                      {canEdit && <td className="py-2 pl-2"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeLine(i)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {canEdit && <Button variant="outline" size="sm" className="mt-3" onClick={addLine}><Plus className="h-4 w-4 mr-1" />Add Line</Button>}
            <div className="mt-4 flex justify-end">
              <div className="text-sm space-y-1 w-48">
                <div className="flex justify-between font-semibold border-t pt-1"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              </div>
            </div>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="other">
          <Card><CardContent className="pt-6">
            <div className="space-y-1">
              <Label>Source Channel</Label>
              <Input value={form.sourceChannel} onChange={e => setForm(f => ({...f, sourceChannel: e.target.value}))} disabled={!canEdit} />
            </div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <ConfirmDialog open={deleteOpen} title="Delete Subscription" description="This action cannot be undone." onConfirm={() => deleteMut.mutate(id!, { onSuccess: () => navigate('/admin/subscriptions') })} onCancel={() => setDeleteOpen(false)} confirmLabel="Delete" isLoading={deleteMut.isPending} />
    </div>
  );
}
