const API_URL = (import.meta.env.VITE_API_URL?.trim() || '/api/v1').replace(/\/$/, '');

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: 'admin' | 'internal_user' | 'portal_user';
};

export type AdminUser = {
  id: string;
  email: string;
  role: SessionUser['role'];
  isActive: boolean;
  name: string | null;
  phone?: string | null;
  address?: string | null;
  updatedAt?: string;
  createdAt?: string;
  lastLoginAt?: string | null;
  defaultContactId?: string | null;
  defaultContact?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    activeSubscriptions: number;
  } | null;
};

export type Address = {
  id: string;
  type: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
};

export type Contact = {
  id: string;
  userId: string | null;
  name: string;
  email?: string | null;
  phone: string | null;
  address?: string | null;
  companyName: string | null;
  notes: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  activeSubscriptions?: number;
  user?: {
    id: string;
    email: string;
    name: string | null;
    defaultContactId: string | null;
  } | null;
  addresses: Address[];
};

export type ProductAttributeConfig = {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  valuesCount: number;
  values: Array<{
    id: string;
    value: string;
    extraPrice: string | number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type PaymentTermConfig = {
  id: string;
  name: string;
  description: string | null;
  dueDays: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type QuotationTemplateConfig = {
  id: string;
  name: string;
  validityDays: number;
  paymentTermLabel: string;
  description: string | null;
  isActive: boolean;
  isLastForever: boolean;
  durationCount: number | null;
  durationUnit: 'day' | 'week' | 'month' | 'year' | null;
  recurringPlan: {
    id: string;
    name: string;
  } | null;
  linesCount: number;
  subscriptionsCount: number;
  lines: Array<{
    id: string;
    productId: string;
    productName: string;
    productDescription: string | null;
    variantId: string | null;
    variantName: string | null;
    quantity: number;
    unitPrice: string | number;
    sortOrder: number;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type RecurringPlan = {
  id: string;
  name: string;
  intervalCount: number;
  intervalUnit: 'day' | 'week' | 'month' | 'year';
  price: string | number;
  minimumQuantity: number;
  startDate?: string | null;
  endDate?: string | null;
  autoCloseEnabled?: boolean;
  autoCloseAfterCount?: number | null;
  autoCloseAfterUnit?: 'day' | 'week' | 'month' | 'year' | null;
  isClosable: boolean;
  isPausable: boolean;
  isRenewable: boolean;
  isActive?: boolean;
  productsCount?: number;
  subscriptionsCount?: number;
  templatesCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type ProductPlanPricing = {
  id: string;
  recurringPlanId: string;
  overridePrice: string | number | null;
  isDefaultPlan: boolean;
  recurringPlan?: RecurringPlan;
};

export type ProductMedia = {
  id: string;
  type: 'image' | 'video';
  url: string;
  fileName: string;
  thumbnailUrl?: string;
  isPrimary: boolean;
  sortOrder: number;
};

export type ProductRecurringPrice = {
  recurringPlanId?: string;
  planName: string;
  price: string | number;
  intervalCount: number;
  billingPeriod: 'day' | 'week' | 'month' | 'year';
  minimumQuantity: number;
  startDate: string | null;
  endDate: string | null;
  autoCloseEnabled: boolean;
  autoCloseAfterCount?: number | null;
  autoCloseAfterUnit?: 'day' | 'week' | 'month' | 'year' | null;
  isClosable: boolean;
  isPausable: boolean;
  isRenewable: boolean;
  isActive: boolean;
};

export type ProductVariantDetail = {
  id?: string;
  attribute: string;
  attributeId?: string | null;
  attributeValueId?: string | null;
  value: string;
  extraPrice: string | number;
  sortOrder: number;
  isActive: boolean;
};

export type ProductCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

export type Product = {
  id: string;
  categoryId: string | null;
  name: string;
  slug: string;
  description: string | null;
  productType: 'goods' | 'service';
  baseSalesPrice: string | number;
  costPrice: string | number;
  imageUrl: string | null;
  imageUrls: string[];
  isSubscriptionEnabled: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  category?: {
    id: string;
    name: string;
  } | null;
  media?: ProductMedia[];
  mediaCount?: number;
  recurringPlansCount?: number;
  variantsCount?: number;
  taxRulesCount?: number;
  recurringPrices?: ProductRecurringPrice[];
  variants?: ProductVariantDetail[] | Array<{
    id: string;
    name: string;
    priceOverride: string | number | null;
  }>;
  taxRuleIds?: string[];
  taxRules?: TaxRule[];
  planPricing: ProductPlanPricing[];
};

export type Discount = {
  id: string;
  name: string;
  code: string | null;
  discountType: 'fixed' | 'percentage';
  value: string | number;
  minimumPurchase: string | number | null;
  minimumQuantity: number | null;
  startDate: string | null;
  endDate: string | null;
  limitUsageEnabled: boolean;
  usageLimit: number | null;
  scopeType: string;
  usageCount: number;
  isActive?: boolean;
  products?: Array<{
    id: string;
    name: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
};

export type TaxRule = {
  id: string;
  name: string;
  computation: 'percentage' | 'fixed';
  amount?: string | number;
  ratePercent: string | number;
  taxType: string;
  isInclusive: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type SubscriptionLine = {
  id: string;
  productId: string;
  productNameSnapshot: string;
  quantity: number;
  unitPrice: string | number;
  lineTotal: string | number;
  variant?: {
    id: string;
    name: string;
  } | null;
  product?: Product;
};

export type InvoiceSummary = {
  id: string;
  invoiceNumber: string;
  status: 'draft' | 'confirmed' | 'cancelled' | 'paid';
  invoiceDate: string;
  dueDate: string;
  totalAmount: string | number;
  amountDue: string | number;
};

export type CheckoutSummaryItem = {
  productId: string;
  recurringPlanId: string | null;
  variantId: string | null;
  quantity: number;
  unitPrice: string | number;
  discountAmount: string | number;
  taxAmount: string | number;
  lineTotal: string | number;
};

export type CheckoutSummary = {
  items: CheckoutSummaryItem[];
  subtotalAmount: string | number;
  discountAmount: string | number;
  taxAmount: string | number;
  totalAmount: string | number;
  appliedDiscountCode: string | null;
  hasDiscount: boolean;
};

export type Subscription = {
  id: string;
  subscriptionNumber: string;
  createdAt: string;
  status: string;
  relationType?: 'renewal' | 'upsell' | null;
  sourceChannel: string;
  quotationDate: string | null;
  quotationExpiresAt?: string | null;
  confirmedAt: string | null;
  startDate: string | null;
  nextInvoiceDate: string | null;
  expirationDate?: string | null;
  paymentTermLabel: string | null;
  totalAmount: string | number;
  subtotalAmount: string | number;
  discountAmount: string | number;
  taxAmount: string | number;
  notes: string | null;
  customerContact: Contact;
  recurringPlan: RecurringPlan | null;
  lines: SubscriptionLine[];
  invoices: InvoiceSummary[];
  parentOrder?: {
    id: string;
    subscriptionNumber: string;
    status: string;
  } | null;
  childOrders?: Array<{
    id: string;
    subscriptionNumber: string;
    status: string;
    relationType: 'renewal' | 'upsell' | null;
    createdAt: string;
  }>;
};

export type Invoice = InvoiceSummary & {
  createdAt?: string;
  subscriptionOrderId: string;
  sourceLabel: string;
  paymentTermLabel: string | null;
  currencyCode: string;
  subtotalAmount: string | number;
  taxAmount: string | number;
  discountAmount: string | number;
  paidAmount: string | number;
  paidAt: string | null;
  lines: Array<{
    id: string;
    productNameSnapshot: string;
    quantity: number;
    unitPrice: string | number;
    lineTotal: string | number;
  }>;
  payments: Array<{
    id: string;
    paymentReference: string;
    paymentMethod: string;
    provider: string;
    status: string;
    amount: string | number;
    paidAt: string | null;
  }>;
  subscriptionOrder?: {
    id: string;
    subscriptionNumber: string;
    status: string;
  };
};

export type RazorpayOrder = {
  purpose: 'checkout' | 'invoice';
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  merchantName: string;
  description: string;
  customer: {
    name: string;
    email: string | null;
    contact: string | null;
  };
  subscriptionIds: string[];
  invoiceIds: string[];
};

export type RazorpayVerificationResult = {
  subscriptionIds: string[];
  invoiceIds: string[];
};

export type DashboardMetrics = {
  activeSubscriptions: number;
  invoicesPaid: number;
  revenue: number;
  overdueInvoices: number;
};

export type PaginatedResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

type ApiEnvelope<T> = {
  data: T;
};

type ApiErrorEnvelope = {
  error?: {
    message?: string;
    code?: string;
    details?: unknown;
  };
};

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit & { token?: string | null } = {},
) {
  const { token, headers, body, ...rest } = init;
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...rest,
      body,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers
      }
    });
  } catch {
    throw new ApiError('API server is unavailable. Start the backend and try again.', 503);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  let payload: ApiEnvelope<T> | ApiErrorEnvelope | null = null;

  try {
    payload = (await response.json()) as ApiEnvelope<T> | ApiErrorEnvelope;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const errorPayload = payload && 'error' in payload ? payload.error : undefined;
    throw new ApiError(
      errorPayload?.message ?? 'Request failed',
      response.status,
      errorPayload?.code,
      errorPayload?.details
    );
  }

  return (payload as ApiEnvelope<T>).data;
}

export function formatCurrency(value: string | number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(Number(value));
}

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium'
  }).format(new Date(value));
}

export function planIntervalLabel(plan: Pick<RecurringPlan, 'intervalCount' | 'intervalUnit'>) {
  return `${plan.intervalCount} ${plan.intervalUnit}${plan.intervalCount > 1 ? 's' : ''}`;
}

export function normalizeSessionUser(
  input:
    | { id: string; email: string; name?: string | null; role: SessionUser['role'] }
    | { userId: string; email: string; name?: string | null; role: SessionUser['role'] },
): SessionUser {
  return {
    id: 'id' in input ? input.id : input.userId,
    email: input.email,
    name: input.name ?? null,
    role: input.role
  };
}
