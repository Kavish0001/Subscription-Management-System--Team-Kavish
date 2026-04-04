import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Surface } from '../../components/layout';
import { apiRequest, formatCurrency, formatDate, type Discount, type PaginatedResponse, type Product, type RecurringPlan, type Subscription } from '../../lib/api';
import { ApiError } from '../../lib/api';
import { useSession } from '../../lib/session';

type ResourceKind = 'subscriptions' | 'products' | 'recurring-plans' | 'discounts';
const ADMIN_LIST_PAGE_SIZE = 12;

export function ResourceListPage({
  title,
  description,
  resource
}: {
  title: string;
  description: string;
  resource: ResourceKind;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { token } = useSession();
  const [page, setPage] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productUploadKey, setProductUploadKey] = useState(0);
  const [productForm, setProductForm] = useState({
    name: '',
    slug: '',
    description: '',
    imageUrls: [] as string[],
    selectedPlanIds: [] as string[],
    defaultPlanId: '',
    planOverrides: {} as Record<string, string>,
    baseSalesPrice: '999',
    costPrice: '249'
  });
  const [planForm, setPlanForm] = useState({
    name: '',
    intervalCount: '1',
    intervalUnit: 'month',
    price: '999',
    minimumQuantity: '1'
  });
  const [discountForm, setDiscountForm] = useState({
    name: '',
    code: '',
    discountType: 'percentage',
    value: '10',
    minimumPurchase: '500',
    scopeType: 'subscriptions'
  });

  const productsQuery = useQuery({
    queryKey: ['admin-products', page],
    queryFn: () =>
      apiRequest<PaginatedResponse<Product>>(`/products?page=${page}&pageSize=${ADMIN_LIST_PAGE_SIZE}`, { token }),
    enabled: resource === 'products'
  });

  const plansQuery = useQuery({
    queryKey: ['admin-plans'],
    queryFn: () => apiRequest<RecurringPlan[]>('/recurring-plans', { token }),
    enabled: resource === 'recurring-plans' || resource === 'products'
  });

  const discountsQuery = useQuery({
    queryKey: ['admin-discounts'],
    queryFn: () => apiRequest<Discount[]>('/discounts', { token }),
    enabled: resource === 'discounts'
  });

  const subscriptionsQuery = useQuery({
    queryKey: ['admin-subscriptions', page],
    queryFn: () =>
      apiRequest<PaginatedResponse<Subscription>>(`/subscriptions?page=${page}&pageSize=${ADMIN_LIST_PAGE_SIZE}`, { token }),
    enabled: resource === 'subscriptions'
  });

  const allPlanRows = plansQuery.data ?? [];
  const allDiscountRows = discountsQuery.data ?? [];
  const rows = useMemo(() => {
    if (resource === 'products') {
      return productsQuery.data?.items ?? [];
    }

    if (resource === 'recurring-plans') {
      const start = (page - 1) * ADMIN_LIST_PAGE_SIZE;
      return allPlanRows.slice(start, start + ADMIN_LIST_PAGE_SIZE);
    }

    if (resource === 'discounts') {
      const start = (page - 1) * ADMIN_LIST_PAGE_SIZE;
      return allDiscountRows.slice(start, start + ADMIN_LIST_PAGE_SIZE);
    }

    return subscriptionsQuery.data?.items ?? [];
  }, [allDiscountRows, allPlanRows, page, productsQuery.data?.items, resource, subscriptionsQuery.data?.items]);
  const totalRows =
    resource === 'products'
      ? (productsQuery.data?.total ?? 0)
      : resource === 'subscriptions'
        ? (subscriptionsQuery.data?.total ?? 0)
        : resource === 'recurring-plans'
          ? allPlanRows.length
          : allDiscountRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / ADMIN_LIST_PAGE_SIZE));

  const createMutation = useMutation({
    mutationFn: async () => {
      if (resource === 'products') {
        if (!productForm.selectedPlanIds.length) {
          throw new ApiError('Select at least one recurring plan for the product.', 400);
        }

        const defaultPlanId = productForm.defaultPlanId || productForm.selectedPlanIds[0];

        return apiRequest('/products', {
          token,
          method: 'POST',
          body: JSON.stringify({
            name: productForm.name,
            slug: productForm.slug || slugify(productForm.name),
            description: productForm.description,
            imageUrls: productForm.imageUrls.length ? productForm.imageUrls : undefined,
            productType: 'service',
            baseSalesPrice: Number(productForm.baseSalesPrice),
            costPrice: Number(productForm.costPrice),
            isSubscriptionEnabled: true,
            planPricing: productForm.selectedPlanIds.map((recurringPlanId) => ({
              recurringPlanId,
              overridePrice: productForm.planOverrides[recurringPlanId]
                ? Number(productForm.planOverrides[recurringPlanId])
                : undefined,
              isDefaultPlan: recurringPlanId === defaultPlanId
            }))
          })
        });
      }

      if (resource === 'recurring-plans') {
        return apiRequest('/recurring-plans', {
          token,
          method: 'POST',
          body: JSON.stringify({
            name: planForm.name,
            intervalCount: Number(planForm.intervalCount),
            intervalUnit: planForm.intervalUnit,
            price: Number(planForm.price),
            minimumQuantity: Number(planForm.minimumQuantity),
            autoCloseEnabled: false,
            isClosable: true,
            isPausable: true,
            isRenewable: true
          })
        });
      }

      return apiRequest('/discounts', {
        token,
        method: 'POST',
        body: JSON.stringify({
          name: discountForm.name,
          code: discountForm.code || undefined,
          discountType: discountForm.discountType,
          value: Number(discountForm.value),
          minimumPurchase: Number(discountForm.minimumPurchase),
          scopeType: discountForm.scopeType,
          limitUsageEnabled: false
        })
      });
    },
    onSuccess: async () => {
      setError(null);
      setIsCreating(false);
      if (resource === 'products') {
        setProductForm({
          name: '',
          slug: '',
          description: '',
          imageUrls: [],
          selectedPlanIds: [],
          defaultPlanId: '',
          planOverrides: {},
          baseSalesPrice: '999',
          costPrice: '249'
        });
        setProductUploadKey((value) => value + 1);
      }
      await queryClient.invalidateQueries({
        queryKey:
          resource === 'products'
            ? ['admin-products']
            : resource === 'recurring-plans'
              ? ['admin-plans']
              : ['admin-discounts']
      });
    },
    onError: (mutationError) => {
      setError(mutationError instanceof ApiError ? mutationError.message : 'Unable to save record');
    }
  });

  const workflowMutation = useMutation({
    mutationFn: async (input: { action: 'send-quotation' | 'confirm' | 'invoice' | 'renew' | 'upsell' | 'cancel' | 'close' | 'reopen'; subscription: Subscription }) => {
      if (input.action === 'invoice') {
        return apiRequest('/invoices', {
          token,
          method: 'POST',
          body: JSON.stringify({
            subscriptionOrderId: input.subscription.id,
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            sourceLabel: 'Backoffice'
          })
        });
      }

      if (input.action === 'upsell') {
        return apiRequest(`/subscriptions/${input.subscription.id}/upsell`, {
          token,
          method: 'POST',
          body: JSON.stringify({})
        });
      }

      return apiRequest(`/subscriptions/${input.subscription.id}/${input.action}`, {
        token,
        method: 'POST'
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-dashboard-subscriptions'] })
      ]);
    },
    onError: (mutationError) => {
      setError(mutationError instanceof ApiError ? mutationError.message : 'Workflow action failed');
    }
  });

  const deleteSubscriptionMutation = useMutation({
    mutationFn: async (subscriptionId: string) =>
      apiRequest(`/subscriptions/${subscriptionId}`, {
        token,
        method: 'DELETE'
      }),
    onSuccess: async () => {
      setError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-dashboard-subscriptions'] })
      ]);
    },
    onError: (mutationError) => {
      setError(mutationError instanceof ApiError ? mutationError.message : 'Unable to delete subscription');
    }
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) =>
      apiRequest(`/products/${productId}`, {
        token,
        method: 'DELETE'
      }),
    onSuccess: async () => {
      setError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
        queryClient.invalidateQueries({ queryKey: ['portal-products'] }),
        queryClient.invalidateQueries({ queryKey: ['subscription-form-products'] }),
        queryClient.invalidateQueries({ queryKey: ['product-detail'] })
      ]);
    },
    onError: (mutationError) => {
      setError(mutationError instanceof ApiError ? mutationError.message : 'Unable to delete product');
    }
  });

  const handleProductPhotosSelected = async (files: FileList | null) => {
    if (!files?.length) {
      setProductForm((value) => ({ ...value, imageUrls: [] }));
      return;
    }

    const selectedFiles = Array.from(files);

    if (selectedFiles.length > 10) {
      setError('You can upload up to 10 product photos.');
      return;
    }

    if (selectedFiles.some((file) => !file.type.startsWith('image/'))) {
      setError('Only image files can be uploaded for products.');
      return;
    }

    try {
      const imageUrls = await Promise.all(selectedFiles.map(readFileAsDataUrl));
      setError(null);
      setProductForm((value) => ({ ...value, imageUrls }));
    } catch {
      setError('Unable to read the selected photos. Try different image files.');
    }
  };

  const removeProductPhoto = (index: number) => {
    setProductForm((value) => ({
      ...value,
      imageUrls: value.imageUrls.filter((_, imageIndex) => imageIndex !== index)
    }));
  };

  const toggleProductPlan = (plan: RecurringPlan, checked: boolean) => {
    setProductForm((value) => {
      if (checked) {
        const selectedPlanIds = value.selectedPlanIds.includes(plan.id)
          ? value.selectedPlanIds
          : [...value.selectedPlanIds, plan.id];

        return {
          ...value,
          selectedPlanIds,
          defaultPlanId: value.defaultPlanId || plan.id,
          planOverrides: value.planOverrides[plan.id]
            ? value.planOverrides
            : { ...value.planOverrides, [plan.id]: String(plan.price) }
        };
      }

      const selectedPlanIds = value.selectedPlanIds.filter((entry) => entry !== plan.id);
      const { [plan.id]: _removedOverride, ...planOverrides } = value.planOverrides;

      return {
        ...value,
        selectedPlanIds,
        defaultPlanId:
          value.defaultPlanId === plan.id ? (selectedPlanIds[0] ?? '') : value.defaultPlanId,
        planOverrides
      };
    });
  };

  return (
    <Surface
      title={title}
      actions={
        resource === 'subscriptions' ? (
          <Link
            className="rounded-full bg-gradient-to-r from-amber-300 to-rose-500 px-4 py-2 text-sm font-semibold text-slate-950"
            to="/admin/subscriptions/new"
          >
            New
          </Link>
        ) : (
          <button
            className="rounded-full bg-gradient-to-r from-amber-300 to-rose-500 px-4 py-2 text-sm font-semibold text-slate-950"
            onClick={() => setIsCreating((value) => !value)}
            type="button"
          >
            {isCreating ? 'Close' : 'New'}
          </button>
        )
      }
    >
      <p className="mb-4 text-slate-300">{description}</p>
      {error ? <p className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
        <p>
          Showing {rows.length ? (page - 1) * ADMIN_LIST_PAGE_SIZE + 1 : 0}-{Math.min(page * ADMIN_LIST_PAGE_SIZE, totalRows)} of {totalRows} records
        </p>
        <PaginationControls currentPage={page} onPageChange={setPage} totalPages={totalPages} />
      </div>
      {isCreating && resource !== 'subscriptions' ? (
        <div className="mb-6 rounded-[28px] border border-white/10 bg-slate-950/35 p-5">
          {resource === 'products' ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Product name">
                <input className={fieldClass} onChange={(event) => setProductForm((value) => ({ ...value, name: event.target.value }))} value={productForm.name} />
              </Field>
              <Field label="Slug">
                <input className={fieldClass} onChange={(event) => setProductForm((value) => ({ ...value, slug: event.target.value }))} value={productForm.slug} />
              </Field>
              <Field className="md:col-span-2" label="Product photos">
                <div className="grid gap-3">
                  <input
                    accept="image/*"
                    className="rounded-2xl border border-dashed border-white/15 bg-slate-950/40 px-4 py-3 text-sm file:mr-4 file:rounded-full file:border-0 file:bg-gradient-to-r file:from-emerald-300 file:to-sky-400 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-950"
                    key={productUploadKey}
                    multiple
                    onChange={(event) => {
                      void handleProductPhotosSelected(event.target.files);
                    }}
                    type="file"
                  />
                  <p className="text-xs text-slate-400">Upload up to 10 photos. The first photo becomes the cover image, and the portal uses all uploaded photos as a slideshow.</p>
                  {productForm.imageUrls.length ? (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {productForm.imageUrls.map((imageUrl, index) => (
                        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/30 p-2" key={imageUrl}>
                          <img
                            alt={`${productForm.name || 'Product'} preview ${index + 1}`}
                            className="h-32 w-full rounded-xl object-cover"
                            src={imageUrl}
                          />
                          <div className="absolute inset-x-3 top-3 flex items-center justify-between">
                            {index === 0 ? (
                              <span className="rounded-full bg-emerald-300 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-950">
                                Cover
                              </span>
                            ) : (
                              <span />
                            )}
                            <button
                              className="rounded-full bg-slate-950/75 px-2 py-1 text-[10px] font-semibold text-white"
                              onClick={() => removeProductPhoto(index)}
                              type="button"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </Field>
              <Field label="Description">
                <textarea className={fieldClass} onChange={(event) => setProductForm((value) => ({ ...value, description: event.target.value }))} rows={4} value={productForm.description} />
              </Field>
              <Field label="Sales price">
                <input className={fieldClass} onChange={(event) => setProductForm((value) => ({ ...value, baseSalesPrice: event.target.value }))} type="number" value={productForm.baseSalesPrice} />
              </Field>
              <Field label="Cost price">
                <input className={fieldClass} onChange={(event) => setProductForm((value) => ({ ...value, costPrice: event.target.value }))} type="number" value={productForm.costPrice} />
              </Field>
              <Field className="md:col-span-2" label="Recurring plans">
                {plansQuery.data?.length ? (
                  <div className="grid gap-3">
                    <p className="text-xs text-slate-400">Choose one or more plans. The default plan is preselected in the portal dropdown.</p>
                    <div className="grid gap-3 lg:grid-cols-2">
                      {plansQuery.data.map((plan) => {
                        const isSelected = productForm.selectedPlanIds.includes(plan.id);

                        return (
                          <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4" key={plan.id}>
                            <div className="flex items-start justify-between gap-3">
                              <label className="flex items-start gap-3">
                                <input
                                  checked={isSelected}
                                  className="mt-1 h-4 w-4"
                                  onChange={(event) => toggleProductPlan(plan, event.target.checked)}
                                  type="checkbox"
                                />
                                <span>
                                  <span className="block font-semibold text-white">{plan.name}</span>
                                  <span className="text-xs text-slate-400">
                                    {plan.intervalCount} {plan.intervalUnit} • {formatCurrency(plan.price)}
                                  </span>
                                </span>
                              </label>
                              {isSelected ? (
                                <label className="flex items-center gap-2 text-xs text-slate-300">
                                  <input
                                    checked={productForm.defaultPlanId === plan.id}
                                    className="h-4 w-4"
                                    name="defaultPlanId"
                                    onChange={() => setProductForm((value) => ({ ...value, defaultPlanId: plan.id }))}
                                    type="radio"
                                  />
                                  Default
                                </label>
                              ) : null}
                            </div>
                            {isSelected ? (
                              <div className="mt-3">
                                <label className="grid gap-2 text-xs text-slate-300">
                                  Override price
                                  <input
                                    className={fieldClass}
                                    onChange={(event) =>
                                      setProductForm((value) => ({
                                        ...value,
                                        planOverrides: {
                                          ...value.planOverrides,
                                          [plan.id]: event.target.value
                                        }
                                      }))
                                    }
                                    type="number"
                                    value={productForm.planOverrides[plan.id] ?? ''}
                                  />
                                </label>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/30 px-4 py-4 text-sm text-slate-400">
                    Create recurring plans first, then attach them to products here.
                  </div>
                )}
              </Field>
            </div>
          ) : null}
          {resource === 'recurring-plans' ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Recurring name">
                <input className={fieldClass} onChange={(event) => setPlanForm((value) => ({ ...value, name: event.target.value }))} value={planForm.name} />
              </Field>
              <Field label="Price">
                <input className={fieldClass} onChange={(event) => setPlanForm((value) => ({ ...value, price: event.target.value }))} type="number" value={planForm.price} />
              </Field>
              <Field label="Billing count">
                <input className={fieldClass} onChange={(event) => setPlanForm((value) => ({ ...value, intervalCount: event.target.value }))} type="number" value={planForm.intervalCount} />
              </Field>
              <Field label="Billing period">
                <select className={fieldClass} onChange={(event) => setPlanForm((value) => ({ ...value, intervalUnit: event.target.value }))} value={planForm.intervalUnit}>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                </select>
              </Field>
            </div>
          ) : null}
          {resource === 'discounts' ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Discount name">
                <input className={fieldClass} onChange={(event) => setDiscountForm((value) => ({ ...value, name: event.target.value }))} value={discountForm.name} />
              </Field>
              <Field label="Code">
                <input className={fieldClass} onChange={(event) => setDiscountForm((value) => ({ ...value, code: event.target.value }))} value={discountForm.code} />
              </Field>
              <Field label="Mode">
                <select className={fieldClass} onChange={(event) => setDiscountForm((value) => ({ ...value, discountType: event.target.value }))} value={discountForm.discountType}>
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed</option>
                </select>
              </Field>
              <Field label="Value">
                <input className={fieldClass} onChange={(event) => setDiscountForm((value) => ({ ...value, value: event.target.value }))} type="number" value={discountForm.value} />
              </Field>
            </div>
          ) : null}
          <div className="mt-4">
            <button className="rounded-full bg-gradient-to-r from-emerald-300 to-sky-400 px-4 py-2 text-sm font-semibold text-slate-950" onClick={() => createMutation.mutate()} type="button">
              Save record
            </button>
          </div>
        </div>
      ) : null}
      <div className="overflow-x-auto overflow-y-hidden rounded-3xl border border-white/10">
        <table className="min-w-[720px] w-full text-left text-sm">
          <thead className="bg-white/6 text-slate-300">
            {resource === 'subscriptions' ? (
              <tr>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Next Invoice</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            ) : (
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            )}
          </thead>
          <tbody>
            {resource === 'products'
              ? (rows as Product[]).map((product) => (
                  <tr className="border-t border-white/10 text-slate-100" key={product.id}>
                    <td className="px-4 py-3">{product.name}</td>
                    <td className="px-4 py-3">{product.isSubscriptionEnabled ? 'Subscription' : 'Standard'}</td>
                    <td className="px-4 py-3">{formatCurrency(product.baseSalesPrice)}</td>
                    <td className="px-4 py-3 text-slate-300">
                      <div className="flex items-center justify-between gap-3">
                        <span>{product.slug}</span>
                        <button
                          className="rounded-full border border-rose-400/25 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-200"
                          onClick={() => {
                            if (window.confirm(`Delete product ${product.name}?`)) {
                              deleteProductMutation.mutate(product.id);
                            }
                          }}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              : null}
            {resource === 'recurring-plans'
              ? (rows as RecurringPlan[]).map((plan) => (
                  <tr className="border-t border-white/10 text-slate-100" key={plan.id}>
                    <td className="px-4 py-3">{plan.name}</td>
                    <td className="px-4 py-3">Active</td>
                    <td className="px-4 py-3">{formatCurrency(plan.price)}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {plan.intervalCount} {plan.intervalUnit}
                    </td>
                  </tr>
                ))
              : null}
            {resource === 'discounts'
              ? (rows as Discount[]).map((discount) => (
                  <tr className="border-t border-white/10 text-slate-100" key={discount.id}>
                    <td className="px-4 py-3">{discount.name}</td>
                    <td className="px-4 py-3">{discount.discountType}</td>
                    <td className="px-4 py-3">{formatCurrency(discount.minimumPurchase ?? 0)}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {discount.discountType === 'percentage' ? `${discount.value}%` : formatCurrency(discount.value)}
                    </td>
                  </tr>
                ))
              : null}
            {resource === 'subscriptions'
              ? (rows as Subscription[]).map((subscription) => {
                  const openInvoice = subscription.invoices.find((invoice) =>
                    ['draft', 'confirmed'].includes(invoice.status)
                  );
                  const latestInvoice = subscription.invoices[0];
                  const invoiceDue =
                    Boolean(subscription.nextInvoiceDate) &&
                    new Date(subscription.nextInvoiceDate as string).getTime() <= Date.now();

                  return (
                    <tr className="border-t border-white/10 text-slate-100" key={subscription.id}>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-semibold">{subscription.subscriptionNumber}</p>
                          <p className="text-xs text-slate-400">{formatDate(subscription.createdAt)}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">{subscription.customerContact.name}</td>
                      <td className="px-4 py-3">{subscription.status}</td>
                      <td className="px-4 py-3">{formatDate(subscription.nextInvoiceDate)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {['draft', 'quotation'].includes(subscription.status) ? (
                            <button className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white" onClick={() => workflowMutation.mutate({ action: 'send-quotation', subscription })} type="button">
                              Send
                            </button>
                          ) : null}
                          {['quotation', 'quotation_sent'].includes(subscription.status) ? (
                            <button className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-white" onClick={() => navigate(`/preview/subscriptions/${subscription.id}`)} type="button">
                              Preview
                            </button>
                          ) : null}
                          {['draft', 'quotation', 'quotation_sent'].includes(subscription.status) ? (
                            <button className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white" onClick={() => workflowMutation.mutate({ action: 'confirm', subscription })} type="button">
                              Confirm
                            </button>
                          ) : null}
                          {!openInvoice && ['confirmed', 'in_progress'].includes(subscription.status) && invoiceDue ? (
                            <button className="rounded-full bg-gradient-to-r from-amber-300 to-rose-500 px-3 py-1 text-xs font-semibold text-slate-950" onClick={() => workflowMutation.mutate({ action: 'invoice', subscription })} type="button">
                              Create Invoice
                            </button>
                          ) : openInvoice ? (
                            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                              {latestInvoice?.status}
                            </span>
                          ) : null}
                          {['confirmed', 'in_progress', 'closed'].includes(subscription.status) ? (
                            <button className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-white" onClick={() => workflowMutation.mutate({ action: 'renew', subscription })} type="button">
                              Renew
                            </button>
                          ) : null}
                          {['confirmed', 'in_progress', 'closed'].includes(subscription.status) ? (
                            <button className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-white" onClick={() => workflowMutation.mutate({ action: 'upsell', subscription })} type="button">
                              Upsell
                            </button>
                          ) : null}
                          {['confirmed', 'in_progress'].includes(subscription.status) ? (
                            <button className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-white" onClick={() => workflowMutation.mutate({ action: 'close', subscription })} type="button">
                              Close
                            </button>
                          ) : null}
                          {subscription.status === 'closed' ? (
                            <button className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-white" onClick={() => workflowMutation.mutate({ action: 'reopen', subscription })} type="button">
                              Reopen
                            </button>
                          ) : null}
                          {['draft', 'quotation', 'quotation_sent', 'confirmed', 'in_progress'].includes(subscription.status) ? (
                            <button className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-white" onClick={() => workflowMutation.mutate({ action: 'cancel', subscription })} type="button">
                              Cancel
                            </button>
                          ) : null}
                          <button
                            className="rounded-full border border-rose-400/25 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-200"
                            onClick={() => {
                              if (window.confirm(`Delete subscription ${subscription.subscriptionNumber}? Only draft or quotation records without invoices can be deleted.`)) {
                                deleteSubscriptionMutation.mutate(subscription.id);
                              }
                            }}
                            type="button"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              : null}
            {rows.length === 0 ? (
              <tr className="border-t border-white/10 text-slate-400">
                <td className="px-4 py-6" colSpan={resource === 'subscriptions' ? 5 : 4}>
                  No records yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Surface>
  );
}

function PaginationControls({
  currentPage,
  onPageChange,
  totalPages
}: Readonly<{
  currentPage: number;
  onPageChange: (page: number) => void;
  totalPages: number;
}>) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        className="rounded-full border border-white/10 bg-white/6 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        type="button"
      >
        Previous
      </button>
      <span className="min-w-[104px] text-center text-sm text-slate-300">
        Page {currentPage} / {totalPages}
      </span>
      <button
        className="rounded-full border border-white/10 bg-white/6 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        type="button"
      >
        Next
      </button>
    </div>
  );
}

function Field({ children, className = '', label }: { children: React.ReactNode; className?: string; label: string }) {
  return (
    <label className={`grid gap-2 text-sm text-slate-200 ${className}`}>
      {label}
      {children}
    </label>
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('Unable to read file'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read file'));
    reader.readAsDataURL(file);
  });
}

const fieldClass = 'rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3';
