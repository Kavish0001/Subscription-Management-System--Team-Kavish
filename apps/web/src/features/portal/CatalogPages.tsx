import { useQuery } from '@tanstack/react-query';
import { useDeferredValue, useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  CalendarRepeatIcon,
  CreditCardIcon,
  CubeIcon,
  SearchIcon
} from '../../components/icons';
import { Surface } from '../../components/layout';
import {
  apiRequest,
  formatCurrency,
  planIntervalLabel,
  type PaginatedResponse,
  type Product,
  type ProductCategory,
  type ProductVariantDetail,
  type RecurringPlan
} from '../../lib/api';
import { useCartStore } from '../../lib/cart';
import { useSession } from '../../lib/session';

const SHOP_PAGE_SIZE = 12;
const fieldClass =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100';

type PriceRangeOption = {
  key: 'all' | 'under-1000' | '1000-3000' | '3000-plus';
  label: string;
  minPrice?: number;
  maxPrice?: number;
};

const priceRanges: readonly PriceRangeOption[] = [
  { key: 'all', label: 'All prices' },
  { key: 'under-1000', label: 'Under Rs.1,000', minPrice: undefined, maxPrice: 999 },
  { key: '1000-3000', label: 'Rs.1,000 - Rs.3,000', minPrice: 1000, maxPrice: 3000 },
  { key: '3000-plus', label: 'Rs.3,000+', minPrice: 3000, maxPrice: undefined }
] as const;

type PriceRangeKey = PriceRangeOption['key'];

export function ShopPage() {
  const { isAuthenticated, token } = useSession();
  const addItem = useCartStore((state) => state.addItem);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const [sortBy, setSortBy] = useState<'newest' | 'price' | 'name'>('newest');
  const [page, setPage] = useState(1);
  const [selectedPlans, setSelectedPlans] = useState<Record<string, string>>({});
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [categoryId, setCategoryId] = useState<string>('all');
  const [productType, setProductType] = useState<'all' | 'goods' | 'service'>('all');
  const [priceRangeKey, setPriceRangeKey] = useState<PriceRangeKey>('all');

  const activePriceRange = priceRanges.find((entry) => entry.key === priceRangeKey) ?? priceRanges[0];

  const categoriesQuery = useQuery({
    queryKey: ['portal-categories'],
    queryFn: () => apiRequest<ProductCategory[]>('/categories', { token }),
    enabled: isAuthenticated
  });

  const productsQuery = useQuery({
    queryKey: ['portal-products', page, deferredSearch, sortBy, categoryId, productType, priceRangeKey],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(SHOP_PAGE_SIZE),
        sortBy
      });

      if (deferredSearch) {
        params.set('search', deferredSearch);
      }

      if (categoryId !== 'all') {
        params.set('categoryId', categoryId);
      }

      if (productType !== 'all') {
        params.set('productType', productType);
      }

      if (activePriceRange.minPrice !== undefined) {
        params.set('minPrice', String(activePriceRange.minPrice));
      }

      if (activePriceRange.maxPrice !== undefined) {
        params.set('maxPrice', String(activePriceRange.maxPrice));
      }

      return apiRequest<PaginatedResponse<Product>>(`/products?${params.toString()}`, { token });
    },
    enabled: isAuthenticated
  });

  const plansQuery = useQuery({
    queryKey: ['portal-plans'],
    queryFn: () => apiRequest<RecurringPlan[]>('/recurring-plans', { token }),
    enabled: isAuthenticated
  });

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, sortBy, categoryId, productType, priceRangeKey]);

  if (!isAuthenticated) {
    return <AuthRequiredMessage title="Shop" />;
  }

  const categories = categoriesQuery.data ?? [];
  const products = productsQuery.data?.items ?? [];
  const plans = plansQuery.data ?? [];
  const totalProducts = productsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalProducts / SHOP_PAGE_SIZE));

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-[34px] border border-emerald-900/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(240,253,250,0.88))] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700">Shop</p>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.05em] text-slate-950 sm:text-4xl">
              Browse subscription-ready products
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Price and billing update according to the selected recurring plan on each product card.
            </p>
          </div>
          <div className="rounded-[24px] border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800">
            {productsQuery.isPending ? 'Loading catalog...' : `${totalProducts} product${totalProducts === 1 ? '' : 's'} available`}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="h-fit rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="grid gap-5">
            <FilterGroup title="Category">
              <FilterButton active={categoryId === 'all'} onClick={() => setCategoryId('all')}>
                All Products
              </FilterButton>
              {categories.map((category) => (
                <FilterButton
                  active={categoryId === category.id}
                  key={category.id}
                  onClick={() => setCategoryId(category.id)}
                >
                  {category.name}
                </FilterButton>
              ))}
            </FilterGroup>

            <FilterGroup title="Product Type">
              <FilterButton active={productType === 'all'} onClick={() => setProductType('all')}>
                All Types
              </FilterButton>
              <FilterButton active={productType === 'service'} onClick={() => setProductType('service')}>
                Services
              </FilterButton>
              <FilterButton active={productType === 'goods'} onClick={() => setProductType('goods')}>
                Goods
              </FilterButton>
            </FilterGroup>

            <FilterGroup title="Price Range">
              {priceRanges.map((range) => (
                <FilterButton
                  active={priceRangeKey === range.key}
                  key={range.key}
                  onClick={() => setPriceRangeKey(range.key)}
                >
                  {range.label}
                </FilterButton>
              ))}
            </FilterGroup>
          </div>
        </aside>

        <div className="grid gap-5">
          <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
              <label className="relative block">
                <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className={`${fieldClass} pl-11`}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search products"
                  value={search}
                />
              </label>
              <select
                className={fieldClass}
                onChange={(event) => setSortBy(event.target.value as 'newest' | 'price' | 'name')}
                value={sortBy}
              >
                <option value="newest">Newest first</option>
                <option value="price">Sort by price</option>
                <option value="name">Sort by name</option>
              </select>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
              <p>
                Showing {products.length ? (page - 1) * SHOP_PAGE_SIZE + 1 : 0}-
                {Math.min(page * SHOP_PAGE_SIZE, totalProducts)} of {totalProducts}
              </p>
              <PaginationControls currentPage={page} onPageChange={setPage} totalPages={totalPages} />
            </div>
          </div>

          {productsQuery.isPending ? (
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div className="h-[380px] animate-pulse rounded-[30px] border border-slate-200 bg-white" key={index} />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {products.map((product) => {
                const selectedPlanId = selectedPlans[product.id] ?? defaultPlanId(product);
                const variants = productVariants(product);
                const selectedVariantId = selectedVariants[product.id] ?? variants[0]?.id ?? '';
                const selectedVariant = variants.find((entry) => entry.id === selectedVariantId);
                const plan = plans.find((entry) => entry.id === selectedPlanId) ?? null;
                const price = productPrice(product, selectedPlanId, selectedVariantId);
                const images = productImages(product);
                const hasPlanPricing = product.planPricing.length > 0;

                return (
                  <article
                    className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)]"
                    key={product.id}
                  >
                    {images.length ? (
                      <ProductSlideshow
                        className="h-52 w-full border-b border-slate-200"
                        images={images}
                        name={product.name}
                      />
                    ) : (
                      <div className="grid h-52 place-items-center border-b border-slate-200 bg-slate-100 text-slate-400">
                        <CubeIcon className="h-10 w-10" />
                      </div>
                    )}

                    <div className="p-5">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        <span className="rounded-full bg-slate-100 px-3 py-1">
                          {product.category?.name ?? 'Catalog'}
                        </span>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                          {formatProductType(product.productType)}
                        </span>
                      </div>

                      <h2 className="mt-4 text-2xl font-bold tracking-[-0.04em] text-slate-950">
                        {product.name}
                      </h2>
                      <p className="mt-2 min-h-[72px] text-sm leading-6 text-slate-600">
                        {product.description ?? 'Subscription-ready product with recurring billing support.'}
                      </p>

                      <div className="mt-5 rounded-[24px] border border-emerald-100 bg-emerald-50/70 p-4">
                        {hasPlanPricing ? (
                          <>
                            <select
                              className={fieldClass}
                              onChange={(event) =>
                                setSelectedPlans((value) => ({ ...value, [product.id]: event.target.value }))
                              }
                              value={selectedPlanId}
                            >
                              {product.planPricing.map((pricing) => {
                                const linkedPlan = plans.find((entry) => entry.id === pricing.recurringPlanId);
                                const linkedPrice = pricing.overridePrice ?? product.baseSalesPrice;

                                return (
                                  <option key={pricing.id} value={pricing.recurringPlanId}>
                                    {linkedPlan?.name ?? 'Plan'} - {formatCurrency(linkedPrice)}
                                  </option>
                                );
                              })}
                            </select>
                            <div className="mt-4 flex items-end justify-between gap-4">
                              <div>
                                <strong className="block text-3xl font-black tracking-[-0.05em] text-slate-950">
                                  {formatCurrency(price)}
                                </strong>
                                <p className="mt-2 inline-flex items-center gap-2 text-sm text-emerald-800">
                                  <CalendarRepeatIcon className="h-4 w-4" />
                                  {plan ? `Billed every ${planIntervalLabel(plan)}` : 'Recurring billing'}
                                </p>
                              </div>
                            </div>
                            {variants.length ? (
                              <select
                                className={`${fieldClass} mt-4`}
                                onChange={(event) =>
                                  setSelectedVariants((value) => ({ ...value, [product.id]: event.target.value }))
                                }
                                value={selectedVariantId}
                              >
                                {variants.map((variant) => (
                                  <option key={variant.id} value={variant.id}>
                                    {variant.attribute}: {variant.value}
                                    {Number(variant.extraPrice) > 0 ? ` (+${formatCurrency(variant.extraPrice)})` : ''}
                                  </option>
                                ))}
                              </select>
                            ) : null}
                          </>
                        ) : (
                          <div className="rounded-[20px] border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500">
                            Billing plan not assigned yet.
                          </div>
                        )}
                      </div>

                      <div className="mt-5 flex gap-3">
                        <Link
                          className="inline-flex flex-1 items-center justify-center rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                          to={`/products/${product.slug}`}
                        >
                          View
                        </Link>
                        <button
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                          disabled={!hasPlanPricing}
                          onClick={() =>
                            addItem({
                              productId: product.id,
                              slug: product.slug,
                              name: product.name,
                              imageUrl: images[0] ?? product.imageUrl,
                              recurringPlanId: selectedPlanId || null,
                              recurringPlanName: plan?.name ?? 'Plan',
                              variantId: selectedVariantId || null,
                              variantName: selectedVariant ? `${selectedVariant.attribute}: ${selectedVariant.value}` : null,
                              unitPrice: price,
                              quantity: 1
                            })
                          }
                          type="button"
                        >
                          <CreditCardIcon className="h-4 w-4" />
                          Add to cart
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {!productsQuery.isPending && products.length === 0 ? (
            <div className="rounded-[30px] border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
              No products matched the current filters.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export function ProductPage() {
  const { slug } = useParams();
  const { isAuthenticated, token } = useSession();
  const addItem = useCartStore((state) => state.addItem);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');

  const productsQuery = useQuery({
    queryKey: ['product-detail', slug],
    queryFn: () => apiRequest<Product>(`/products/${slug}`, { token }),
    enabled: isAuthenticated && Boolean(slug)
  });

  const plansQuery = useQuery({
    queryKey: ['product-detail-plans'],
    queryFn: () => apiRequest<RecurringPlan[]>('/recurring-plans', { token }),
    enabled: isAuthenticated
  });

  if (!isAuthenticated) {
    return <AuthRequiredMessage title="Product" />;
  }

  const product = productsQuery.data ?? null;
  const activePlanId = selectedPlanId || (product ? defaultPlanId(product) : '');
  const variants = product ? productVariants(product) : [];
  const activeVariantId = selectedVariantId || variants[0]?.id || '';
  const activeVariant = variants.find((entry) => entry.id === activeVariantId);
  const plan = plansQuery.data?.find((entry) => entry.id === activePlanId) ?? null;
  const images = product ? productImages(product) : [];
  const hasPlanPricing = Boolean(product?.planPricing.length);

  if (!product) {
    return (
      <Surface title="Product">
        <p className="text-slate-600">Product not found.</p>
      </Surface>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-[34px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)] sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div>
            {images.length ? (
              <ProductSlideshow className="h-96 w-full rounded-[28px] border border-slate-200" images={images} name={product.name} />
            ) : (
              <div className="grid h-96 place-items-center rounded-[28px] border border-slate-200 bg-slate-100 text-slate-400">
                <CubeIcon className="h-12 w-12" />
              </div>
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              <span className="rounded-full bg-slate-100 px-3 py-1">
                {product.category?.name ?? 'Catalog'}
              </span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                {formatProductType(product.productType)}
              </span>
            </div>

            <h1 className="mt-4 text-4xl font-black tracking-[-0.06em] text-slate-950">{product.name}</h1>
            <p className="mt-4 text-sm leading-7 text-slate-600">{product.description}</p>

            <div className="mt-6 rounded-[28px] border border-emerald-100 bg-emerald-50/70 p-5">
              {hasPlanPricing ? (
                <>
                  <select
                    className={fieldClass}
                    onChange={(event) => setSelectedPlanId(event.target.value)}
                    value={activePlanId}
                  >
                    {product.planPricing.map((pricing) => {
                      const linkedPlan = plansQuery.data?.find((entry) => entry.id === pricing.recurringPlanId);

                      return (
                        <option key={pricing.id} value={pricing.recurringPlanId}>
                          {linkedPlan?.name ?? 'Plan'} - {formatCurrency(pricing.overridePrice ?? product.baseSalesPrice)}
                        </option>
                      );
                    })}
                  </select>

                  <strong className="mt-5 block text-4xl font-black tracking-[-0.06em] text-slate-950">
                    {formatCurrency(productPrice(product, activePlanId, activeVariantId))}
                  </strong>
                  <p className="mt-2 inline-flex items-center gap-2 text-sm text-emerald-800">
                    <CalendarRepeatIcon className="h-4 w-4" />
                    {plan ? `Billed every ${planIntervalLabel(plan)}` : 'Recurring billing'}
                  </p>
                </>
              ) : (
                <div className="rounded-[20px] border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500">
                  Billing plan not assigned yet.
                </div>
              )}
            </div>

            {variants.length ? (
              <select
                className={`${fieldClass} mt-5`}
                onChange={(event) => setSelectedVariantId(event.target.value)}
                value={activeVariantId}
              >
                {variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.attribute}: {variant.value}
                    {Number(variant.extraPrice) > 0 ? ` (+${formatCurrency(variant.extraPrice)})` : ''}
                  </option>
                ))}
              </select>
            ) : null}

            <p className="mt-5 text-sm leading-6 text-slate-500">
              Terms, billing cadence, and subscription actions follow the selected recurring plan.
              {activeVariant ? ` Selected variant: ${activeVariant.attribute} / ${activeVariant.value}.` : ''}
            </p>
            {product.taxRules?.length ? (
              <p className="mt-3 text-xs leading-6 text-slate-500">
                Taxes: {product.taxRules.map((rule) => `${rule.name} (${rule.computation === 'fixed' ? formatCurrency(rule.amount ?? rule.ratePercent) : `${rule.amount ?? rule.ratePercent}%`})`).join(', ')}
              </p>
            ) : null}

            <button
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={!hasPlanPricing}
              onClick={() =>
                addItem({
                  productId: product.id,
                  slug: product.slug,
                  name: product.name,
                  imageUrl: images[0] ?? product.imageUrl,
                  recurringPlanId: activePlanId || null,
                  recurringPlanName: plan?.name ?? 'Plan',
                  variantId: activeVariantId || null,
                  variantName: activeVariant ? `${activeVariant.attribute}: ${activeVariant.value}` : null,
                  unitPrice: productPrice(product, activePlanId, activeVariantId),
                  quantity: 1
                })
              }
              type="button"
            >
              <CreditCardIcon className="h-4 w-4" />
              Add to cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthRequiredMessage({ title }: { readonly title: string }) {
  return (
    <Surface title={title}>
      <p className="mb-4 text-slate-600">Login first to access portal shopping and order pages.</p>
      <Link className="inline-flex rounded-full bg-emerald-600 px-5 py-3 font-semibold text-white" to="/login">
        Login
      </Link>
    </Surface>
  );
}

function FilterGroup({
  title,
  children
}: Readonly<{
  title: string;
  children: ReactNode;
}>) {
  return (
    <div className="border-b border-slate-200 pb-5 last:border-b-0 last:pb-0">
      <p className="mb-3 text-sm font-semibold text-slate-950">{title}</p>
      <div className="grid gap-2">{children}</div>
    </div>
  );
}

function FilterButton({
  active,
  children,
  onClick
}: Readonly<{
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}>) {
  return (
    <button
      className={`rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
        active
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-950'
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function formatProductType(productType: Product['productType']) {
  return productType === 'service' ? 'Service' : 'Goods';
}

function defaultPlanId(product: Product) {
  return (
    product.planPricing.find((plan) => plan.isDefaultPlan)?.recurringPlanId ??
    product.planPricing[0]?.recurringPlanId ??
    ''
  );
}

function productImages(product: Product) {
  const imageUrls = (product.imageUrls ?? []).filter(
    (url) => url.startsWith('data:image/') || /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(url)
  );

  if (imageUrls.length) {
    return imageUrls;
  }

  return product.imageUrl &&
    (product.imageUrl.startsWith('data:image/') ||
      /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(product.imageUrl))
    ? [product.imageUrl]
    : [];
}

function productVariants(product: Product) {
  return ((product.variants ?? []) as ProductVariantDetail[]).filter((variant) => Boolean(variant.id) && variant.isActive);
}

function productPrice(product: Product, recurringPlanId?: string, variantId?: string) {
  const variantExtraPrice = Number(productVariants(product).find((variant) => variant.id === variantId)?.extraPrice ?? 0);
  return Number(
    product.planPricing.find((plan) => plan.recurringPlanId === recurringPlanId)?.overridePrice ??
      product.baseSalesPrice ??
      0
  ) + variantExtraPrice;
}

function ProductSlideshow({
  className,
  images,
  name
}: Readonly<{
  className: string;
  images: string[];
  name: string;
}>) {
  const [activeIndex, setActiveIndex] = useState(0);
  const imageSignature = images.join('::');

  useEffect(() => {
    setActiveIndex(0);
  }, [imageSignature]);

  useEffect(() => {
    if (images.length < 2) {
      return;
    }

    const timer = globalThis.setInterval(() => {
      setActiveIndex((value) => (value + 1) % images.length);
    }, 3200);

    return () => {
      globalThis.clearInterval(timer);
    };
  }, [images.length]);

  return (
    <div className={`relative overflow-hidden bg-slate-100 ${className}`}>
      <img
        alt={`${name} ${activeIndex + 1}`}
        className="h-full w-full object-cover"
        decoding="async"
        loading="lazy"
        src={images[activeIndex]}
      />
      {images.length > 1 ? (
        <>
          <div className="absolute inset-x-3 bottom-3 flex items-center justify-between">
            <div className="flex gap-1.5">
              {images.map((image, index) => (
                <button
                  aria-label={`Show image ${index + 1}`}
                  className={`h-2.5 w-2.5 rounded-full transition ${
                    index === activeIndex ? 'bg-white' : 'bg-white/35'
                  }`}
                  key={image}
                  onClick={() => setActiveIndex(index)}
                  type="button"
                />
              ))}
            </div>
            <span className="rounded-full bg-slate-950/70 px-2.5 py-1 text-[11px] font-semibold text-white">
              {activeIndex + 1}/{images.length}
            </span>
          </div>
          <button
            aria-label="Previous image"
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-950/70 px-3 py-2 text-sm font-bold text-white"
            onClick={() => setActiveIndex((value) => (value - 1 + images.length) % images.length)}
            type="button"
          >
            {'<'}
          </button>
          <button
            aria-label="Next image"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-950/70 px-3 py-2 text-sm font-bold text-white"
            onClick={() => setActiveIndex((value) => (value + 1) % images.length)}
            type="button"
          >
            {'>'}
          </button>
        </>
      ) : null}
    </div>
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
        className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        type="button"
      >
        Previous
      </button>
      <span className="min-w-[104px] text-center text-sm text-slate-500">
        Page {currentPage} / {totalPages}
      </span>
      <button
        className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        type="button"
      >
        Next
      </button>
    </div>
  );
}
