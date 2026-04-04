export const userRoles = ['admin', 'internal_user', 'portal_user'] as const;
export const productTypes = ['goods', 'service'] as const;
export const intervalUnits = ['day', 'week', 'month', 'year'] as const;
export const discountTypes = ['fixed', 'percentage'] as const;
export const discountScopeTypes = ['all_products', 'selected_products', 'subscriptions'] as const;
export const taxComputations = ['fixed', 'percentage'] as const;
export const subscriptionStatuses = [
  'draft',
  'quotation',
  'quotation_sent',
  'confirmed',
  'in_progress',
  'paused',
  'closed',
  'cancelled',
  'churned',
] as const;
export const invoiceStatuses = ['draft', 'confirmed', 'cancelled', 'paid'] as const;
export const paymentStatuses = ['pending', 'succeeded', 'failed'] as const;
export const relationTypes = ['renewal', 'upsell'] as const;
export const sourceChannels = ['admin', 'portal'] as const;

export type UserRole = (typeof userRoles)[number];
export type ProductType = (typeof productTypes)[number];
export type IntervalUnit = (typeof intervalUnits)[number];
export type DiscountType = (typeof discountTypes)[number];
export type DiscountScopeType = (typeof discountScopeTypes)[number];
export type TaxComputation = (typeof taxComputations)[number];
export type SubscriptionStatus = (typeof subscriptionStatuses)[number];
export type InvoiceStatus = (typeof invoiceStatuses)[number];
export type PaymentStatus = (typeof paymentStatuses)[number];
export type RelationType = (typeof relationTypes)[number];
export type SourceChannel = (typeof sourceChannels)[number];
