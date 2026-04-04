import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Surface } from '../../components/layout';
import { apiRequest, formatCurrency, planIntervalLabel, type Product, type RecurringPlan } from '../../lib/api';
import { useCartStore } from '../../lib/cart';
import { useSession } from '../../lib/session';

export function ShopPage() {
  const { isAuthenticated, token } = useSession();
  const addItem = useCartStore((state) => state.addItem);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'price' | 'name'>('price');
  const [selectedPlans, setSelectedPlans] = useState<Record<string, string>>({});

  const productsQuery = useQuery({
    queryKey: ['portal-products'],
    queryFn: () =>
      apiRequest<{ items: Product[] }>('/products?page=1&pageSize=50', { token }).then(
        (result) => result.items
      ),
    enabled: isAuthenticated
  });

  const plansQuery = useQuery({
    queryKey: ['portal-plans'],
    queryFn: () => apiRequest<RecurringPlan[]>('/recurring-plans', { token }),
    enabled: isAuthenticated
  });

  const products = useMemo(() => {
    const items = [...(productsQuery.data ?? [])].filter((product) =>
      product.name.toLowerCase().includes(search.trim().toLowerCase())
    );

    items.sort((left, right) => {
      if (sortBy === 'name') {
        return left.name.localeCompare(right.name);
      }

      return productPrice(left, selectedPlans[left.id]) - productPrice(right, selectedPlans[right.id]);
    });

    return items;
  }, [productsQuery.data, search, selectedPlans, sortBy]);

  if (!isAuthenticated) {
    return <AuthRequiredMessage title="Shop" />;
  }

  return (
    <Surface title="Shop">
      <div className="mb-5 grid gap-3 md:grid-cols-[1fr_220px]">
        <input className={fieldClass} onChange={(event) => setSearch(event.target.value)} placeholder="Search products" value={search} />
        <select className={fieldClass} onChange={(event) => setSortBy(event.target.value as 'price' | 'name')} value={sortBy}>
          <option value="price">Sort by price</option>
          <option value="name">Sort by name</option>
        </select>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => {
          const selectedPlanId = selectedPlans[product.id] ?? defaultPlanId(product);
          const plan = plansQuery.data?.find((entry) => entry.id === selectedPlanId) ?? null;
          const price = productPrice(product, selectedPlanId);

          return (
            <article className="rounded-[28px] border border-white/10 bg-slate-950/50 p-5" key={product.id}>
              {product.imageUrl ? (
                <img alt={product.name} className="mb-4 h-44 w-full rounded-[22px] object-cover" src={product.imageUrl} />
              ) : null}
              <p className="text-xs uppercase tracking-[0.28em] text-emerald-300">
                {plan ? `${planIntervalLabel(plan)} billing` : 'Recurring plan'}
              </p>
              <h3 className="mt-2 text-2xl font-black">{product.name}</h3>
              <p className="mt-2 line-clamp-3 text-slate-400">{product.description}</p>
              <div className="mt-4 grid gap-3">
                <select className={fieldClass} onChange={(event) => setSelectedPlans((value) => ({ ...value, [product.id]: event.target.value }))} value={selectedPlanId}>
                  {product.planPricing.map((pricing) => {
                    const linkedPlan = plansQuery.data?.find((entry) => entry.id === pricing.recurringPlanId);
                    return (
                      <option key={pricing.id} value={pricing.recurringPlanId}>
                        {linkedPlan?.name ?? 'Plan'} - {formatCurrency(pricing.overridePrice ?? product.baseSalesPrice)}
                      </option>
                    );
                  })}
                </select>
                <strong className="block text-3xl">{formatCurrency(price)}</strong>
                <div className="flex gap-3">
                  <Link className="rounded-full border border-white/10 bg-white/6 px-4 py-3 text-sm font-semibold text-white" to={`/products/${product.slug}`}>
                    View
                  </Link>
                  <button
                    className="rounded-full bg-gradient-to-r from-emerald-300 to-sky-400 px-4 py-3 text-sm font-semibold text-slate-950"
                    onClick={() =>
                      addItem({
                        productId: product.id,
                        slug: product.slug,
                        name: product.name,
                        imageUrl: product.imageUrl,
                        recurringPlanId: selectedPlanId || null,
                        recurringPlanName: plan?.name ?? 'Plan',
                        unitPrice: price,
                        quantity: 1
                      })
                    }
                    type="button"
                  >
                    Add to cart
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </Surface>
  );
}

export function ProductPage() {
  const { slug } = useParams();
  const { isAuthenticated, token } = useSession();
  const addItem = useCartStore((state) => state.addItem);
  const [selectedPlanId, setSelectedPlanId] = useState('');

  const productsQuery = useQuery({
    queryKey: ['product-detail'],
    queryFn: () =>
      apiRequest<{ items: Product[] }>('/products?page=1&pageSize=50', { token }).then(
        (result) => result.items
      ),
    enabled: isAuthenticated
  });

  const plansQuery = useQuery({
    queryKey: ['product-detail-plans'],
    queryFn: () => apiRequest<RecurringPlan[]>('/recurring-plans', { token }),
    enabled: isAuthenticated
  });

  if (!isAuthenticated) {
    return <AuthRequiredMessage title="Product" />;
  }

  const product = productsQuery.data?.find((entry) => entry.slug === slug) ?? null;
  const activePlanId = selectedPlanId || (product ? defaultPlanId(product) : '');
  const plan = plansQuery.data?.find((entry) => entry.id === activePlanId) ?? null;

  if (!product) {
    return (
      <Surface title="Product">
        <p className="text-slate-300">Product not found.</p>
      </Surface>
    );
  }

  return (
    <Surface title={product.name}>
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div>
          {product.imageUrl ? <img alt={product.name} className="h-80 w-full rounded-[28px] object-cover" src={product.imageUrl} /> : null}
        </div>
        <div>
          <p className="mb-3 text-sm uppercase tracking-[0.28em] text-emerald-300">
            {plan ? planIntervalLabel(plan) : 'Recurring'}
          </p>
          <p className="mb-4 text-slate-300">{product.description}</p>
          <select className={`${fieldClass} mb-4`} onChange={(event) => setSelectedPlanId(event.target.value)} value={activePlanId}>
            {product.planPricing.map((pricing) => {
              const linkedPlan = plansQuery.data?.find((entry) => entry.id === pricing.recurringPlanId);
              return (
                <option key={pricing.id} value={pricing.recurringPlanId}>
                  {linkedPlan?.name ?? 'Plan'} - {formatCurrency(pricing.overridePrice ?? product.baseSalesPrice)}
                </option>
              );
            })}
          </select>
          <strong className="mb-5 block text-4xl">{formatCurrency(productPrice(product, activePlanId))}</strong>
          <p className="mb-4 text-sm text-slate-400">Terms and conditions apply according to the selected recurring plan.</p>
          <button
            className="rounded-full bg-gradient-to-r from-emerald-300 to-sky-400 px-5 py-3 font-semibold text-slate-950"
            onClick={() =>
              addItem({
                productId: product.id,
                slug: product.slug,
                name: product.name,
                imageUrl: product.imageUrl,
                recurringPlanId: activePlanId || null,
                recurringPlanName: plan?.name ?? 'Plan',
                unitPrice: productPrice(product, activePlanId),
                quantity: 1
              })
            }
            type="button"
          >
            Add to cart
          </button>
        </div>
      </div>
    </Surface>
  );
}

function AuthRequiredMessage({ title }: { title: string }) {
  return (
    <Surface title={title}>
      <p className="mb-4 text-slate-300">Login first to access portal shopping and order pages.</p>
      <Link className="rounded-full bg-gradient-to-r from-emerald-300 to-sky-400 px-5 py-3 font-semibold text-slate-950" to="/login">
        Login
      </Link>
    </Surface>
  );
}

function defaultPlanId(product: Product) {
  return (
    product.planPricing.find((plan) => plan.isDefaultPlan)?.recurringPlanId ??
    product.planPricing[0]?.recurringPlanId ??
    ''
  );
}

function productPrice(product: Product, recurringPlanId?: string) {
  return Number(
    product.planPricing.find((plan) => plan.recurringPlanId === recurringPlanId)?.overridePrice ??
      product.baseSalesPrice ??
      0
  );
}

const fieldClass = 'rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3';
