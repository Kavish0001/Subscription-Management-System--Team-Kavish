const API_URL = (import.meta.env.VITE_API_URL?.trim() || '/api/v1').replace(/\/$/, '');

export type SessionUser = {
  id: string;
  email: string;
  role: 'admin' | 'internal_user' | 'portal_user';
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
  phone: string | null;
  companyName: string | null;
  notes: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt?: string;
  addresses: Address[];
};

export type RecurringPlan = {
  id: string;
  name: string;
  intervalCount: number;
  intervalUnit: 'day' | 'week' | 'month' | 'year';
  price: string | number;
  minimumQuantity: number;
  isClosable: boolean;
  isPausable: boolean;
  isRenewable: boolean;
};

export type ProductPlanPricing = {
  id: string;
  recurringPlanId: string;
  overridePrice: string | number | null;
  isDefaultPlan: boolean;
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
  isSubscriptionEnabled: boolean;
  createdAt?: string;
  category?: {
    id: string;
    name: string;
  } | null;
  variants?: Array<{
    id: string;
    name: string;
    priceOverride: string | number | null;
  }>;
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
  scopeType: string;
  usageCount: number;
  createdAt?: string;
};

export type TaxRule = {
  id: string;
  name: string;
  ratePercent: string | number;
  taxType: string;
  isInclusive: boolean;
  createdAt?: string;
  computation?: 'percentage' | 'fixed';
};

export type SubscriptionLine = {
  id: string;
  productId: string;
  productNameSnapshot: string;
  quantity: number;
  unitPrice: string | number;
  lineTotal: string | number;
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

export type Subscription = {
  id: string;
  subscriptionNumber: string;
  createdAt: string;
  status: string;
  relationType?: 'renewal' | 'upsell' | null;
  sourceChannel: string;
  quotationDate: string | null;
  confirmedAt: string | null;
  startDate: string | null;
  nextInvoiceDate: string | null;
  paymentTermLabel: string | null;
  totalAmount: string | number;
  subtotalAmount: string | number;
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
  };
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit & { token?: string | null } = {},
) {
  const { token, headers, body, ...rest } = init;
  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    body,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    }
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json()) as ApiEnvelope<T> | ApiErrorEnvelope;

  if (!response.ok) {
    const errorMessage = 'error' in payload ? payload.error?.message : undefined;
    throw new ApiError(errorMessage ?? 'Request failed', response.status);
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
    | { id: string; email: string; role: SessionUser['role'] }
    | { userId: string; email: string; role: SessionUser['role'] },
): SessionUser {
  return {
    id: 'id' in input ? input.id : input.userId,
    email: input.email,
    role: input.role
  };
}
