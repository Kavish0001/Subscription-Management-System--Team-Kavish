import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Surface } from '../../components/layout';
import {
  apiRequest,
  formatCurrency,
  type Contact,
  type Product,
  type QuotationTemplateConfig,
  type RecurringPlan,
  type SessionUser,
} from '../../lib/api';
import { ApiError } from '../../lib/api';
import { useSession } from '../../lib/session';

const fieldClass = 'app-input';

type SubscriptionLineDraft = {
  productId: string;
  variantId?: string | null;
  variantName?: string | null;
  quantity: number;
  unitPrice: number;
};

export function SubscriptionFormPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { token, user } = useSession();
  const [customerContactId, setCustomerContactId] = useState('');
  const [salespersonUserId, setSalespersonUserId] = useState('');
  const [quotationTemplateId, setQuotationTemplateId] = useState('');
  const [recurringPlanId, setRecurringPlanId] = useState('');
  const [paymentTermLabel, setPaymentTermLabel] = useState('Immediate payment');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<SubscriptionLineDraft[]>([blankSubscriptionLine()]);
  const [showContactForm, setShowContactForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    companyName: '',
    line1: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
  });

  const contactsQuery = useQuery({
    queryKey: ['admin-contacts'],
    queryFn: () => apiRequest<Contact[]>('/contacts', { token }),
  });

  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: () =>
      apiRequest<Array<Pick<SessionUser, 'id' | 'email' | 'role'>>>('/users', { token }),
    enabled: user?.role === 'admin',
  });

  const productsQuery = useQuery({
    queryKey: ['subscription-form-products'],
    queryFn: () =>
      apiRequest<{ items: Product[] }>('/products?page=1&pageSize=50', { token }).then(
        (result) => result.items,
      ),
  });

  const plansQuery = useQuery({
    queryKey: ['subscription-form-plans'],
    queryFn: () => apiRequest<RecurringPlan[]>('/recurring-plans', { token }),
  });

  const templatesQuery = useQuery({
    queryKey: ['subscription-form-quotation-templates'],
    queryFn: () => apiRequest<QuotationTemplateConfig[]>('/quotation-templates', { token }),
  });

  useEffect(() => {
    if (!customerContactId && contactsQuery.data?.[0]) {
      setCustomerContactId(contactsQuery.data[0].id);
    }
  }, [contactsQuery.data, customerContactId]);

  useEffect(() => {
    if (quotationTemplateId) {
      return;
    }

    if (!lines[0]?.productId && productsQuery.data?.[0]) {
      setLines((current) => {
        if (current[0]?.productId) {
          return current;
        }

        return [
          {
            ...blankSubscriptionLine(),
            productId: productsQuery.data[0].id,
          },
          ...current.slice(1),
        ];
      });
    }
  }, [lines, productsQuery.data, quotationTemplateId]);

  useEffect(() => {
    if (!salespersonUserId) {
      if (user?.role === 'admin' && usersQuery.data?.[0]) {
        setSalespersonUserId(usersQuery.data[0].id);
      } else if (user?.role === 'internal_user' || user?.role === 'admin') {
        setSalespersonUserId(user.id);
      }
    }
  }, [salespersonUserId, user, usersQuery.data]);

  const selectedTemplate = useMemo(
    () => templatesQuery.data?.find((template) => template.id === quotationTemplateId) ?? null,
    [quotationTemplateId, templatesQuery.data],
  );

  useEffect(() => {
    if (!selectedTemplate) {
      return;
    }

    if (selectedTemplate.recurringPlan?.id) {
      setRecurringPlanId(selectedTemplate.recurringPlan.id);
    }

    if (selectedTemplate.paymentTermLabel) {
      setPaymentTermLabel(selectedTemplate.paymentTermLabel);
    }

    if (selectedTemplate.description && !notes.trim()) {
      setNotes(selectedTemplate.description);
    }

    if (selectedTemplate.lines.length) {
      setLines(
        selectedTemplate.lines.map((line) => ({
          productId: line.productId,
          variantId: line.variantId,
          variantName: line.variantName,
          quantity: line.quantity,
          unitPrice: Number(line.unitPrice) || 0,
        })),
      );
    }
  }, [notes, selectedTemplate]);

  const lineItems = useMemo(
    () =>
      lines.map((line, index) => {
        const product = productsQuery.data?.find((entry) => entry.id === line.productId) ?? null;
        const unitPrice = resolveSubscriptionLineUnitPrice(
          product,
          recurringPlanId,
          line.unitPrice,
        );

        return {
          index,
          ...line,
          product,
          unitPrice,
        };
      }),
    [lines, productsQuery.data, recurringPlanId],
  );

  const availablePlanIds = useMemo(() => {
    const selectedProducts = lineItems
      .map((entry) => entry.product)
      .filter((product): product is Product => Boolean(product));

    if (!selectedProducts.length) {
      return [];
    }

    const [firstProduct, ...restProducts] = selectedProducts;
    const planIntersection = new Set(firstProduct.planPricing.map((plan) => plan.recurringPlanId));

    restProducts.forEach((product) => {
      const productPlanIds = new Set(product.planPricing.map((plan) => plan.recurringPlanId));
      [...planIntersection].forEach((planId) => {
        if (!productPlanIds.has(planId)) {
          planIntersection.delete(planId);
        }
      });
    });

    return [...planIntersection];
  }, [lineItems]);

  useEffect(() => {
    const defaultPlan =
      selectedTemplate?.recurringPlan?.id ??
      lineItems[0]?.product?.planPricing.find((plan) => plan.isDefaultPlan)?.recurringPlanId ??
      lineItems[0]?.product?.planPricing[0]?.recurringPlanId ??
      plansQuery.data?.[0]?.id;

    if (defaultPlan && defaultPlan !== recurringPlanId) {
      setRecurringPlanId(defaultPlan);
    }
  }, [lineItems, plansQuery.data, recurringPlanId, selectedTemplate]);

  const estimatedSubtotal = lineItems.reduce(
    (sum, line) => sum + line.unitPrice * Math.max(1, line.quantity),
    0,
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const preparedLines = lineItems.filter((line) => line.product);

      if (!preparedLines.length) {
        throw new ApiError('Add at least one product line before saving', 400);
      }

      if (preparedLines.some((line) => line.quantity < 1)) {
        throw new ApiError('Each subscription line must have quantity at least 1', 400);
      }

      await apiRequest<{ id: string }>('/subscriptions', {
        token,
        method: 'POST',
        body: JSON.stringify({
          customerContactId,
          salespersonUserId,
          quotationTemplateId: quotationTemplateId || undefined,
          recurringPlanId: recurringPlanId || undefined,
          sourceChannel: 'admin',
          paymentTermLabel: paymentTermLabel.trim() || undefined,
          notes,
          lines: preparedLines.map((line) => ({
            productId: line.productId,
            variantId: line.variantId || undefined,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
          })),
        }),
      });
    },
    onSuccess: () => {
      navigate('/admin/subscriptions');
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof ApiError ? mutationError.message : 'Unable to save subscription',
      );
    },
  });

  const createContactMutation = useMutation({
    mutationFn: () =>
      apiRequest<Contact>('/contacts', {
        token,
        method: 'POST',
        body: JSON.stringify({
          name: contactForm.name,
          email: contactForm.email,
          phone: contactForm.phone || undefined,
          companyName: contactForm.companyName || undefined,
          isDefault: false,
          addresses: contactForm.line1
            ? [
                {
                  type: 'billing',
                  line1: contactForm.line1,
                  city: contactForm.city,
                  state: contactForm.state,
                  postalCode: contactForm.postalCode,
                  country: contactForm.country,
                  isDefault: true,
                },
              ]
            : undefined,
        }),
      }),
    onSuccess: async (contact) => {
      setCustomerContactId(contact.id);
      setShowContactForm(false);
      await queryClient.invalidateQueries({ queryKey: ['admin-contacts'] });
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof ApiError ? mutationError.message : 'Unable to create contact',
      );
    },
  });

  return (
    <Surface
      title="Subscription Form"
      actions={
        <div className="flex gap-3">
          <button
            className="app-btn app-btn-secondary"
            onClick={() => navigate('/admin/subscriptions')}
            type="button"
          >
            Discard
          </button>
          <button
            className="app-btn app-btn-primary"
            onClick={() => saveMutation.mutate()}
            type="button"
          >
            Save
          </button>
        </div>
      }
    >
      {error ? <p className="theme-message theme-message-error mb-4">{error}</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Customer">
          <div className="grid gap-3">
            <select
              className={fieldClass}
              onChange={(event) => setCustomerContactId(event.target.value)}
              value={customerContactId}
            >
              {contactsQuery.data?.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.name}
                </option>
              ))}
            </select>
            <button
              className="app-btn app-btn-secondary"
              onClick={() => setShowContactForm((value) => !value)}
              type="button"
            >
              {showContactForm ? 'Close New Contact' : 'Create New Contact'}
            </button>
          </div>
        </Field>
        <Field label="Quotation Template">
          <div className="grid gap-2">
            <select
              className={fieldClass}
              onChange={(event) => setQuotationTemplateId(event.target.value)}
              value={quotationTemplateId}
            >
              <option value="">No template</option>
              {templatesQuery.data?.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            <p className="text-sm muted">
              Optional. Selecting a quotation template fills the recurring plan, payment term, and
              subscription lines from that template.
            </p>
          </div>
        </Field>
        <Field label="Salesperson">
          {user?.role === 'admin' ? (
            <select
              className={fieldClass}
              onChange={(event) => setSalespersonUserId(event.target.value)}
              value={salespersonUserId}
            >
              {usersQuery.data?.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.email} ({account.role})
                </option>
              ))}
            </select>
          ) : (
            <input className={fieldClass} disabled value={user?.email ?? ''} />
          )}
        </Field>
        <Field label="Recurring Plan">
          <select
            className={fieldClass}
            onChange={(event) => setRecurringPlanId(event.target.value)}
            value={recurringPlanId}
          >
            {plansQuery.data
              ?.filter(
                (plan) => availablePlanIds.length === 0 || availablePlanIds.includes(plan.id),
              )
              .map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Payment Term">
          <input
            className={fieldClass}
            onChange={(event) => setPaymentTermLabel(event.target.value)}
            value={paymentTermLabel}
          />
        </Field>
        <Field label="Other Info">
          <textarea
            className={fieldClass}
            onChange={(event) => setNotes(event.target.value)}
            rows={5}
            value={notes}
          />
        </Field>
        {selectedTemplate ? (
          <div className="app-card p-5 md:col-span-2">
            <p className="text-sm font-semibold text-[color:var(--color-text-primary)]">
              Template autofill
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="app-soft-panel rounded-2xl px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-text-muted)]">
                  Template
                </p>
                <p className="mt-2 font-semibold text-[color:var(--color-text-primary)]">
                  {selectedTemplate.name}
                </p>
              </div>
              <div className="app-soft-panel rounded-2xl px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-text-muted)]">
                  Validity
                </p>
                <p className="mt-2 font-semibold text-[color:var(--color-text-primary)]">
                  {selectedTemplate.validityDays} day(s)
                </p>
              </div>
              <div className="app-soft-panel rounded-2xl px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-text-muted)]">
                  Preset lines
                </p>
                <p className="mt-2 font-semibold text-[color:var(--color-text-primary)]">
                  {selectedTemplate.lines.length || 0}
                </p>
              </div>
            </div>
          </div>
        ) : null}
        <div className="app-card p-5 md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[color:var(--color-text-primary)]">
                Subscription lines
              </p>
              <p className="mt-1 text-sm muted">
                {selectedTemplate
                  ? 'Template lines are loaded below. You can review and adjust them before saving.'
                  : 'Add the products that belong to this subscription.'}
              </p>
            </div>
            <button
              className="app-btn app-btn-secondary"
              onClick={() =>
                setLines((current) => [
                  ...current,
                  blankSubscriptionLine(productsQuery.data?.[0]?.id),
                ])
              }
              type="button"
            >
              Add Line
            </button>
          </div>

          <div className="mt-5 grid gap-4">
            {lineItems.map((line) => (
              <div
                className="rounded-[24px] border border-[color:var(--color-border)] bg-[color:var(--color-card-muted)] p-4"
                key={`${line.index}-${line.productId || 'blank'}`}
              >
                <div className="grid gap-4 md:grid-cols-[minmax(0,1.6fr)_140px_160px_auto]">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-[color:var(--color-text-primary)]">
                      Product
                    </label>
                    <select
                      className={fieldClass}
                      onChange={(event) =>
                        setLines((current) =>
                          current.map((entry, entryIndex) =>
                            entryIndex === line.index
                              ? {
                                  ...entry,
                                  productId: event.target.value,
                                  variantId: null,
                                  variantName: null,
                                }
                              : entry,
                          ),
                        )
                      }
                      value={line.productId}
                    >
                      <option value="">Select product</option>
                      {productsQuery.data?.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                    {line.variantName ? (
                      <p className="text-xs text-[color:var(--color-text-secondary)]">
                        Variant: {line.variantName}
                      </p>
                    ) : null}
                    <p className="text-xs text-[color:var(--color-text-secondary)]">
                      {line.product?.description ??
                        'Choose a product to include in this subscription.'}
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-[color:var(--color-text-primary)]">
                      Quantity
                    </label>
                    <input
                      className={fieldClass}
                      min={1}
                      onChange={(event) =>
                        setLines((current) =>
                          current.map((entry, entryIndex) =>
                            entryIndex === line.index
                              ? {
                                  ...entry,
                                  quantity: Math.max(1, Number(event.target.value) || 1),
                                }
                              : entry,
                          ),
                        )
                      }
                      type="number"
                      value={line.quantity}
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-[color:var(--color-text-primary)]">
                      Unit Price
                    </label>
                    <div className="app-readonly">{formatCurrency(line.unitPrice)}</div>
                    <p className="text-xs text-[color:var(--color-text-secondary)]">
                      Based on the selected recurring plan.
                    </p>
                  </div>

                  <div className="flex items-end">
                    <button
                      className="app-btn app-btn-secondary"
                      onClick={() =>
                        setLines((current) =>
                          current.length === 1
                            ? [blankSubscriptionLine(productsQuery.data?.[0]?.id)]
                            : current.filter((_, entryIndex) => entryIndex !== line.index),
                        )
                      }
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="app-soft-panel p-5 md:col-span-2">
          <p className="text-sm font-semibold text-[color:var(--color-text-primary)]">
            Estimated total with tax: {formatCurrency(estimatedSubtotal * 1.18)}
          </p>
          <p className="mt-3 text-sm muted">
            Invoices are created after the quotation is confirmed and reaches its billing date.
          </p>
        </div>
        {showContactForm ? (
          <div className="app-card grid gap-4 p-5 md:col-span-2 md:grid-cols-2">
            <Field label="Contact Name">
              <input
                className={fieldClass}
                onChange={(event) =>
                  setContactForm((value) => ({ ...value, name: event.target.value }))
                }
                value={contactForm.name}
              />
            </Field>
            <Field label="Phone">
              <input
                className={fieldClass}
                onChange={(event) =>
                  setContactForm((value) => ({ ...value, phone: event.target.value }))
                }
                value={contactForm.phone}
              />
            </Field>
            <Field label="Email">
              <input
                className={fieldClass}
                onChange={(event) =>
                  setContactForm((value) => ({ ...value, email: event.target.value }))
                }
                value={contactForm.email}
              />
            </Field>
            <Field label="Company">
              <input
                className={fieldClass}
                onChange={(event) =>
                  setContactForm((value) => ({ ...value, companyName: event.target.value }))
                }
                value={contactForm.companyName}
              />
            </Field>
            <Field label="Address">
              <input
                className={fieldClass}
                onChange={(event) =>
                  setContactForm((value) => ({ ...value, line1: event.target.value }))
                }
                value={contactForm.line1}
              />
            </Field>
            <Field label="City">
              <input
                className={fieldClass}
                onChange={(event) =>
                  setContactForm((value) => ({ ...value, city: event.target.value }))
                }
                value={contactForm.city}
              />
            </Field>
            <Field label="State">
              <input
                className={fieldClass}
                onChange={(event) =>
                  setContactForm((value) => ({ ...value, state: event.target.value }))
                }
                value={contactForm.state}
              />
            </Field>
            <Field label="Postal Code">
              <input
                className={fieldClass}
                onChange={(event) =>
                  setContactForm((value) => ({ ...value, postalCode: event.target.value }))
                }
                value={contactForm.postalCode}
              />
            </Field>
            <Field label="Country">
              <input
                className={fieldClass}
                onChange={(event) =>
                  setContactForm((value) => ({ ...value, country: event.target.value }))
                }
                value={contactForm.country}
              />
            </Field>
            <button
              className="app-btn app-btn-primary md:col-span-2 md:justify-self-start"
              onClick={() => createContactMutation.mutate()}
              type="button"
            >
              Save Contact
            </button>
          </div>
        ) : null}
      </div>
    </Surface>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="app-label">
      {label}
      {children}
    </label>
  );
}

function resolveProductPreviewImage(product: Product) {
  const mediaImage = product.media?.find((entry) => entry.type === 'image')?.url;
  const candidateUrls = [
    mediaImage ?? null,
    ...(product.imageUrls ?? []),
    product.imageUrl ?? null,
  ].filter((value): value is string => Boolean(value));

  return candidateUrls[0] ?? null;
}

function blankSubscriptionLine(productId = ''): SubscriptionLineDraft {
  return {
    productId,
    variantId: null,
    variantName: null,
    quantity: 1,
    unitPrice: 0,
  };
}

function resolveSubscriptionLineUnitPrice(
  product: Product | null,
  recurringPlanId: string,
  fallbackPrice = 0,
) {
  if (!product) {
    return fallbackPrice;
  }

  return (
    Number(
      product.planPricing.find((plan) => plan.recurringPlanId === recurringPlanId)?.overridePrice ??
        product.baseSalesPrice ??
        fallbackPrice,
    ) || 0
  );
}
