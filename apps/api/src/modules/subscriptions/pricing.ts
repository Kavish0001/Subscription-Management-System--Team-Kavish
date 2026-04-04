import { DiscountScopeType, DiscountType, Prisma, type PrismaClient } from '@prisma/client';

import { AppError } from '../../lib/errors.js';

type DbClient = Prisma.TransactionClient | PrismaClient;

type PricingLineInput = {
  productId: string;
  variantId?: string;
  quantity: number;
};

type ComputedLine = {
  productId: string;
  variantId?: string;
  productNameSnapshot: string;
  quantity: number;
  unitPrice: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
  sortOrder: number;
};

type PricingResult = {
  lines: ComputedLine[];
  subtotalAmount: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  appliedDiscountRuleId: string | null;
};

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function toDecimal(value: number) {
  return new Prisma.Decimal(roundCurrency(value));
}

function resolveDiscountValue(type: DiscountType, value: number, eligibleSubtotal: number) {
  if (type === DiscountType.percentage) {
    return roundCurrency((eligibleSubtotal * value) / 100);
  }

  return roundCurrency(Math.min(value, eligibleSubtotal));
}

export async function buildSubscriptionPricing(
  db: DbClient,
  input: {
    recurringPlanId?: string | null;
    discountCode?: string;
    lines: PricingLineInput[];
  },
): Promise<PricingResult> {
  const productIds = [...new Set(input.lines.map((line) => line.productId))];
  const variantIds = [...new Set(input.lines.map((line) => line.variantId).filter(Boolean) as string[])];

  const [products, variants, discountRule] = await Promise.all([
    db.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true
      },
      include: {
        planPricing: true,
        productTaxRules: {
          include: {
            taxRule: true
          }
        }
      }
    }),
    variantIds.length > 0
      ? db.productVariant.findMany({
          where: {
            id: { in: variantIds },
            isActive: true
          }
        })
      : Promise.resolve([]),
    input.discountCode
      ? db.discountRule.findFirst({
          where: {
            code: input.discountCode.trim().toUpperCase(),
            isActive: true
          },
          include: {
            products: true
          }
        })
      : Promise.resolve(null)
  ]);

  if (products.length !== productIds.length) {
    throw new AppError('One or more products could not be found', 404, 'PRODUCT_NOT_FOUND');
  }

  const productsById = new Map(products.map((product) => [product.id, product]));
  const variantsById = new Map(variants.map((variant) => [variant.id, variant]));

  const preparedLines = input.lines.map((line, index) => {
    const product = productsById.get(line.productId);
    if (!product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    const variant = line.variantId ? variantsById.get(line.variantId) : null;
    if (line.variantId && (!variant || variant.productId !== product.id)) {
      throw new AppError('Selected variant is invalid for the product', 400, 'INVALID_VARIANT');
    }

    const baseUnitPrice = Number(
      product.planPricing.find((pricing) => pricing.recurringPlanId === input.recurringPlanId)?.overridePrice ??
        product.baseSalesPrice
    );
    const variantDelta = Number(variant?.priceOverride ?? 0);
    const unitPrice = roundCurrency(baseUnitPrice + variantDelta);
    const lineSubtotal = roundCurrency(unitPrice * line.quantity);
    const taxRules = product.productTaxRules.map((productTaxRule) => ({
      id: productTaxRule.taxRuleId,
      computation: productTaxRule.taxRule.computation,
      amount: Number(productTaxRule.taxRule.ratePercent)
    }));

    const percentageTaxRate = taxRules.reduce(
      (sum, taxRule) => sum + (taxRule.computation === 'percentage' ? taxRule.amount : 0),
      0,
    );
    const fixedTaxAmount = taxRules.reduce(
      (sum, taxRule) => sum + (taxRule.computation === 'fixed' ? taxRule.amount * line.quantity : 0),
      0,
    );

    return {
      index,
      input: line,
      product,
      unitPrice,
      lineSubtotal,
      percentageTaxRate,
      fixedTaxAmount
    };
  });

  const subtotal = roundCurrency(preparedLines.reduce((sum, line) => sum + line.lineSubtotal, 0));
  let appliedDiscountRuleId: string | null = null;
  let eligibleLineIndexes = new Set<number>();
  let totalDiscount = 0;

  if (discountRule) {
    const now = new Date();
    const selectedProductIds = new Set(discountRule.products.map((entry) => entry.productId));
    const eligibleLines = preparedLines.filter((line) => {
      if (discountRule.startDate && discountRule.startDate > now) {
        return false;
      }

      if (discountRule.endDate && discountRule.endDate < now) {
        return false;
      }

      if (discountRule.limitUsageEnabled && discountRule.usageLimit !== null && discountRule.usageCount >= discountRule.usageLimit) {
        return false;
      }

      if (discountRule.scopeType === DiscountScopeType.selected_products) {
        return selectedProductIds.has(line.product.id);
      }

      return true;
    });

    const eligibleSubtotal = roundCurrency(eligibleLines.reduce((sum, line) => sum + line.lineSubtotal, 0));
    const eligibleQuantity = eligibleLines.reduce((sum, line) => sum + line.input.quantity, 0);

    if (
      eligibleLines.length > 0 &&
      eligibleSubtotal > 0 &&
      (discountRule.minimumPurchase === null || eligibleSubtotal >= Number(discountRule.minimumPurchase)) &&
      (discountRule.minimumQuantity === null || eligibleQuantity >= discountRule.minimumQuantity)
    ) {
      eligibleLineIndexes = new Set(eligibleLines.map((line) => line.index));
      totalDiscount = resolveDiscountValue(
        discountRule.discountType,
        Number(discountRule.value),
        eligibleSubtotal,
      );
      appliedDiscountRuleId = discountRule.id;
    }
  }

  const eligibleSubtotal = roundCurrency(
    preparedLines
      .filter((line) => eligibleLineIndexes.has(line.index))
      .reduce((sum, line) => sum + line.lineSubtotal, 0),
  );
  const eligibleIndexList = preparedLines
    .filter((line) => eligibleLineIndexes.has(line.index))
    .map((line) => line.index);
  const lastEligibleIndex = eligibleIndexList[eligibleIndexList.length - 1] ?? -1;

  let remainingDiscount = totalDiscount;
  const lines = preparedLines.map((line) => {
    const isEligible = eligibleLineIndexes.has(line.index);
    const proportionalDiscount =
      !isEligible || eligibleSubtotal === 0
        ? 0
        : line.index === lastEligibleIndex
          ? remainingDiscount
          : roundCurrency((line.lineSubtotal / eligibleSubtotal) * totalDiscount);
    const safeDiscount = Math.min(line.lineSubtotal, proportionalDiscount);
    remainingDiscount = roundCurrency(remainingDiscount - safeDiscount);

    const taxableBase = roundCurrency(line.lineSubtotal - safeDiscount);
    const taxAmount = roundCurrency(((taxableBase * line.percentageTaxRate) / 100) + line.fixedTaxAmount);
    const lineTotal = roundCurrency(taxableBase + taxAmount);

    return {
      productId: line.product.id,
      variantId: line.input.variantId,
      productNameSnapshot: line.product.name,
      quantity: line.input.quantity,
      unitPrice: toDecimal(line.unitPrice),
      discountAmount: toDecimal(safeDiscount),
      taxAmount: toDecimal(taxAmount),
      lineTotal: toDecimal(lineTotal),
      sortOrder: line.index
    };
  });

  const discountAmount = roundCurrency(lines.reduce((sum, line) => sum + Number(line.discountAmount), 0));
  const taxAmount = roundCurrency(lines.reduce((sum, line) => sum + Number(line.taxAmount), 0));
  const totalAmount = roundCurrency(subtotal - discountAmount + taxAmount);

  return {
    lines,
    subtotalAmount: toDecimal(subtotal),
    discountAmount: toDecimal(discountAmount),
    taxAmount: toDecimal(taxAmount),
    totalAmount: toDecimal(totalAmount),
    appliedDiscountRuleId
  };
}
