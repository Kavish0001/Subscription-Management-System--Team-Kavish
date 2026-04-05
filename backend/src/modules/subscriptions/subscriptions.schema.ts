import { z } from 'zod';

export const createSubscriptionSchema = z.object({
  customerContactId: z.string().min(1),
  recurringPlanId: z.string().optional(),
  quotationTemplateId: z.string().optional(),
  paymentTermId: z.string().optional(),
  expirationDate: z.string().optional(),
  startDate: z.string().optional(),
  sourceChannel: z.string().optional(),
  salesperson: z.string().optional(),
  notes: z.string().optional(),
  discountCode: z.string().optional(),
  lines: z.array(z.object({
    productId: z.string().min(1),
    variantId: z.string().optional(),
    productNameSnapshot: z.string().default(''),
    quantity: z.coerce.number().positive(),
    unitPrice: z.coerce.number().min(0),
    discountAmount: z.coerce.number().min(0).default(0),
  })).default([]),
});

export const updateSubscriptionSchema = z.object({
  recurringPlanId: z.string().optional(),
  quotationTemplateId: z.string().optional(),
  paymentTermId: z.string().optional(),
  expirationDate: z.string().optional(),
  startDate: z.string().optional(),
  sourceChannel: z.string().optional(),
  salesperson: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
