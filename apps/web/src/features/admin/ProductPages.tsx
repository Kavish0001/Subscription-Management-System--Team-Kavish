import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { Surface } from '../../components/layout';
import {
  apiRequest,
  ApiError,
  formatCurrency,
  formatDate,
  type PaginatedResponse,
  type Product,
  type ProductAttributeConfig,
  type ProductMedia,
  type ProductRecurringPrice,
  type ProductVariantDetail,
  type RecurringPlan,
  type TaxRule,
} from '../../lib/api';
import { useSession } from '../../lib/session';

const PAGE_SIZE = 12;
const fieldClass = 'rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3';

type ProductFilters = {
  search: string;
  productType: '' | 'goods' | 'service';
  hasRecurringPrices: '' | 'true' | 'false';
  hasVariants: '' | 'true' | 'false';
  hasMedia: '' | 'true' | 'false';
  isActive: '' | 'true' | 'false';
};

type ProductFormState = {
  name: string;
  slug: string;
  description: string;
  productType: 'goods' | 'service';
  baseSalesPrice: string;
  costPrice: string;
  isActive: boolean;
  media: ProductMedia[];
  recurringPrices: Array<ProductRecurringPrice & { startDate: string; endDate: string }>;
  variants: ProductVariantDetail[];
  taxRuleIds: string[];
};

const emptyProductForm = (): ProductFormState => ({
  name: '',
  slug: '',
  description: '',
  productType: 'service',
  baseSalesPrice: '0',
  costPrice: '0',
  isActive: true,
  media: [],
  recurringPrices: [],
  variants: [],
  taxRuleIds: [],
});

export function ProductListPage() {
  const { token } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ProductFilters>({
    search: '',
    productType: '',
    hasRecurringPrices: '',
    hasVariants: '',
    hasMedia: '',
    isActive: 'true',
  });

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
      sortBy: 'updated'
    });

    if (filters.search.trim()) params.set('search', filters.search.trim());
    if (filters.productType) params.set('productType', filters.productType);
    if (filters.hasRecurringPrices) params.set('hasRecurringPrices', filters.hasRecurringPrices);
    if (filters.hasVariants) params.set('hasVariants', filters.hasVariants);
    if (filters.hasMedia) params.set('hasMedia', filters.hasMedia);
    if (filters.isActive) params.set('isActive', filters.isActive);

    return params.toString();
  }, [filters, page]);

  const productsQuery = useQuery({
    queryKey: ['admin-product-management', queryString],
    queryFn: () => apiRequest<PaginatedResponse<Product>>(`/admin/products?${queryString}`, { token })
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) =>
      apiRequest(`/admin/products/${id}`, {
        token,
        method: 'DELETE'
      }),
    onSuccess: async () => {
      setError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-product-management'] }),
        queryClient.invalidateQueries({ queryKey: ['portal-products'] }),
        queryClient.invalidateQueries({ queryKey: ['product-detail'] }),
      ]);
    },
    onError: (mutationError) => {
      setError(mutationError instanceof ApiError ? mutationError.message : 'Unable to delete product');
    }
  });

  const items = productsQuery.data?.items ?? [];
  const total = productsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Surface
      title="Products"
      description="Admin-only catalog records with media, recurring prices, and variants."
      actions={
        <Link className="rounded-full bg-gradient-to-r from-amber-300 to-rose-500 px-4 py-2 text-sm font-semibold text-slate-950" to="/admin/products/new">
          New Product
        </Link>
      }
    >
      {error ? <p className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
      <div className="mb-5 grid gap-3 lg:grid-cols-[2fr_repeat(5,minmax(0,1fr))]">
        <input
          className={fieldClass}
          onChange={(event) => {
            setPage(1);
            setFilters((value) => ({ ...value, search: event.target.value }));
          }}
          placeholder="Search product name or type"
          value={filters.search}
        />
        <select className={fieldClass} onChange={(event) => {
          setPage(1);
          setFilters((value) => ({ ...value, productType: event.target.value as ProductFilters['productType'] }));
        }} value={filters.productType}>
          <option value="">All Types</option>
          <option value="service">Service</option>
          <option value="goods">Goods</option>
        </select>
        <FilterSelect label="Recurring" value={filters.hasRecurringPrices} onChange={(value) => {
          setPage(1);
          setFilters((entry) => ({ ...entry, hasRecurringPrices: value }));
        }} />
        <FilterSelect label="Variants" value={filters.hasVariants} onChange={(value) => {
          setPage(1);
          setFilters((entry) => ({ ...entry, hasVariants: value }));
        }} />
        <FilterSelect label="Media" value={filters.hasMedia} onChange={(value) => {
          setPage(1);
          setFilters((entry) => ({ ...entry, hasMedia: value }));
        }} />
        <FilterSelect label="Status" value={filters.isActive} onChange={(value) => {
          setPage(1);
          setFilters((entry) => ({ ...entry, isActive: value }));
        }} trueLabel="Active" falseLabel="Inactive" />
      </div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
        <p>Showing {items.length ? (page - 1) * PAGE_SIZE + 1 : 0}-{Math.min(page * PAGE_SIZE, total)} of {total} products</p>
        <PaginationControls currentPage={page} onPageChange={setPage} totalPages={totalPages} />
      </div>
      <div className="overflow-x-auto overflow-y-hidden rounded-3xl border border-white/10">
        <table className="min-w-[1100px] w-full text-left text-sm">
          <thead className="bg-white/6 text-slate-300">
            <tr>
              <th className="px-4 py-3">Product Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Sales Price</th>
              <th className="px-4 py-3">Cost Price</th>
              <th className="px-4 py-3">Media</th>
              <th className="px-4 py-3">Recurring</th>
              <th className="px-4 py-3">Variants</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((product) => (
              <tr className="border-t border-white/10 text-slate-100" key={product.id}>
                <td className="px-4 py-3">
                  <div>
                    <p className="font-semibold">{product.name}</p>
                    <p className="text-xs text-slate-400">{product.slug}</p>
                  </div>
                </td>
                <td className="px-4 py-3 capitalize">{product.productType}</td>
                <td className="px-4 py-3">{formatCurrency(product.baseSalesPrice)}</td>
                <td className="px-4 py-3">{formatCurrency(product.costPrice)}</td>
                <td className="px-4 py-3">{product.mediaCount ?? product.imageUrls.length}</td>
                <td className="px-4 py-3">{product.recurringPlansCount ?? product.planPricing.length}</td>
                <td className="px-4 py-3">{product.variantsCount ?? product.variants?.length ?? 0}</td>
                <td className="px-4 py-3">{formatDate(product.updatedAt ?? product.createdAt)}</td>
                <td className="px-4 py-3">{product.isActive ? 'Active' : 'Inactive'}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-white" onClick={() => navigate(`/admin/products/${product.id}`)} type="button">
                      View
                    </button>
                    <button className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-white" onClick={() => navigate(`/admin/products/${product.id}/edit`)} type="button">
                      Edit
                    </button>
                    <button
                      className="rounded-full border border-rose-400/25 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-200"
                      onClick={() => {
                        if (window.confirm(`Delete ${product.name}? The product will be marked inactive for future use.`)) {
                          deleteMutation.mutate(product.id);
                        }
                      }}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr className="border-t border-white/10 text-slate-400">
                <td className="px-4 py-6" colSpan={10}>No products matched the current filters.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Surface>
  );
}

export function ProductFormPage({ mode }: { mode: 'create' | 'view' | 'edit' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { token } = useSession();
  const [activeTab, setActiveTab] = useState<'media' | 'recurring' | 'variants' | 'taxes'>('media');
  const [form, setForm] = useState<ProductFormState>(emptyProductForm);
  const [error, setError] = useState<string | null>(null);
  const [sectionErrors, setSectionErrors] = useState<string[]>([]);
  const readOnly = mode === 'view';

  const productQuery = useQuery({
    queryKey: ['admin-product-detail', id],
    queryFn: () => apiRequest<Product>(`/admin/products/${id}`, { token }),
    enabled: Boolean(id && mode !== 'create')
  });

  const recurringPlansQuery = useQuery({
    queryKey: ['admin-product-recurring-plans'],
    queryFn: () => apiRequest<RecurringPlan[]>('/recurring-plans', { token })
  });

  const attributesQuery = useQuery({
    queryKey: ['admin-product-attributes'],
    queryFn: () => apiRequest<ProductAttributeConfig[]>('/attributes', { token })
  });

  const taxesQuery = useQuery({
    queryKey: ['admin-product-taxes'],
    queryFn: () => apiRequest<TaxRule[]>('/taxes', { token })
  });

  useEffect(() => {
    if (!productQuery.data) {
      return;
    }

    setForm({
      name: productQuery.data.name,
      slug: productQuery.data.slug,
      description: productQuery.data.description ?? '',
      productType: productQuery.data.productType,
      baseSalesPrice: String(productQuery.data.baseSalesPrice ?? 0),
      costPrice: String(productQuery.data.costPrice ?? 0),
      isActive: productQuery.data.isActive ?? true,
      media: (productQuery.data.media ?? []).map((entry, index) => ({
        ...entry,
        sortOrder: entry.sortOrder ?? index
      })),
      recurringPrices: (productQuery.data.recurringPrices ?? []).map((entry) => ({
        ...entry,
        startDate: entry.startDate ? entry.startDate.slice(0, 10) : '',
        endDate: entry.endDate ? entry.endDate.slice(0, 10) : '',
      })),
      variants: (productQuery.data.variants as ProductVariantDetail[] | undefined) ?? [],
      taxRuleIds: productQuery.data.taxRuleIds ?? [],
    });
  }, [productQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (saveAndNew: boolean) => {
      const issues = validateProductForm(form);
      setSectionErrors(issues);
      if (issues.length) {
        throw new ApiError(issues[0], 400);
      }

      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        description: form.description.trim() || undefined,
        productType: form.productType,
        baseSalesPrice: Number(form.baseSalesPrice),
        costPrice: Number(form.costPrice),
        isActive: form.isActive,
        media: form.media.map((entry, index) => ({
          type: entry.type,
          url: entry.url,
          fileName: entry.fileName || `media-${index + 1}`,
          thumbnailUrl: entry.thumbnailUrl,
          isPrimary: entry.isPrimary,
          sortOrder: index
        })),
        recurringPrices: form.recurringPrices.map((entry) => ({
          recurringPlanId: entry.recurringPlanId,
          planName: entry.planName.trim(),
          price: Number(entry.price),
          intervalCount: entry.intervalCount,
          billingPeriod: entry.billingPeriod,
          minimumQuantity: Number(entry.minimumQuantity),
          startDate: entry.startDate || undefined,
          endDate: entry.endDate || undefined,
          autoCloseEnabled: entry.autoCloseEnabled,
          autoCloseAfterCount: entry.autoCloseEnabled ? entry.autoCloseAfterCount ?? undefined : undefined,
          autoCloseAfterUnit: entry.autoCloseEnabled ? entry.autoCloseAfterUnit ?? undefined : undefined,
          isClosable: entry.isClosable,
          isPausable: entry.isPausable,
          isRenewable: entry.isRenewable,
          isActive: entry.isActive
        })),
        variants: form.variants.map((entry, index) => ({
          id: entry.id,
          attribute: entry.attribute.trim(),
          value: entry.value.trim(),
          extraPrice: Number(entry.extraPrice),
          sortOrder: index,
          isActive: entry.isActive
        })),
        taxRuleIds: form.taxRuleIds
      };

      const result = await apiRequest<Product>(mode === 'edit' ? `/admin/products/${id}` : '/admin/products', {
        token,
        method: mode === 'edit' ? 'PATCH' : 'POST',
        body: JSON.stringify(payload)
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-product-management'] }),
        queryClient.invalidateQueries({ queryKey: ['portal-products'] }),
        queryClient.invalidateQueries({ queryKey: ['product-detail'] }),
      ]);

      if (saveAndNew) {
        setForm(emptyProductForm());
        navigate('/admin/products/new');
        return;
      }

      navigate(`/admin/products/${result.id}`);
    },
    onSuccess: () => {
      setError(null);
    },
    onError: (mutationError) => {
      setError(mutationError instanceof ApiError ? mutationError.message : 'Unable to save product');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () =>
      apiRequest(`/admin/products/${id}`, {
        token,
        method: 'DELETE'
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-product-management'] }),
        queryClient.invalidateQueries({ queryKey: ['portal-products'] }),
        queryClient.invalidateQueries({ queryKey: ['product-detail'] }),
      ]);
      navigate('/admin/products');
    },
    onError: (mutationError) => {
      setError(mutationError instanceof ApiError ? mutationError.message : 'Unable to delete product');
    }
  });

  const handleMediaSelected = async (files: FileList | null) => {
    if (!files?.length || readOnly) {
      return;
    }

    const selected = Array.from(files);
    if (form.media.length + selected.length > 7) {
      setError('Maximum 7 media files allowed');
      return;
    }

    if (selected.some((file) => !file.type.startsWith('image/') && !file.type.startsWith('video/'))) {
      setError('Unsupported file type');
      return;
    }

    try {
      const nextEntries = await Promise.all(selected.map(async (file, index) => ({
        id: `${Date.now()}-${index}`,
        type: file.type.startsWith('video/') ? 'video' as const : 'image' as const,
        url: await readFileAsDataUrl(file),
        fileName: file.name,
        isPrimary: false,
        sortOrder: form.media.length + index
      })));

      setError(null);
      setForm((value) => {
        const merged = [...value.media, ...nextEntries];
        return {
          ...value,
          media: merged.map((entry, index) => ({
            ...entry,
            isPrimary: merged.some((item) => item.isPrimary) ? entry.isPrimary : index === 0,
            sortOrder: index
          }))
        };
      });
    } catch {
      setError('Upload failed for one or more files');
    }
  };

  return (
    <Surface
      title={mode === 'create' ? 'Create Product' : mode === 'edit' ? 'Edit Product' : 'View Product'}
      description="Manage basic product fields, media, recurring prices, and variants."
      actions={
        <div className="flex flex-wrap gap-3">
          {mode === 'view' ? (
            <button className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white" onClick={() => navigate(`/admin/products/${id}/edit`)} type="button">
              Edit
            </button>
          ) : (
            <>
              <button className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white" onClick={() => navigate('/admin/products')} type="button">
                Cancel
              </button>
              <button className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white" onClick={() => saveMutation.mutate(true)} type="button">
                Save & New
              </button>
              <button className="rounded-full bg-gradient-to-r from-amber-300 to-rose-500 px-4 py-2 text-sm font-semibold text-slate-950" onClick={() => saveMutation.mutate(false)} type="button">
                Save
              </button>
            </>
          )}
          {mode !== 'create' ? (
            <button
              className="rounded-full border border-rose-400/25 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-200"
              onClick={() => {
                if (window.confirm('Delete this product? It will be marked inactive for future use.')) {
                  deleteMutation.mutate();
                }
              }}
              type="button"
            >
              Delete
            </button>
          ) : null}
        </div>
      }
    >
      {error ? <p className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
      {sectionErrors.length ? (
        <div className="mb-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {sectionErrors.map((issue) => <p key={issue}>{issue}</p>)}
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Product Name">
          <input className={fieldClass} disabled={readOnly} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} value={form.name} />
        </Field>
        <Field label="Product Type">
          <select className={fieldClass} disabled={readOnly} onChange={(event) => setForm((value) => ({ ...value, productType: event.target.value as 'goods' | 'service' }))} value={form.productType}>
            <option value="service">Service</option>
            <option value="goods">Goods</option>
          </select>
        </Field>
        <Field label="Sales Price">
          <input className={fieldClass} disabled={readOnly} min="0" onChange={(event) => setForm((value) => ({ ...value, baseSalesPrice: event.target.value }))} type="number" value={form.baseSalesPrice} />
        </Field>
        <Field label="Cost Price">
          <input className={fieldClass} disabled={readOnly} min="0" onChange={(event) => setForm((value) => ({ ...value, costPrice: event.target.value }))} type="number" value={form.costPrice} />
        </Field>
        <Field className="md:col-span-2" label="Description">
          <textarea className={fieldClass} disabled={readOnly} onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))} rows={4} value={form.description} />
        </Field>
        <Field label="Slug">
          <input className={fieldClass} disabled={readOnly} onChange={(event) => setForm((value) => ({ ...value, slug: event.target.value }))} value={form.slug} />
        </Field>
        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-slate-200">
          <input checked={form.isActive} disabled={readOnly} onChange={(event) => setForm((value) => ({ ...value, isActive: event.target.checked }))} type="checkbox" />
          Active
        </label>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        {(['media', 'recurring', 'variants', 'taxes'] as const).map((tab) => (
          <button
            className={`rounded-full px-4 py-2 text-sm font-semibold ${activeTab === tab ? 'bg-white text-slate-950' : 'border border-white/10 bg-white/6 text-white'}`}
            key={tab}
            onClick={() => setActiveTab(tab)}
            type="button"
          >
            {tab === 'media'
              ? `Media (${form.media.length})`
              : tab === 'recurring'
                ? `Recurring Plans (${form.recurringPrices.length})`
                : tab === 'variants'
                  ? `Variants (${form.variants.length})`
                  : `Taxes (${form.taxRuleIds.length})`}
          </button>
        ))}
      </div>

      {activeTab === 'media' ? (
        <div className="mt-6 rounded-[28px] border border-white/10 bg-slate-950/35 p-5">
          {!readOnly ? (
            <input
              accept="image/*,video/*"
              className="mb-4 rounded-2xl border border-dashed border-white/15 bg-slate-950/40 px-4 py-3 text-sm file:mr-4 file:rounded-full file:border-0 file:bg-gradient-to-r file:from-emerald-300 file:to-sky-400 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-950"
              multiple
              onChange={(event) => {
                void handleMediaSelected(event.target.files);
              }}
              type="file"
            />
          ) : null}
          <p className="mb-4 text-sm text-slate-400">Media is required. Upload 1 to 7 images or videos and choose one primary item.</p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {form.media.map((entry, index) => (
              <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-3" key={entry.id || `${entry.url}-${index}`}>
                <div className="mb-3 overflow-hidden rounded-xl border border-white/10 bg-slate-950/50">
                  {entry.type === 'video' ? (
                    <video className="h-40 w-full object-cover" controls src={entry.url} />
                  ) : (
                    <img alt={entry.fileName} className="h-40 w-full object-cover" src={entry.url} />
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 text-xs text-slate-300">
                  <span className="truncate">{entry.fileName}</span>
                  {entry.isPrimary ? <span className="rounded-full bg-emerald-300 px-2 py-1 font-bold text-slate-950">Primary</span> : null}
                </div>
                {!readOnly ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-white" onClick={() => setPrimaryMedia(setForm, entry)} type="button">
                      Set Primary
                    </button>
                    <button className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-white" onClick={() => moveMedia(setForm, index, -1)} disabled={index === 0} type="button">
                      Up
                    </button>
                    <button className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-white" onClick={() => moveMedia(setForm, index, 1)} disabled={index === form.media.length - 1} type="button">
                      Down
                    </button>
                    <button className="rounded-full border border-rose-400/25 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-200" onClick={() => removeMedia(setForm, index)} type="button">
                      Remove
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === 'recurring' ? (
        <ChildTable title="Recurring Plans">
          <div className="grid gap-4">
            {(recurringPlansQuery.data ?? []).map((plan) => {
              const selectedIndex = form.recurringPrices.findIndex((entry) => entry.recurringPlanId === plan.id);
              const selectedRow = selectedIndex >= 0 ? form.recurringPrices[selectedIndex] : null;

              return (
                <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4" key={plan.id}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <label className="flex items-start gap-3">
                      <input
                        checked={Boolean(selectedRow)}
                        disabled={readOnly}
                        onChange={(event) => toggleRecurringPlan(setForm, plan, event.target.checked)}
                        type="checkbox"
                      />
                      <span>
                        <span className="block font-semibold text-white">{plan.name}</span>
                        <span className="text-sm text-slate-400">
                          Every {plan.intervalCount} {plan.intervalUnit}(s) | Min qty {plan.minimumQuantity}
                        </span>
                        <span className="mt-1 block text-xs text-slate-500">
                          {[
                            plan.isClosable ? 'Closable' : 'Not closable',
                            plan.isPausable ? 'Pausable' : 'Not pausable',
                            plan.isRenewable ? 'Renewable' : 'Not renewable'
                          ].join(' | ')}
                        </span>
                      </span>
                    </label>
                    <div className="text-sm text-slate-300">
                      <p>{formatCurrency(plan.price)}</p>
                      <p className="text-xs text-slate-500">
                        {plan.autoCloseEnabled && plan.autoCloseAfterCount && plan.autoCloseAfterUnit
                          ? `Auto-close after ${plan.autoCloseAfterCount} ${plan.autoCloseAfterUnit}(s)`
                          : 'No auto-close'}
                      </p>
                    </div>
                  </div>
                  {selectedRow ? (
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <Field label="Override price">
                        <input
                          className={fieldClass}
                          disabled={readOnly}
                          min="0"
                          onChange={(event) => updateRecurringRow(setForm, selectedIndex, 'price', Number(event.target.value))}
                          type="number"
                          value={String(selectedRow.price)}
                        />
                      </Field>
                      <Field label="Plan window">
                        <input
                          className={fieldClass}
                          disabled
                          value={
                            plan.startDate || plan.endDate
                              ? `${formatDate(plan.startDate ?? null)} to ${formatDate(plan.endDate ?? null)}`
                              : 'Always available'
                          }
                        />
                      </Field>
                    </div>
                  ) : null}
                </div>
              );
            })}
            {(recurringPlansQuery.data ?? []).length === 0 ? <p className="text-sm text-slate-400">Create recurring plans first from configuration.</p> : null}
          </div>
        </ChildTable>
      ) : null}

      {activeTab === 'variants' ? (
        <ChildTable
          title="Variants"
          onAdd={!readOnly ? () => setForm((value) => ({
            ...value,
            variants: [
              ...value.variants,
              createVariantDraft(attributesQuery.data ?? [], value.variants.length)
            ]
          })) : undefined}
        >
          <div className="grid gap-4">
            {form.variants.map((entry, index) => (
              <div className="grid gap-3 rounded-2xl border border-white/10 bg-slate-950/30 p-4 md:grid-cols-4" key={`${entry.id ?? 'new'}-${index}`}>
                <Field label="Attribute">
                  <select
                    className={fieldClass}
                    disabled={readOnly}
                    onChange={(event) => updateVariantSelection(setForm, attributesQuery.data ?? [], index, event.target.value, undefined)}
                    value={entry.attribute}
                  >
                    <option value="">Select attribute</option>
                    {(attributesQuery.data ?? []).map((attribute) => (
                      <option key={attribute.id} value={attribute.name}>
                        {attribute.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Value">
                  <select
                    className={fieldClass}
                    disabled={readOnly}
                    onChange={(event) => updateVariantSelection(setForm, attributesQuery.data ?? [], index, entry.attribute, event.target.value)}
                    value={entry.value}
                  >
                    <option value="">Select value</option>
                    {findAttributeValues(attributesQuery.data ?? [], entry.attribute).map((value) => (
                      <option key={value.id} value={value.value}>
                        {value.value}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Default extra price">
                  <input className={fieldClass} disabled min="0" type="number" value={String(entry.extraPrice)} />
                </Field>
                <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-slate-200">
                  <input checked={entry.isActive} disabled={readOnly} onChange={(event) => updateVariantRow(setForm, index, 'isActive', event.target.checked)} type="checkbox" />
                  Active
                </label>
                {!readOnly ? (
                  <button className="rounded-full border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 md:col-span-4 md:justify-self-start" onClick={() => removeVariantRow(setForm, index)} type="button">
                    Remove Row
                  </button>
                ) : null}
              </div>
            ))}
            {form.variants.length === 0 ? <p className="text-sm text-slate-400">No variants configured.</p> : null}
            {(attributesQuery.data ?? []).length === 0 ? <p className="text-sm text-slate-400">Create attributes and values first from configuration.</p> : null}
          </div>
        </ChildTable>
      ) : null}

      {activeTab === 'taxes' ? (
        <ChildTable title="Taxes">
          <div className="grid gap-3">
            {(taxesQuery.data ?? []).map((taxRule) => (
              <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-sm text-slate-200" key={taxRule.id}>
                <input
                  checked={form.taxRuleIds.includes(taxRule.id)}
                  disabled={readOnly}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      taxRuleIds: event.target.checked
                        ? [...current.taxRuleIds, taxRule.id]
                        : current.taxRuleIds.filter((entry) => entry !== taxRule.id)
                    }))
                  }
                  type="checkbox"
                />
                <span>
                  <span className="block font-semibold text-white">{taxRule.name}</span>
                  <span className="text-xs text-slate-400">
                    {taxRule.computation === 'fixed' ? formatCurrency(taxRule.amount ?? taxRule.ratePercent) : `${taxRule.amount ?? taxRule.ratePercent}%`} | {taxRule.taxType}
                  </span>
                </span>
              </label>
            ))}
            {(taxesQuery.data ?? []).length === 0 ? <p className="text-sm text-slate-400">Create tax rules first from configuration.</p> : null}
          </div>
        </ChildTable>
      ) : null}
    </Surface>
  );
}

function FilterSelect({
  value,
  onChange,
  label,
  trueLabel = 'Yes',
  falseLabel = 'No',
}: {
  value: '' | 'true' | 'false';
  onChange: (value: '' | 'true' | 'false') => void;
  label: string;
  trueLabel?: string;
  falseLabel?: string;
}) {
  return (
    <select className={fieldClass} aria-label={label} onChange={(event) => onChange(event.target.value as '' | 'true' | 'false')} value={value}>
      <option value="">{label}</option>
      <option value="true">{trueLabel}</option>
      <option value="false">{falseLabel}</option>
    </select>
  );
}

function Field({ children, className, label }: { children: React.ReactNode; className?: string; label: string }) {
  return (
    <label className={`grid gap-2 text-sm text-slate-200 ${className ?? ''}`}>
      {label}
      {children}
    </label>
  );
}

function ChildTable({ title, onAdd, children }: { title: string; onAdd?: () => void; children: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-[28px] border border-white/10 bg-slate-950/35 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {onAdd ? (
          <button className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white" onClick={onAdd} type="button">
            Add Row
          </button>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function ToggleRow({
  disabled,
  items,
  onToggle
}: {
  disabled: boolean;
  items: Array<{ label: string; checked: boolean; key: string }>;
  onToggle: (key: string, checked: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 md:col-span-3">
      {items.map((entry) => (
        <label className="flex items-center gap-2 text-sm text-slate-200" key={entry.key}>
          <input checked={entry.checked} disabled={disabled} onChange={(event) => onToggle(entry.key, event.target.checked)} type="checkbox" />
          {entry.label}
        </label>
      ))}
    </div>
  );
}

function PaginationControls({
  currentPage,
  onPageChange,
  totalPages
}: {
  currentPage: number;
  onPageChange: (page: number) => void;
  totalPages: number;
}) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button className="rounded-full border border-white/10 bg-white/6 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)} type="button">
        Previous
      </button>
      <span className="px-2 text-sm text-slate-300">Page {currentPage} of {totalPages}</span>
      <button className="rounded-full border border-white/10 bg-white/6 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)} type="button">
        Next
      </button>
    </div>
  );
}

function validateProductForm(form: ProductFormState) {
  const issues: string[] = [];
  if (!form.name.trim()) issues.push('Product name is required');
  if (Number.isNaN(Number(form.baseSalesPrice)) || Number(form.baseSalesPrice) < 0) issues.push('Sales price must be a valid non-negative amount');
  if (Number.isNaN(Number(form.costPrice)) || Number(form.costPrice) < 0) issues.push('Cost price must be a valid non-negative amount');
  if (form.media.length < 1) issues.push('At least 1 media file is required');
  if (form.media.length > 7) issues.push('Maximum 7 media files allowed');

  const recurringKeys = new Set<string>();
  form.recurringPrices.forEach((entry) => {
    if (!entry.planName.trim()) issues.push('Recurring price plan name is required');
    if (Number(entry.minimumQuantity) < 1) issues.push('Minimum quantity must be at least 1');
    const key = `${entry.recurringPlanId ?? entry.planName.trim().toLowerCase()}|${entry.billingPeriod}`;
    if (recurringKeys.has(key)) issues.push('Duplicate recurring pricing row not allowed');
    recurringKeys.add(key);
  });

  const variantKeys = new Set<string>();
  form.variants.forEach((entry) => {
    if (!entry.attribute.trim()) issues.push('Variant attribute is required');
    if (!entry.value.trim()) issues.push('Variant value is required');
    if (Number(entry.extraPrice) < 0) issues.push('Extra price must be a valid amount');
    const key = `${entry.attribute.trim().toLowerCase()}|${entry.value.trim().toLowerCase()}`;
    if (variantKeys.has(key)) issues.push('Duplicate attribute-value combination not allowed');
    variantKeys.add(key);
  });

  return [...new Set(issues)];
}

function createVariantDraft(attributes: ProductAttributeConfig[], sortOrder: number): ProductVariantDetail {
  const attribute = attributes[0];
  const value = attribute?.values[0];

  return {
    attribute: attribute?.name ?? '',
    attributeId: attribute?.id ?? null,
    attributeValueId: value?.id ?? null,
    value: value?.value ?? '',
    extraPrice: Number(value?.extraPrice ?? 0),
    sortOrder,
    isActive: true
  };
}

function findAttributeValues(attributes: ProductAttributeConfig[], attributeName: string) {
  return attributes.find((attribute) => attribute.name === attributeName)?.values ?? [];
}

function updateVariantSelection(
  setForm: React.Dispatch<React.SetStateAction<ProductFormState>>,
  attributes: ProductAttributeConfig[],
  index: number,
  attributeName: string,
  valueName?: string
) {
  setForm((current) => ({
    ...current,
    variants: current.variants.map((entry, entryIndex) => {
      if (entryIndex !== index) {
        return entry;
      }

      const attribute = attributes.find((item) => item.name === attributeName);
      const selectedValue = attribute?.values.find((item) => item.value === (valueName ?? entry.value)) ?? attribute?.values[0];

      return {
        ...entry,
        attribute: attribute?.name ?? '',
        attributeId: attribute?.id ?? null,
        attributeValueId: selectedValue?.id ?? null,
        value: selectedValue?.value ?? '',
        extraPrice: Number(selectedValue?.extraPrice ?? 0)
      };
    })
  }));
}

function toggleRecurringPlan(
  setForm: React.Dispatch<React.SetStateAction<ProductFormState>>,
  plan: RecurringPlan,
  checked: boolean
) {
  setForm((current) => {
    if (checked) {
      if (current.recurringPrices.some((entry) => entry.recurringPlanId === plan.id)) {
        return current;
      }

      return {
        ...current,
        recurringPrices: [
          ...current.recurringPrices,
          {
            recurringPlanId: plan.id,
            planName: plan.name,
            price: Number(plan.price),
            intervalCount: plan.intervalCount,
            billingPeriod: plan.intervalUnit,
            minimumQuantity: plan.minimumQuantity,
            startDate: plan.startDate ? plan.startDate.slice(0, 10) : '',
            endDate: plan.endDate ? plan.endDate.slice(0, 10) : '',
            autoCloseEnabled: Boolean(plan.autoCloseEnabled),
            autoCloseAfterCount: plan.autoCloseAfterCount ?? null,
            autoCloseAfterUnit: plan.autoCloseAfterUnit ?? null,
            isClosable: plan.isClosable,
            isPausable: plan.isPausable,
            isRenewable: plan.isRenewable,
            isActive: plan.isActive ?? true
          }
        ]
      };
    }

    return {
      ...current,
      recurringPrices: current.recurringPrices.filter((entry) => entry.recurringPlanId !== plan.id)
    };
  });
}

function updateRecurringRow(
  setForm: React.Dispatch<React.SetStateAction<ProductFormState>>,
  index: number,
  key: string,
  value: unknown
) {
  setForm((current) => ({
    ...current,
    recurringPrices: current.recurringPrices.map((entry, entryIndex) =>
      entryIndex === index ? { ...entry, [key]: value } : entry
    )
  }));
}

function removeRecurringRow(setForm: React.Dispatch<React.SetStateAction<ProductFormState>>, index: number) {
  setForm((current) => ({
    ...current,
    recurringPrices: current.recurringPrices.filter((_, entryIndex) => entryIndex !== index)
  }));
}

function updateVariantRow(
  setForm: React.Dispatch<React.SetStateAction<ProductFormState>>,
  index: number,
  key: string,
  value: unknown
) {
  setForm((current) => ({
    ...current,
    variants: current.variants.map((entry, entryIndex) =>
      entryIndex === index ? { ...entry, [key]: value } : entry
    )
  }));
}

function removeVariantRow(setForm: React.Dispatch<React.SetStateAction<ProductFormState>>, index: number) {
  setForm((current) => ({
    ...current,
    variants: current.variants.filter((_, entryIndex) => entryIndex !== index).map((entry, sortOrder) => ({
      ...entry,
      sortOrder
    }))
  }));
}

function setPrimaryMedia(setForm: React.Dispatch<React.SetStateAction<ProductFormState>>, media: ProductMedia) {
  setForm((current) => ({
    ...current,
    media: current.media.map((entry) => ({
      ...entry,
      isPrimary: entry.url === media.url
    }))
  }));
}

function moveMedia(setForm: React.Dispatch<React.SetStateAction<ProductFormState>>, index: number, direction: -1 | 1) {
  setForm((current) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= current.media.length) {
      return current;
    }

    const media = [...current.media];
    const [selected] = media.splice(index, 1);
    media.splice(nextIndex, 0, selected);

    return {
      ...current,
      media: media.map((entry, entryIndex) => ({
        ...entry,
        sortOrder: entryIndex
      }))
    };
  });
}

function removeMedia(setForm: React.Dispatch<React.SetStateAction<ProductFormState>>, index: number) {
  setForm((current) => {
    const media = current.media.filter((_, entryIndex) => entryIndex !== index);
    const hasPrimary = media.some((entry) => entry.isPrimary);
    return {
      ...current,
      media: media.map((entry, entryIndex) => ({
        ...entry,
        isPrimary: hasPrimary ? entry.isPrimary : entryIndex === 0,
        sortOrder: entryIndex
      }))
    };
  });
}

async function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
