import { z } from 'zod';
import { discountScopeTypes, discountTypes, intervalUnits, productTypes, userRoles, } from './enums';
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
export const productSchema = z.object({
    name: z.string().min(2).max(120),
    slug: z.string().min(2).max(140),
    description: z.string().max(5000).optional(),
    productType: z.enum(productTypes),
    baseSalesPrice: z.number().nonnegative(),
    costPrice: z.number().nonnegative(),
    categoryId: z.string().uuid().optional(),
    isSubscriptionEnabled: z.boolean().default(true),
    imageUrl: z.string().url().optional(),
});
export const recurringPlanSchema = z.object({
    name: z.string().min(2).max(120),
    intervalCount: z.number().int().min(1),
    intervalUnit: z.enum(intervalUnits),
    price: z.number().nonnegative(),
    minimumQuantity: z.number().int().min(1).default(1),
    autoCloseEnabled: z.boolean().default(false),
    autoCloseAfterCount: z.number().int().min(1).optional(),
    autoCloseAfterUnit: z.enum(intervalUnits).optional(),
    isClosable: z.boolean().default(true),
    isPausable: z.boolean().default(true),
    isRenewable: z.boolean().default(true),
});
export const discountRuleSchema = z.object({
    name: z.string().min(2).max(120),
    code: z.string().max(50).optional(),
    discountType: z.enum(discountTypes),
    value: z.number().nonnegative(),
    minimumPurchase: z.number().nonnegative().optional(),
    minimumQuantity: z.number().int().min(1).optional(),
    limitUsageEnabled: z.boolean().default(false),
    usageLimit: z.number().int().min(1).optional(),
    scopeType: z.enum(discountScopeTypes),
});
export const createSubscriptionSchema = z.object({
    customerContactId: z.string().uuid(),
    salespersonUserId: z.string().uuid().optional(),
    recurringPlanId: z.string().uuid().optional(),
    quotationTemplateId: z.string().uuid().optional(),
    sourceChannel: z.enum(['admin', 'portal']).default('admin'),
    paymentTermLabel: z.string().max(120).optional(),
    notes: z.string().max(4000).optional(),
    lines: z
        .array(z.object({
        productId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
        quantity: z.number().int().min(1),
        unitPrice: z.number().nonnegative(),
    }))
        .min(1),
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
    role: z.enum(userRoles).refine((value) => value !== 'portal_user', {
        message: 'Use signup for portal users',
    }),
});
