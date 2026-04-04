import { DiscountScopeType, DiscountType, TaxComputation } from '@prisma/client';

import { buildSubscriptionPricing } from './pricing.js';
import type { AppError } from '../../lib/errors.js';

type PricingProduct = {
  id: string;
  name: string;
  baseSalesPrice: number;
  planPricing: Array<{ recurringPlanId: string; overridePrice: number }>;
  productTaxRules: Array<{ taxRule: { ratePercent: number; computation: TaxComputation } }>;
};

type PricingVariant = {
  id: string;
  productId: string;
  priceOverride: number;
};

type DiscountRuleRecord = {
  id: string;
  code: string;
  isActive: boolean;
  discountType: DiscountType;
  value: number;
  minimumPurchase: number | null;
  minimumQuantity: number | null;
  limitUsageEnabled: boolean;
  usageLimit: number | null;
  usageCount: number;
  startDate: Date | null;
  endDate: Date | null;
  scopeType: DiscountScopeType;
  products: Array<{ productId: string }>;
};

function createDbMock({
  products,
  variants = [],
  discountRule = null
}: {
  products: PricingProduct[];
  variants?: PricingVariant[];
  discountRule?: DiscountRuleRecord | null;
}) {
  return {
    product: {
      findMany: vi.fn().mockResolvedValue(products)
    },
    productVariant: {
      findMany: vi.fn().mockResolvedValue(variants)
    },
    discountRule: {
      findFirst: vi.fn().mockResolvedValue(discountRule)
    }
  };
}

describe('buildSubscriptionPricing', () => {
  it('computes subtotal, discount, tax, and total for eligible products', async () => {
    const db = createDbMock({
      products: [
        {
          id: 'product-1',
          name: 'Core ERP',
          baseSalesPrice: 100,
          planPricing: [],
          productTaxRules: [{ taxRule: { ratePercent: 18, computation: TaxComputation.percentage } }]
        },
        {
          id: 'product-2',
          name: 'Add-on Analytics',
          baseSalesPrice: 50,
          planPricing: [],
          productTaxRules: []
        }
      ],
      discountRule: {
        id: 'discount-1',
        code: 'WELCOME10',
        isActive: true,
        discountType: DiscountType.percentage,
        value: 10,
        minimumPurchase: null,
        minimumQuantity: null,
        limitUsageEnabled: false,
        usageLimit: null,
        usageCount: 0,
        startDate: null,
        endDate: null,
        scopeType: DiscountScopeType.selected_products,
        products: [{ productId: 'product-1' }]
      }
    });

    const result = await buildSubscriptionPricing(db, {
      discountCode: 'welcome10',
      lines: [
        { productId: 'product-1', quantity: 2 },
        { productId: 'product-2', quantity: 1 }
      ]
    });

    expect(Number(result.subtotalAmount)).toBe(250);
    expect(Number(result.discountAmount)).toBe(20);
    expect(Number(result.taxAmount)).toBe(32.4);
    expect(Number(result.totalAmount)).toBe(262.4);
    expect(result.appliedDiscountRuleId).toBe('discount-1');
    expect(result.lines).toHaveLength(2);
    expect(Number(result.lines[0].discountAmount)).toBe(20);
    expect(Number(result.lines[0].taxAmount)).toBe(32.4);
    expect(Number(result.lines[1].discountAmount)).toBe(0);
  });

  it('rejects variants that do not belong to the selected product', async () => {
    const db = createDbMock({
      products: [
        {
          id: 'product-1',
          name: 'Core ERP',
          baseSalesPrice: 100,
          planPricing: [],
          productTaxRules: []
        }
      ],
      variants: [
        {
          id: 'variant-1',
          productId: 'product-2',
          priceOverride: 25
        }
      ]
    });

    await expect(
      buildSubscriptionPricing(db, {
        lines: [{ productId: 'product-1', variantId: 'variant-1', quantity: 1 }]
      })
    ).rejects.toMatchObject<AppError>({
      message: 'Selected variant is invalid for the product',
      code: 'INVALID_VARIANT'
    });
  });
});
