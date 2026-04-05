import { useParams, useNavigate } from 'react-router-dom';
import { useProductById, useCreateProduct, useUpdateProduct, useDeleteProduct, useAddVariant, useAddPlanPricing, useCategories } from '@/api/products';
import { useAttributes, useRecurringPlans, useTaxRules } from '@/api/config';
import { PageHeader } from '@/components/PageHeader';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Tabs, TabsContent, TabsList, TabsTrigger, Card, CardContent, Badge } from '@/components/ui';
import { Trash2, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/formatters';

export function ProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const { data: product } = useProductById(id ?? '');
  const { data: categories } = useCategories();
  const { data: attributes } = useAttributes();
  const { data: plans } = useRecurringPlans();
  const { data: taxRules } = useTaxRules();

  const createMut = useCreateProduct();
  const updateMut = useUpdateProduct();
  const deleteMut = useDeleteProduct();
  const addVariantMut = useAddVariant();
  const addPricingMut = useAddPlanPricing();

  const [form, setForm] = useState({
    name: '',
    description: '',
    productType: 'service',
    baseSalesPrice: 0,
    costPrice: 0,
    categoryId: '',
    imageUrl: '',
    taxRuleIds: [] as string[],
  });
  const [pendingPlanPricings, setPendingPlanPricings] = useState<{ recurringPlanId: string; price: number }[]>([]);
  const [newVariantValues, setNewVariantValues] = useState<string[]>([]);
  const [newPricing, setNewPricing] = useState({ recurringPlanId: '', price: 0 });
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        description: product.description ?? '',
        productType: product.productType,
        baseSalesPrice: Number(product.baseSalesPrice),
        costPrice: Number(product.costPrice),
        categoryId: product.categoryId ?? '',
        imageUrl: product.imageUrl ?? '',
        taxRuleIds: product.taxRules?.map((t: any) => t.taxRuleId) ?? [],
      });
    }
  }, [product]);

  const handleSave = () => {
    if (isNew) {
      createMut.mutate(form, { onSuccess: d => {
        // Chain: attach any pending recurring pricings
        Promise.all(pendingPlanPricings.map(pp => addPricingMut.mutateAsync({ id: d.id, ...pp }))).finally(() => navigate(`/admin/products/${d.id}`));
      }});
    } else {
      updateMut.mutate({ id, ...form });
    }
  };

  const removePendingPlan = (idx: number) => {
    setPendingPlanPricings(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <PageHeader
        title={isNew ? 'New Product' : form.name || 'Product'}
        subtitle={isNew ? undefined : `Slug: ${product?.slug}`}
        actions={
          <div className="flex gap-2">
            {!isNew && (
              <Button variant="outline" size="icon" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
            <Button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>
              {isNew ? 'Create' : 'Save Changes'}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-1">
              <Label>Product Name</Label>
              <Input value={form.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Premium Plan" />
            </div>
            <div className="space-y-1">
              <Label>Product Type</Label>
              <Select value={form.productType} onValueChange={(v: string) => setForm(f => ({ ...f, productType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="goods">Goods</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={form.categoryId} onValueChange={(v: string) => setForm(f => ({ ...f, categoryId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <textarea
                className="w-full min-h-[80px] px-3 py-2 text-sm border border-input rounded-md bg-background resize-y"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Product description..."
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Images (up to 5)</Label>
                <span className="text-xs text-muted-foreground">{(form.imageUrl ? form.imageUrl.split(',').filter(Boolean) : []).length} / 5 uploaded</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(form.imageUrl ? form.imageUrl.split(',').filter(Boolean) : []).map((src, i, arr) => (
                  <div key={`img-${i}`} className="relative group aspect-square rounded-md overflow-hidden border border-border bg-muted">
                    <img src={src} alt={`Product image ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        const newArr = arr.filter((_, idx) => idx !== i);
                        setForm(f => ({ ...f, imageUrl: newArr.join(',') }));
                      }}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {(form.imageUrl ? form.imageUrl.split(',').filter(Boolean) : []).length < 5 && (
                  <label className="flex flex-col items-center justify-center aspect-square rounded-md border-2 border-dashed border-border bg-muted/40 cursor-pointer hover:bg-muted/80 transition-colors">
                    <Plus className="h-6 w-6 text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground">Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const files = Array.from(e.target.files ?? []);
                        const existing = form.imageUrl ? form.imageUrl.split(',').filter(Boolean) : [];
                        const remaining = 5 - existing.length;
                        files.slice(0, remaining).forEach(file => {
                          const reader = new FileReader();
                          reader.onload = () => {
                            setForm(f => {
                              const current = f.imageUrl ? f.imageUrl.split(',').filter(Boolean) : [];
                              if (current.length >= 5) return f;
                              return { ...f, imageUrl: [...current, reader.result as string].join(',') };
                            });
                          };
                          reader.readAsDataURL(file);
                        });
                        e.target.value = '';
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-1">
              <Label>Sales Price (₹)</Label>
              <Input type="number" value={form.baseSalesPrice} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, baseSalesPrice: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1">
              <Label>Cost Price (₹)</Label>
              <Input type="number" value={form.costPrice} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, costPrice: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1">
              <Label>Tax Rule</Label>
              <Select value={form.taxRuleIds[0] ?? 'none'} onValueChange={(v: string) => setForm(f => ({ ...f, taxRuleIds: v && v !== 'none' ? [v] : [] }))}>
                <SelectTrigger><SelectValue placeholder="Select tax rule" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No tax</SelectItem>
                  {taxRules?.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.name} ({t.ratePercent}%)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!isNew && product?.taxRules?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {product.taxRules.map((tr: any) => (
                  <Badge key={tr.id} variant="secondary">{tr.taxRule?.name}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recurring Plan Pricing - visible for both new and existing */}
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-semibold">Recurring Plan Pricing</Label>
              <span className="text-xs text-muted-foreground">{isNew ? 'These will be attached after creation' : 'Manage plan-specific prices'}</span>
            </div>
            {/* List of already-attached plans OR pending list for new */}
            {(isNew ? pendingPlanPricings : product?.planPricing ?? []).length > 0 && (
              <table className="w-full text-sm mb-4">
                <thead><tr className="border-b"><th className="text-left pb-2 font-medium">Plan</th><th className="text-right pb-2 font-medium">Price (₹)</th>{isNew && <th/>}</tr></thead>
                <tbody>
                  {isNew
                    ? pendingPlanPricings.map((pp, idx) => (
                      <tr key={pp.recurringPlanId} className="border-b">
                        <td className="py-2">{plans?.find((p: any) => p.id === pp.recurringPlanId)?.name ?? pp.recurringPlanId}</td>
                        <td className="py-2 text-right font-medium">₹{pp.price}</td>
                        <td className="py-2 text-right"><Button variant="ghost" size="icon" onClick={() => removePendingPlan(idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button></td>
                      </tr>
                    ))
                    : product?.planPricing?.map((pp: any) => (
                      <tr key={pp.id} className="border-b">
                        <td className="py-2">{pp.recurringPlan?.name}</td>
                        <td className="py-2 text-right font-medium">{formatCurrency(pp.price)}</td>
                        <td/>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
            <div className="flex gap-2 items-end flex-wrap border-t pt-4">
              <div className="space-y-1">
                <Label>Plan</Label>
                <Select value={newPricing.recurringPlanId} onValueChange={(v: string) => setNewPricing(p => ({ ...p, recurringPlanId: v }))}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Select plan" /></SelectTrigger>
                  <SelectContent>{plans?.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Price (₹)</Label>
                <Input type="number" value={newPricing.price} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPricing(p => ({ ...p, price: Number(e.target.value) }))} className="w-28" />
              </div>
              <Button size="sm" disabled={!newPricing.recurringPlanId} onClick={() => {
                if (isNew) {
                  setPendingPlanPricings(prev => [...prev, newPricing]);
                  setNewPricing({ recurringPlanId: '', price: 0 });
                } else {
                  addPricingMut.mutate({ id, ...newPricing });
                }
              }}>
                <Plus className="h-4 w-4 mr-1" />Add
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {!isNew && (
        <Tabs defaultValue="pricing">
          <TabsList>
            <TabsTrigger value="pricing">Recurring Prices</TabsTrigger>
            <TabsTrigger value="variants">Variants</TabsTrigger>
          </TabsList>

          <TabsContent value="pricing">
            <Card>
              <CardContent className="pt-6">
                <table className="w-full text-sm mb-4">
                  <thead><tr className="border-b"><th className="text-left pb-2 font-medium">Plan</th><th className="text-right pb-2 font-medium">Price</th><th className="text-right pb-2 font-medium">Min Qty</th></tr></thead>
                  <tbody>
                    {product?.planPricing?.map((pp: any) => (
                      <tr key={pp.id} className="border-b">
                        <td className="py-2">{pp.recurringPlan?.name}</td>
                        <td className="py-2 text-right font-medium">{formatCurrency(pp.price)}</td>
                        <td className="py-2 text-right text-muted-foreground">{pp.minimumQuantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex gap-2 items-end flex-wrap border-t pt-4">
                  <div className="space-y-1">
                    <Label>Plan</Label>
                    <Select value={newPricing.recurringPlanId} onValueChange={(v: string) => setNewPricing(p => ({ ...p, recurringPlanId: v }))} >
                      <SelectTrigger className="w-44"><SelectValue placeholder="Select plan" /></SelectTrigger>
                      <SelectContent>{plans?.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Price (₹)</Label>
                    <Input type="number" value={newPricing.price} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPricing(p => ({ ...p, price: Number(e.target.value) }))} className="w-28" />
                  </div>
                  <Button size="sm" onClick={() => addPricingMut.mutate({ id, ...newPricing })} disabled={addPricingMut.isPending}>
                    <Plus className="h-4 w-4 mr-1" />Add
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="variants">
            <Card>
              <CardContent className="pt-6">
                <table className="w-full text-sm mb-4">
                  <thead><tr className="border-b"><th className="text-left pb-2 font-medium">Variant</th><th className="text-left pb-2 font-medium">Values</th></tr></thead>
                  <tbody>
                    {product?.variants?.map((v: any) => (
                      <tr key={v.id} className="border-b">
                        <td className="py-2 text-muted-foreground">#{v.id.slice(0, 8)}</td>
                        <td className="py-2">{v.values?.map((vv: any) => `${vv.attributeValue?.attribute?.name}: ${vv.attributeValue?.value}`).join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex gap-2 items-end flex-wrap border-t pt-4">
                  <div className="space-y-1">
                    <Label>Attribute Value</Label>
                    <Select onValueChange={(v: string) => setNewVariantValues([v])}>
                      <SelectTrigger className="w-52"><SelectValue placeholder="Select value" /></SelectTrigger>
                      <SelectContent>
                        {attributes?.flatMap((a: any) => a.values?.map((val: any) => (
                          <SelectItem key={val.id} value={val.id}>{a.name}: {val.value}</SelectItem>
                        )))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button size="sm" onClick={() => addVariantMut.mutate({ id: id ?? '', attributeValueIds: newVariantValues })} disabled={addVariantMut.isPending}>
                    <Plus className="h-4 w-4 mr-1" />Add Variant
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <ConfirmDialog
        open={deleteOpen}
        title="Delete Product"
        description="This action cannot be undone. All related data will be affected."
        onConfirm={() => deleteMut.mutate(id!, { onSuccess: () => navigate('/admin/products') })}
        onCancel={() => setDeleteOpen(false)}
        confirmLabel="Delete"
        isLoading={deleteMut.isPending}
      />
    </div>
  );
}
