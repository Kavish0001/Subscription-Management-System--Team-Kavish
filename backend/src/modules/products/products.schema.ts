import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  productType: z.enum(['goods', 'service']).default('service'),
  baseSalesPrice: z.number().min(0),
  costPrice: z.number().min(0).default(0),
  categoryId: z.string().optional(),
  imageUrl: z.string().url().optional(),
  taxRuleIds: z.array(z.string()).optional(),
});

export const updateProductSchema = createProductSchema.partial();
