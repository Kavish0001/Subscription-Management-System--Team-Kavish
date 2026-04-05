import { z } from 'zod';

import {
  discountScopeTypes,
  discountTypes,
  intervalUnits,
  productTypes,
  taxComputations,
  userRoles,
} from './enums.js';

const productImageSchema = z.string().refine((value) => {
  if (value.startsWith('data:image/')) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}, 'Product images must be uploaded files or valid HTTP URLs');

const productMediaUrlSchema = z.string().refine((value) => {
  if (value.startsWith('data:image/') || value.startsWith('data:video/')) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}, 'Media files must be uploaded files or valid HTTP URLs');

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
});

export const signupSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(9)
    .regex(/[a-z]/, 'Password must contain a lowercase character')
    .regex(/[A-Z]/, 'Password must contain an uppercase character')
    .regex(/[^A-Za-z0-9]/, 'Password must contain a special character'),
  name: z.string().min(2).max(100),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6).regex(/^\d+$/, 'OTP must be digits only'),
});

export const resendOtpSchema = z.object({
  email: z.string().email(),
});

export const requestPasswordResetSchema = z.object({
  email: z.string().email(),
});

export const confirmPasswordResetSchema = z
  .object({
    token: z.string().min(20),
    password: signupSchema.shape.password,
    confirmPassword: z.string().min(1),
  })
  .refine((input) => input.password === input.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const productSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(140),
  description: z.string().max(5000).optional(),
  productType: z.enum(productTypes),
  baseSalesPrice: z.number().nonnegative(),
  costPrice: z.number().nonnegative(),
  categoryId: z.string().uuid().optional(),
  isSubscriptionEnabled: z.boolean().default(true),
  imageUrl: productImageSchema.optional(),
  imageUrls: z.array(productImageSchema).max(10).optional(),
  planPricing: z
    .array(
      z.object({
        recurringPlanId: z.string().uuid(),
        overridePrice: z.number().nonnegative().optional(),
        isDefaultPlan: z.boolean().default(false),
      }),
    )
    .max(20)
    .optional(),
});

export const productMediaSchema = z.object({
  id: z.string().uuid().optional(),
  type: z.enum(['image', 'video']),
  url: productMediaUrlSchema,
  fileName: z.string().trim().min(1).max(255),
  thumbnailUrl: productMediaUrlSchema.optional(),
  isPrimary: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
});

export const productRecurringPriceSchema = z.object({
  recurringPlanId: z.string().uuid().optional(),
  planName: z.string().trim().min(1, 'Plan name is required').max(120),
  price: z.number().nonnegative(),
  intervalCount: z.number().int().min(1).default(1),
  billingPeriod: z.enum(intervalUnits),
  minimumQuantity: z.number().int().min(1),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  autoCloseEnabled: z.boolean().default(false),
  autoCloseAfterCount: z.number().int().min(1).optional(),
  autoCloseAfterUnit: z.enum(intervalUnits).optional(),
  isClosable: z.boolean().default(true),
  isPausable: z.boolean().default(true),
  isRenewable: z.boolean().default(true),
  isActive: z.boolean().default(true),
}).refine((input) => !input.endDate || !input.startDate || input.endDate >= input.startDate, {
  message: 'End date cannot be before start date',
  path: ['endDate'],
}).refine((input) => !input.autoCloseEnabled || (input.autoCloseAfterCount && input.autoCloseAfterUnit), {
  message: 'Auto-close duration is required when auto-close is enabled',
  path: ['autoCloseAfterCount'],
});

export const productVariantSchema = z.object({
  id: z.string().uuid().optional(),
  attribute: z.string().trim().min(1, 'Attribute is required').max(120),
  value: z.string().trim().min(1, 'Value is required').max(120),
  extraPrice: z.number().nonnegative(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const adminProductSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required').max(120),
  slug: z.string().trim().min(2).max(140).optional(),
  description: z.string().max(5000).optional(),
  productType: z.enum(productTypes),
  baseSalesPrice: z.number().nonnegative(),
  costPrice: z.number().nonnegative(),
  categoryId: z.string().uuid().optional(),
  isActive: z.boolean().default(true),
  media: z.array(productMediaSchema).min(1, 'At least 1 media file is required').max(7, 'Maximum 7 media files allowed'),
  recurringPrices: z.array(productRecurringPriceSchema).max(20).default([]),
  variants: z.array(productVariantSchema).max(50).default([]),
  taxRuleIds: z.array(z.string().uuid()).max(20).default([]),
}).superRefine((input, context) => {
  const primaryCount = input.media.filter((entry) => entry.isPrimary).length;
  if (primaryCount > 1) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Only one media item can be primary',
      path: ['media'],
    });
  }

  const recurringKeys = new Set<string>();
  input.recurringPrices.forEach((entry, index) => {
    const key = [
      entry.recurringPlanId ?? entry.planName.toLowerCase(),
      entry.billingPeriod,
      entry.startDate?.toISOString() ?? 'open',
      entry.endDate?.toISOString() ?? 'open',
    ].join('|');

    if (recurringKeys.has(key)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Duplicate recurring pricing row not allowed',
        path: ['recurringPrices', index],
      });
    }

    recurringKeys.add(key);
  });

  const variantKeys = new Set<string>();
  input.variants.forEach((entry, index) => {
    const key = `${entry.attribute.toLowerCase()}|${entry.value.toLowerCase()}`;
    if (variantKeys.has(key)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Duplicate attribute-value combination not allowed',
        path: ['variants', index],
      });
    }

    variantKeys.add(key);
  });
});

export const recurringPlanSchema = z.object({
  name: z.string().min(2).max(120),
  intervalCount: z.number().int().min(1),
  intervalUnit: z.enum(intervalUnits),
  price: z.number().nonnegative(),
  minimumQuantity: z.number().int().min(1).default(1),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  autoCloseEnabled: z.boolean().default(false),
  autoCloseAfterCount: z.number().int().min(1).optional(),
  autoCloseAfterUnit: z.enum(intervalUnits).optional(),
  isClosable: z.boolean().default(true),
  isPausable: z.boolean().default(true),
  isRenewable: z.boolean().default(true),
}).refine((input) => !input.endDate || !input.startDate || input.endDate >= input.startDate, {
  message: 'End date cannot be before start date',
  path: ['endDate'],
}).refine((input) => !input.autoCloseEnabled || (input.autoCloseAfterCount && input.autoCloseAfterUnit), {
  message: 'Auto-close duration is required when auto-close is enabled',
  path: ['autoCloseAfterCount'],
});

export const discountRuleSchema = z.object({
  name: z.string().min(2).max(120),
  code: z.string().max(50).optional(),
  discountType: z.enum(discountTypes),
  value: z.number().nonnegative(),
  minimumPurchase: z.number().nonnegative().optional(),
  minimumQuantity: z.number().int().min(1).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  limitUsageEnabled: z.boolean().default(false),
  usageLimit: z.number().int().min(1).optional(),
  scopeType: z.enum(discountScopeTypes),
  productIds: z.array(z.string().uuid()).max(100).optional(),
}).refine((input) => !input.endDate || !input.startDate || input.endDate >= input.startDate, {
  message: 'End date cannot be before start date',
  path: ['endDate'],
}).refine((input) => !input.limitUsageEnabled || input.usageLimit, {
  message: 'Usage limit is required when limited usage is enabled',
  path: ['usageLimit'],
}).refine((input) => input.scopeType !== 'selected_products' || Boolean(input.productIds?.length), {
  message: 'Select at least one product when the discount applies to selected products',
  path: ['productIds'],
});

export const taxRuleSchema = z.object({
  name: z.string().min(2).max(120),
  taxType: z.string().min(2).max(60).default('gst'),
  computation: z.enum(taxComputations),
  amount: z.number().nonnegative(),
  isInclusive: z.boolean().default(false),
});

export const createSubscriptionSchema = z.object({
  customerContactId: z.string().uuid(),
  salespersonUserId: z.string().uuid().optional(),
  recurringPlanId: z.string().uuid().optional(),
  quotationTemplateId: z.string().uuid().optional(),
  sourceChannel: z.enum(['admin', 'portal']).default('admin'),
  paymentTermLabel: z.string().max(120).optional(),
  discountCode: z.string().max(50).optional(),
  notes: z.string().max(4000).optional(),
  lines: z
    .array(
      z.object({
        productId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
        quantity: z.number().int().min(1),
        unitPrice: z.number().nonnegative(),
      }),
    )
    .min(1),
});

const optionalCheckoutAddressLineSchema = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().max(200).optional());

export const checkoutAddressSchema = z.object({
  line1: z.string().trim().min(1).max(200),
  line2: optionalCheckoutAddressLineSchema,
  city: z.string().trim().min(1).max(120),
  state: z.string().trim().min(1).max(120),
  postalCode: z.string().trim().min(1).max(20),
  country: z.string().trim().min(1).max(120),
});

export const portalCheckoutSchema = z.object({
  paymentMethod: z.string().min(2).max(60),
  discountCode: z.string().max(50).optional(),
  notes: z.string().max(4000).optional(),
  checkoutAddress: checkoutAddressSchema.optional(),
  lines: z
    .array(
      z.object({
        productId: z.string().uuid(),
        recurringPlanId: z.string().uuid().nullable().optional(),
        variantId: z.string().uuid().optional(),
        quantity: z.number().int().min(1),
      }),
    )
    .min(1),
});

export const portalCheckoutSummarySchema = z.object({
  discountCode: z.string().max(50).optional(),
  lines: portalCheckoutSchema.shape.lines,
});

export const createInvoiceSchema = z.object({
  subscriptionOrderId: z.string().uuid(),
  dueDate: z.coerce.date(),
  sourceLabel: z.string().max(120).default('Subscription Order'),
});

export const createInternalUserSchema = z.object({
  email: z.string().email(),
  password: signupSchema.shape.password,
  name: z.string().min(2).max(100),
  phone: z.string().max(32).optional(),
  address: z.string().max(500).optional(),
  role: z.enum(userRoles).refine((value) => value !== 'portal_user', {
    message: 'Use signup for portal users',
  }),
});
