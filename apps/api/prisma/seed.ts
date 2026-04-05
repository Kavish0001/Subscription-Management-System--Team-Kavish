import 'dotenv/config';

import {
  DiscountScopeType,
  DiscountType,
  InvoiceStatus,
  PaymentStatus,
  Prisma,
  PrismaClient,
  ProductType,
  RelationType,
  SourceChannel,
  SubscriptionStatus,
  UserRole,
  type IntervalUnit,
} from '@prisma/client';
import argon2 from 'argon2';

import { addInterval, defaultQuotationExpiry, resolveAutoCloseDate } from '../src/modules/subscriptions/lifecycle.js';
import { buildSubscriptionPricing } from '../src/modules/subscriptions/pricing.js';

const prisma = new PrismaClient();
const PRODUCT_COUNT = clampCount(process.env.SEED_PRODUCT_COUNT, 240, 200, 300);
const MARK = {
  product: 'seed-',
  plan: 'Seed ',
  template: 'Seed ',
  discount: 'SEED',
  subscription: 'SEED-SUB-',
  invoice: 'SEED-INV-',
  payment: 'SEED-PAY-',
};

const cities = [
  ['Ahmedabad', 'Gujarat', '380001'],
  ['Bengaluru', 'Karnataka', '560001'],
  ['Chennai', 'Tamil Nadu', '600001'],
  ['Delhi', 'Delhi', '110001'],
  ['Hyderabad', 'Telangana', '500001'],
  ['Jaipur', 'Rajasthan', '302001'],
  ['Kolkata', 'West Bengal', '700001'],
  ['Mumbai', 'Maharashtra', '400001'],
  ['Pune', 'Maharashtra', '411001'],
] as const;

const labels = [
  'Atlas',
  'Beacon',
  'Cobalt',
  'Drift',
  'Elevate',
  'Flare',
  'Glide',
  'Harbor',
  'Ignite',
  'Jade',
  'Keystone',
  'Lumen',
  'Momentum',
  'Orbit',
  'Pulse',
  'Quartz',
  'Rally',
  'Summit',
  'Trail',
  'Unity',
  'Vantage',
  'Wave',
  'Zenith',
];

const contactLabels = ['Nexus', 'Orbit', 'Harbor', 'Vertex', 'Drift', 'Signal', 'Atlas', 'Lumen', 'Summit', 'Keystone', 'Quartz', 'Pulse'];

const attributeDefs = [
  ['Color', [['Charcoal', 0], ['Crimson', 149], ['Azure', 199], ['Forest', 249], ['Pearl', 299]]],
  ['Size', [['Compact', 0], ['Mid', 249], ['Large', 499], ['XL', 799]]],
  ['Seat Pack', [['5 Users', 0], ['10 Users', 899], ['25 Users', 2199], ['50 Users', 4899]]],
  ['Support SLA', [['Standard', 0], ['Priority', 1299], ['24x7', 2899]]],
  ['Storage', [['128 GB', 0], ['256 GB', 399], ['512 GB', 999], ['1 TB', 1899]]],
  ['Finish', [['Matte', 0], ['Satin', 149], ['Gloss', 199]]],
  ['Region', [['India', 0], ['APAC', 699], ['Global', 1699]]],
  ['Edition', [['Starter', 0], ['Growth', 999], ['Scale', 2499], ['Enterprise', 5499]]],
  ['Duration', [['3 Month', 0], ['6 Month', 699], ['12 Month', 1299]]],
  ['Voltage', [['110V', 0], ['220V', 99], ['Universal', 249]]],
] as const;

const planDefs = [
  { name: 'Seed Monthly Core', intervalCount: 1, intervalUnit: 'month' as const, price: 999, minimumQuantity: 1, isClosable: true, isPausable: true, isRenewable: true },
  { name: 'Seed Quarterly Growth', intervalCount: 3, intervalUnit: 'month' as const, price: 2799, minimumQuantity: 3, isClosable: true, isPausable: true, isRenewable: true },
  { name: 'Seed Annual Commit', intervalCount: 1, intervalUnit: 'year' as const, price: 9999, minimumQuantity: 1, isClosable: true, isPausable: true, isRenewable: true },
  { name: 'Seed Weekly Rental', intervalCount: 1, intervalUnit: 'week' as const, price: 349, minimumQuantity: 1, autoCloseEnabled: true, autoCloseAfterCount: 12, autoCloseAfterUnit: 'week' as const, isClosable: true, isPausable: false, isRenewable: true },
  { name: 'Seed Monthly Enterprise', intervalCount: 1, intervalUnit: 'month' as const, price: 4999, minimumQuantity: 5, isClosable: true, isPausable: true, isRenewable: true },
  { name: 'Seed Annual Enterprise', intervalCount: 1, intervalUnit: 'year' as const, price: 49999, minimumQuantity: 10, isClosable: false, isPausable: true, isRenewable: true },
];

const termDefs = [
  ['Immediate payment', 'Collected at confirmation time.', 0],
  ['Net 7', 'Payment due within seven days.', 7],
  ['Net 15', 'Payment due within fifteen days.', 15],
  ['Net 30', 'Payment due within thirty days.', 30],
  ['50% advance', 'Collect half upfront and the balance after activation.', 0],
] as const;

const taxDefs = [
  { name: 'GST 18%', ratePercent: 18, computation: 'percentage' as const, taxType: 'gst', isInclusive: false },
  { name: 'GST 12%', ratePercent: 12, computation: 'percentage' as const, taxType: 'gst', isInclusive: false },
  { name: 'Platform Fee 5%', ratePercent: 5, computation: 'percentage' as const, taxType: 'service_fee', isInclusive: false },
  { name: 'Eco Fee Rs 49', ratePercent: 49, computation: 'fixed' as const, taxType: 'eco_fee', isInclusive: false },
];

const categories = [
  { key: 'digital-workspaces', name: 'Digital Workspaces', type: ProductType.service, base: 1499, nouns: ['Workspace Suite', 'Workflow Hub', 'Ops Console', 'Collab Desk'], attrs: ['Seat Pack', 'Support SLA', 'Edition', 'Region'], plans: ['Seed Monthly Core', 'Seed Quarterly Growth', 'Seed Annual Commit'], taxes: ['GST 18%', 'Platform Fee 5%'] },
  { key: 'field-services', name: 'Field Services', type: ProductType.service, base: 1899, nouns: ['Service Route', 'Inspection Loop', 'Dispatch Flow', 'Coverage Pack'], attrs: ['Support SLA', 'Region', 'Duration', 'Edition'], plans: ['Seed Monthly Core', 'Seed Quarterly Growth', 'Seed Annual Commit'], taxes: ['GST 18%'] },
  { key: 'retail-hardware', name: 'Retail Hardware', type: ProductType.goods, base: 2299, nouns: ['POS Kit', 'Shelf Sensor', 'Display Dock', 'Checkout Pad'], attrs: ['Color', 'Storage', 'Voltage', 'Finish'], plans: ['Seed Weekly Rental', 'Seed Monthly Core', 'Seed Annual Commit'], taxes: ['GST 12%', 'Eco Fee Rs 49'] },
  { key: 'industrial-equipment', name: 'Industrial Equipment', type: ProductType.goods, base: 3899, nouns: ['Torque Set', 'Safety Module', 'Sensor Array', 'Power Cradle'], attrs: ['Voltage', 'Size', 'Finish', 'Color'], plans: ['Seed Weekly Rental', 'Seed Monthly Core', 'Seed Monthly Enterprise'], taxes: ['GST 18%', 'Eco Fee Rs 49'] },
  { key: 'wellness-memberships', name: 'Wellness Memberships', type: ProductType.service, base: 999, nouns: ['Care Program', 'Recovery Track', 'Clinic Circle', 'Vitality Pass'], attrs: ['Edition', 'Duration', 'Region', 'Support SLA'], plans: ['Seed Monthly Core', 'Seed Quarterly Growth', 'Seed Annual Commit'], taxes: ['GST 18%'] },
  { key: 'studio-merch', name: 'Studio Merch', type: ProductType.goods, base: 1299, nouns: ['Creator Pack', 'Launch Crate', 'Studio Case', 'Maker Box'], attrs: ['Color', 'Size', 'Finish', 'Storage'], plans: ['Seed Monthly Core', 'Seed Annual Commit'], taxes: ['GST 12%'] },
  { key: 'analytics-suites', name: 'Analytics Suites', type: ProductType.service, base: 2599, nouns: ['Insight Studio', 'Forecast Board', 'Signal Stack', 'Decision Grid'], attrs: ['Seat Pack', 'Edition', 'Region', 'Support SLA'], plans: ['Seed Monthly Core', 'Seed Quarterly Growth', 'Seed Annual Enterprise'], taxes: ['GST 18%', 'Platform Fee 5%'] },
  { key: 'smart-office', name: 'Smart Office', type: ProductType.goods, base: 2799, nouns: ['Desk Node', 'Room Hub', 'Meeting Slate', 'Signal Lamp'], attrs: ['Color', 'Storage', 'Voltage', 'Size'], plans: ['Seed Weekly Rental', 'Seed Monthly Core', 'Seed Annual Commit'], taxes: ['GST 12%', 'Eco Fee Rs 49'] },
];

const categoryThemes: Record<string, { bg: string; bgSoft: string; accent: string; ink: string }> = {
  'digital-workspaces': { bg: '#0f172a', bgSoft: '#1d4ed8', accent: '#38bdf8', ink: '#f8fafc' },
  'field-services': { bg: '#172554', bgSoft: '#0f766e', accent: '#5eead4', ink: '#ecfeff' },
  'retail-hardware': { bg: '#3f1d2e', bgSoft: '#ea580c', accent: '#fdba74', ink: '#fff7ed' },
  'industrial-equipment': { bg: '#292524', bgSoft: '#57534e', accent: '#fbbf24', ink: '#fffbeb' },
  'wellness-memberships': { bg: '#164e63', bgSoft: '#0f766e', accent: '#86efac', ink: '#f0fdfa' },
  'studio-merch': { bg: '#4c1d95', bgSoft: '#be185d', accent: '#f9a8d4', ink: '#fdf2f8' },
  'analytics-suites': { bg: '#111827', bgSoft: '#2563eb', accent: '#a78bfa', ink: '#eef2ff' },
  'smart-office': { bg: '#0c4a6e', bgSoft: '#0284c7', accent: '#67e8f9', ink: '#ecfeff' },
};

const mod = <T>(items: readonly T[], index: number) => items[index % items.length];
const money = (value: number) => new Prisma.Decimal(Math.round(value * 100) / 100);
const clampMoney = (value: number) => Math.round(value * 100) / 100;
const planPrice = (name: string, base: number) =>
  clampMoney({
    'Seed Weekly Rental': base * 0.34,
    'Seed Monthly Core': base,
    'Seed Quarterly Growth': base * 2.82,
    'Seed Annual Commit': base * 10.4,
    'Seed Monthly Enterprise': base * 1.7,
    'Seed Annual Enterprise': base * 15.6,
  }[name] ?? base);

const svgUrl = (svg: string) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

function mediaUrls(categoryKey: string, name: string, slug: string, count: number) {
  const theme = categoryThemes[categoryKey] ?? { bg: '#0f172a', bgSoft: '#334155', accent: '#38bdf8', ink: '#f8fafc' };
  const safeName = name.replace(/[&<>"']/g, '');
  const shortName = safeName.length > 24 ? `${safeName.slice(0, 24)}...` : safeName;
  const code = slug.replace(/^seed-/, '').slice(0, 18).toUpperCase();

  return Array.from({ length: count }, (_, index) => {
    const shift = 80 + index * 90;
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${theme.bg}"/>
            <stop offset="100%" stop-color="${theme.bgSoft}"/>
          </linearGradient>
          <linearGradient id="panel" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="${theme.accent}" stop-opacity="0.9"/>
            <stop offset="100%" stop-color="${theme.ink}" stop-opacity="0.08"/>
          </linearGradient>
        </defs>
        <rect width="1200" height="900" fill="url(#bg)"/>
        <circle cx="${220 + shift}" cy="160" r="180" fill="${theme.accent}" opacity="0.16"/>
        <circle cx="${960 - shift / 2}" cy="740" r="220" fill="${theme.ink}" opacity="0.08"/>
        <rect x="86" y="94" width="1028" height="712" rx="38" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.16)"/>
        <rect x="138" y="154" width="924" height="184" rx="28" fill="url(#panel)"/>
        <rect x="138" y="384" width="440" height="254" rx="28" fill="rgba(255,255,255,0.08)"/>
        <rect x="614" y="384" width="448" height="116" rx="28" fill="rgba(255,255,255,0.08)"/>
        <rect x="614" y="530" width="448" height="108" rx="28" fill="rgba(255,255,255,0.08)"/>
        <text x="148" y="132" fill="${theme.ink}" font-family="Segoe UI, Arial, sans-serif" font-size="30" font-weight="700" letter-spacing="2">SEEDED PRODUCT VISUAL</text>
        <text x="172" y="240" fill="${theme.ink}" font-family="Segoe UI, Arial, sans-serif" font-size="58" font-weight="800">${shortName}</text>
        <text x="172" y="294" fill="${theme.ink}" opacity="0.88" font-family="Segoe UI, Arial, sans-serif" font-size="26">${categoryKey.replace(/-/g, ' ').toUpperCase()}</text>
        <text x="172" y="438" fill="${theme.ink}" font-family="Segoe UI, Arial, sans-serif" font-size="24" font-weight="700">MEDIA ${index + 1}</text>
        <text x="172" y="486" fill="${theme.ink}" opacity="0.85" font-family="Segoe UI, Arial, sans-serif" font-size="20">Catalog preview art generated by the seed script.</text>
        <text x="172" y="524" fill="${theme.ink}" opacity="0.85" font-family="Segoe UI, Arial, sans-serif" font-size="20">This guarantees visible images in admin and portal views.</text>
        <text x="172" y="594" fill="${theme.accent}" font-family="Segoe UI, Arial, sans-serif" font-size="28" font-weight="800">${code}</text>
        <text x="648" y="436" fill="${theme.ink}" font-family="Segoe UI, Arial, sans-serif" font-size="22" font-weight="700">Seeded image gallery</text>
        <text x="648" y="472" fill="${theme.ink}" opacity="0.85" font-family="Segoe UI, Arial, sans-serif" font-size="18">Used for product cards, detail pages, checkout, and admin forms.</text>
        <text x="648" y="582" fill="${theme.ink}" font-family="Segoe UI, Arial, sans-serif" font-size="20">Variant-ready. Subscription-ready. Always available.</text>
      </svg>
    `;
    return svgUrl(svg);
  });
}

function clampCount(raw: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.trunc(parsed))) : fallback;
}

function addressRows(index: number) {
  const [city, state, postalCode] = mod(cities, index);
  return [
    { type: 'billing' as const, line1: `${100 + index} Seed Avenue`, city, state, postalCode, country: 'India', isDefault: true },
    { type: 'shipping' as const, line1: `${200 + index} Delivery Street`, city, state, postalCode, country: 'India', isDefault: true },
  ];
}

async function cleanup() {
  await prisma.payment.deleteMany({ where: { paymentReference: { startsWith: MARK.payment } } });
  await prisma.invoice.deleteMany({ where: { invoiceNumber: { startsWith: MARK.invoice } } });
  await prisma.subscriptionOrder.deleteMany({ where: { subscriptionNumber: { startsWith: MARK.subscription } } });
  await prisma.quotationTemplate.deleteMany({ where: { name: { startsWith: MARK.template } } });
  await prisma.discountRule.deleteMany({ where: { OR: [{ code: { startsWith: MARK.discount } }, { name: { startsWith: MARK.template } }] } });
  await prisma.product.deleteMany({ where: { slug: { startsWith: MARK.product } } });
  await prisma.productCategory.deleteMany({ where: { slug: { startsWith: MARK.product } } });
  await prisma.recurringPlan.deleteMany({ where: { name: { startsWith: MARK.plan } } });
}

async function ensureUser(input: {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  phone?: string;
  address?: string;
  emailVerifiedAt?: Date | null;
}) {
  const email = input.email.toLowerCase();
  const passwordHash = await argon2.hash(input.password);
  const existing = await prisma.user.findUnique({
    where: { email },
    include: { contacts: { include: { addresses: true }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] } },
  });
  const user = existing
    ? await prisma.user.update({ where: { id: existing.id }, data: { email, passwordHash, name: input.name, role: input.role, phone: input.phone ?? null, address: input.address ?? null, isActive: true, emailVerifiedAt: input.emailVerifiedAt ?? null } })
    : await prisma.user.create({ data: { email, passwordHash, name: input.name, role: input.role, phone: input.phone ?? null, address: input.address ?? null, emailVerifiedAt: input.emailVerifiedAt ?? null } });
  const contact = existing?.contacts[0]
    ? await prisma.contact.update({ where: { id: existing.contacts[0].id }, data: { userId: user.id, name: input.name, email, phone: input.phone ?? null, address: input.address ?? null, isDefault: true, isActive: true }, include: { addresses: true } })
    : await prisma.contact.create({ data: { userId: user.id, name: input.name, email, phone: input.phone ?? null, address: input.address ?? null, isDefault: true, addresses: { create: addressRows(email.length) } }, include: { addresses: true } });
  if (contact.addresses.length === 0) await prisma.address.createMany({ data: addressRows(email.length).map((row) => ({ contactId: contact.id, ...row })) });
  await prisma.contact.updateMany({ where: { userId: user.id, id: { not: contact.id }, isDefault: true }, data: { isDefault: false } });
  return prisma.user.update({ where: { id: user.id }, data: { defaultContactId: contact.id }, select: { id: true, email: true, role: true, defaultContactId: true } });
}

async function ensureContact(input: {
  email: string;
  name: string;
  index: number;
  userId?: string;
  createdById?: string;
  phone?: string;
  address?: string;
  companyName?: string;
  notes?: string;
}) {
  const email = input.email.toLowerCase();
  const existing = await prisma.contact.findFirst({ where: { email, ...(input.userId ? { userId: input.userId } : {}) } });
  const contact = existing
    ? await prisma.contact.update({ where: { id: existing.id }, data: { userId: input.userId ?? null, createdById: input.createdById ?? null, name: input.name, email, phone: input.phone ?? null, address: input.address ?? null, companyName: input.companyName ?? null, notes: input.notes ?? null, isActive: true } })
    : await prisma.contact.create({ data: { userId: input.userId ?? null, createdById: input.createdById ?? null, name: input.name, email, phone: input.phone ?? null, address: input.address ?? null, companyName: input.companyName ?? null, notes: input.notes ?? null, addresses: { create: addressRows(input.index) } } });
  const count = await prisma.address.count({ where: { contactId: contact.id } });
  if (count === 0) await prisma.address.createMany({ data: addressRows(input.index).map((row) => ({ contactId: contact.id, ...row })) });
  return prisma.contact.findUniqueOrThrow({ where: { id: contact.id }, select: { id: true, userId: true, name: true, email: true } });
}

async function ensureAttribute(name: string, values: ReadonlyArray<readonly [string, number]>) {
  const existing = await prisma.productAttribute.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
    include: { values: true },
  });
  const attribute = existing
    ? await prisma.productAttribute.update({ where: { id: existing.id }, data: { name, isActive: true } })
    : await prisma.productAttribute.create({ data: { name, isActive: true } });
  const saved = [];
  for (const [value, extraPrice] of values) {
    const match = existing?.values.find((entry) => entry.value.toLowerCase() === value.toLowerCase());
    saved.push(
      match
        ? await prisma.productAttributeValue.update({ where: { id: match.id }, data: { value, extraPrice: money(extraPrice), isActive: true } })
        : await prisma.productAttributeValue.create({ data: { attributeId: attribute.id, value, extraPrice: money(extraPrice), isActive: true } }),
    );
  }
  return { id: attribute.id, name, values: saved };
}

async function ensurePlan(def: (typeof planDefs)[number]) {
  return prisma.recurringPlan.create({
    data: {
      name: def.name,
      intervalCount: def.intervalCount,
      intervalUnit: def.intervalUnit,
      price: money(def.price),
      minimumQuantity: def.minimumQuantity,
      autoCloseEnabled: def.autoCloseEnabled ?? false,
      autoCloseAfterCount: def.autoCloseEnabled ? def.autoCloseAfterCount ?? null : null,
      autoCloseAfterUnit: def.autoCloseEnabled ? (def.autoCloseAfterUnit as IntervalUnit | undefined) ?? null : null,
      isClosable: def.isClosable,
      isPausable: def.isPausable,
      isRenewable: def.isRenewable,
      isActive: true,
    },
  });
}

async function ensureTerm(name: string, description: string, dueDays: number) {
  const existing = await prisma.paymentTerm.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
  return existing
    ? prisma.paymentTerm.update({ where: { id: existing.id }, data: { name, description, dueDays, isActive: true } })
    : prisma.paymentTerm.create({ data: { name, description, dueDays, isActive: true } });
}

async function ensureTax(def: (typeof taxDefs)[number]) {
  const existing = await prisma.taxRule.findFirst({ where: { name: { equals: def.name, mode: 'insensitive' } } });
  return existing
    ? prisma.taxRule.update({ where: { id: existing.id }, data: { name: def.name, ratePercent: money(def.ratePercent), computation: def.computation, taxType: def.taxType, isInclusive: def.isInclusive, isActive: true } })
    : prisma.taxRule.create({ data: { name: def.name, ratePercent: money(def.ratePercent), computation: def.computation, taxType: def.taxType, isInclusive: def.isInclusive, isActive: true } });
}

async function createSeedSubscription(input: {
  subscriptionNumber: string;
  customerContactId: string;
  salespersonUserId: string;
  recurringPlanId: string;
  sourceChannel: SourceChannel;
  status: SubscriptionStatus;
  paymentTermLabel: string;
  productId: string;
  variantId?: string;
  quantity: number;
  quotationTemplateId?: string;
  relationType?: RelationType;
  parentOrderId?: string;
  discountCode?: string;
  quotationDays?: number;
  expiryDays?: number;
  confirmedDays?: number;
  startDays?: number;
  nextInvoiceDays?: number;
  expirationDays?: number;
  notes?: string;
}) {
  const now = new Date();
  const recurringPlan = await prisma.recurringPlan.findUniqueOrThrow({ where: { id: input.recurringPlanId } });
  const pricing = await buildSubscriptionPricing(prisma, {
    recurringPlanId: input.recurringPlanId,
    discountCode: input.discountCode,
    lines: [{ productId: input.productId, variantId: input.variantId, quantity: input.quantity }],
  });
  const quotationDate = input.quotationDays === undefined ? null : addInterval(now, input.quotationDays, 'day');
  const startDate = input.startDays === undefined ? null : addInterval(now, input.startDays, 'day');
  const subscription = await prisma.subscriptionOrder.create({
    data: {
      subscriptionNumber: input.subscriptionNumber,
      customerContactId: input.customerContactId,
      salespersonUserId: input.salespersonUserId,
      quotationTemplateId: input.quotationTemplateId,
      recurringPlanId: input.recurringPlanId,
      parentOrderId: input.parentOrderId ?? null,
      relationType: input.relationType ?? null,
      sourceChannel: input.sourceChannel,
      status: input.status,
      quotationDate,
      quotationExpiresAt: input.expiryDays === undefined ? (quotationDate ? defaultQuotationExpiry(quotationDate) : null) : addInterval(now, input.expiryDays, 'day'),
      confirmedAt: input.confirmedDays === undefined ? null : addInterval(now, input.confirmedDays, 'day'),
      startDate,
      nextInvoiceDate: input.nextInvoiceDays === undefined ? null : addInterval(now, input.nextInvoiceDays, 'day'),
      expirationDate: input.expirationDays === undefined ? (startDate ? resolveAutoCloseDate({ startDate, autoCloseEnabled: recurringPlan.autoCloseEnabled, autoCloseAfterCount: recurringPlan.autoCloseAfterCount, autoCloseAfterUnit: recurringPlan.autoCloseAfterUnit }) : null) : addInterval(now, input.expirationDays, 'day'),
      paymentTermLabel: input.paymentTermLabel,
      subtotalAmount: pricing.subtotalAmount,
      discountAmount: pricing.discountAmount,
      taxAmount: pricing.taxAmount,
      totalAmount: pricing.totalAmount,
      notes: input.notes,
      lines: { create: pricing.lines },
    },
  });
  if (input.parentOrderId && input.relationType === RelationType.renewal) await prisma.subscriptionOrder.update({ where: { id: input.parentOrderId }, data: { renewalCount: { increment: 1 } } });
  if (input.parentOrderId && input.relationType === RelationType.upsell) await prisma.subscriptionOrder.update({ where: { id: input.parentOrderId }, data: { upsellCount: { increment: 1 } } });
  return subscription;
}

async function createSeedInvoice(input: {
  invoiceNumber: string;
  subscriptionId: string;
  status: InvoiceStatus;
  invoiceDays: number;
  dueDays: number;
  sourceLabel: string;
  payment?: { reference: string; method: string; provider: string; status: PaymentStatus; paidDays?: number; tx?: string };
}) {
  const now = new Date();
  const subscription = await prisma.subscriptionOrder.findUniqueOrThrow({ where: { id: input.subscriptionId }, include: { lines: { orderBy: { sortOrder: 'asc' } } } });
  const paidAmount = input.status === InvoiceStatus.paid ? subscription.totalAmount : money(0);
  const amountDue = input.status === InvoiceStatus.paid ? money(0) : subscription.totalAmount;
  const paidAt = input.status === InvoiceStatus.paid ? addInterval(now, input.payment?.paidDays ?? input.invoiceDays, 'day') : null;
  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: input.invoiceNumber,
      subscriptionOrderId: subscription.id,
      customerContactId: subscription.customerContactId,
      status: input.status,
      invoiceDate: addInterval(now, input.invoiceDays, 'day'),
      dueDate: addInterval(now, input.dueDays, 'day'),
      sourceLabel: input.sourceLabel,
      paymentTermLabel: subscription.paymentTermLabel,
      currencyCode: subscription.currencyCode,
      subtotalAmount: subscription.subtotalAmount,
      discountAmount: subscription.discountAmount,
      taxAmount: subscription.taxAmount,
      totalAmount: subscription.totalAmount,
      paidAmount,
      amountDue,
      paidAt,
      cancelledAt: input.status === InvoiceStatus.cancelled ? new Date() : null,
      lines: { create: subscription.lines.map((line) => ({ subscriptionOrderLineId: line.id, productNameSnapshot: line.productNameSnapshot, quantity: line.quantity, unitPrice: line.unitPrice, discountAmount: line.discountAmount, taxAmount: line.taxAmount, lineTotal: line.lineTotal, sortOrder: line.sortOrder })) },
    },
  });
  if (input.payment) await prisma.payment.create({ data: { invoiceId: invoice.id, paymentReference: input.payment.reference, paymentMethod: input.payment.method, provider: input.payment.provider, status: input.payment.status, amount: subscription.totalAmount, currencyCode: subscription.currencyCode, providerTransactionId: input.payment.tx ?? null, paidAt: input.payment.status === PaymentStatus.succeeded ? paidAt : null } });
  return invoice;
}

async function main() {
  await cleanup();

  const admin = await ensureUser({ email: process.env.ADMIN_EMAIL ?? 'admin@example.com', password: process.env.ADMIN_PASSWORD ?? 'Admin@1234', name: process.env.ADMIN_NAME ?? 'System Admin', role: UserRole.admin, phone: '+91-90000-10001', address: 'System Control Room, Ahmedabad', emailVerifiedAt: new Date() });
  const sales = await ensureUser({ email: 'sales@example.com', password: 'Sales@1234', name: 'Aarav Sales', role: UserRole.internal_user, phone: '+91-90000-20001', address: 'Sales Desk, Bengaluru', emailVerifiedAt: new Date() });
  const ops = await ensureUser({ email: 'ops@seed.local', password: 'Ops@12345', name: 'Mira Operations', role: UserRole.internal_user, phone: '+91-90000-20002', address: 'Operations Tower, Chennai', emailVerifiedAt: new Date() });
  const finance = await ensureUser({ email: 'finance@seed.local', password: 'Finance@123', name: 'Dev Finance', role: UserRole.internal_user, phone: '+91-90000-20003', address: 'Finance Bay, Mumbai', emailVerifiedAt: new Date() });
  const success = await ensureUser({ email: 'success@seed.local', password: 'Success@123', name: 'Kavya Success', role: UserRole.internal_user, phone: '+91-90000-20004', address: 'Customer Success Deck, Pune', emailVerifiedAt: new Date() });
  const salespeople = [admin, sales, ops, finance, success];

  const portalUsers = await Promise.all(Array.from({ length: 6 }, (_, i) => ensureUser({ email: `portal${i + 1}@seed.local`, password: 'Portal@1234', name: `${['Anaya', 'Rohan', 'Priya', 'Ishaan', 'Neha', 'Vivaan'][i]} Portal`, role: UserRole.portal_user, phone: `+91-91000-30${String(i + 1).padStart(2, '0')}`, address: `${10 + i} Customer Lane`, emailVerifiedAt: new Date() })));
  const linkedContacts = await Promise.all(portalUsers.slice(0, 4).map((user, i) => ensureContact({ email: `billing${i + 1}@seed.local`, name: `${['Anaya', 'Rohan', 'Priya', 'Ishaan'][i]} Billing`, index: i + 20, userId: user.id, createdById: admin.id, phone: `+91-92000-40${String(i + 1).padStart(2, '0')}`, address: `${20 + i} Billing Street`, companyName: `${contactLabels[i]} Holdings`, notes: 'Seeded linked billing contact' })));
  const standaloneContacts = await Promise.all(Array.from({ length: 12 }, (_, i) => ensureContact({ email: `contact${i + 1}@seed.local`, name: `${contactLabels[i]} Contact`, index: i + 40, createdById: admin.id, phone: `+91-93000-50${String(i + 1).padStart(2, '0')}`, address: `${30 + i} Commerce Park`, companyName: `${contactLabels[i]} Labs`, notes: 'Seeded standalone customer contact' })));

  const attributes = new Map<string, Awaited<ReturnType<typeof ensureAttribute>>>();
  for (const [name, values] of attributeDefs) attributes.set(name, await ensureAttribute(name, values));

  const plans = new Map<string, Awaited<ReturnType<typeof ensurePlan>>>();
  for (const def of planDefs) plans.set(def.name, await ensurePlan(def));
  for (const [name, description, dueDays] of termDefs) await ensureTerm(name, description, dueDays);
  const taxes = new Map<string, Awaited<ReturnType<typeof ensureTax>>>();
  for (const def of taxDefs) taxes.set(def.name, await ensureTax(def));

  const categoryMap = new Map<string, { id: string }>();
  for (const category of categories) {
    const created = await prisma.productCategory.create({ data: { name: category.name, slug: `${MARK.product}${category.key}`, description: `${category.name} seeded for admin catalog exploration.`, isActive: true } });
    categoryMap.set(category.key, { id: created.id });
  }

  const products: Array<{ id: string; isActive: boolean; productType: ProductType; baseSalesPrice: Prisma.Decimal; variants: Array<{ id: string }>; planPricing: Array<{ recurringPlanId: string; overridePrice: Prisma.Decimal | null }> }> = [];
  for (let i = 0; i < PRODUCT_COUNT; i += 1) {
    const category = mod(categories, i);
    const attribute = attributes.get(mod(category.attrs, i))!;
    const base = clampMoney(category.base + (i % 11) * 137 + Math.floor(i / categories.length) * 41 + (category.type === ProductType.goods ? 299 : 0));
    const values = i % 5 === 0 ? [] : Array.from({ length: Math.min(2 + (i % 3), attribute.values.length) }, (_, j) => attribute.values[(i + j) % attribute.values.length]);
    const chosenPlans = category.plans.filter((_, index) => index === 0 || index < (category.type === ProductType.service ? (i % 4 === 0 ? 3 : 2) : (i % 6 === 0 ? 3 : 2)));
    const slug = `${MARK.product}${category.key}-${String(i + 1).padStart(3, '0')}`;
    const product = await prisma.product.create({
      data: {
        categoryId: categoryMap.get(category.key)!.id,
        name: `${mod(labels, i)} ${mod(category.nouns, i + Math.floor(i / 3))} ${String(i + 1).padStart(3, '0')}`,
        slug,
        description: `Seeded ${category.type} product for admin product, media, tax, and subscription workflows.`,
        productType: category.type,
        baseSalesPrice: money(base),
        costPrice: money(base * (0.42 + (i % 5) * 0.035)),
        isSubscriptionEnabled: true,
        isActive: i % 19 !== 0,
        imageUrl: mediaUrls(category.key, `${mod(labels, i)} ${mod(category.nouns, i + Math.floor(i / 3))}`, slug, 3)[0],
        imageUrls: mediaUrls(category.key, `${mod(labels, i)} ${mod(category.nouns, i + Math.floor(i / 3))}`, slug, 2 + (i % 3)),
        variants: values.length ? { create: values.map((value, index) => ({ sku: `${slug.toUpperCase()}-${index + 1}`, name: `${attribute.name}: ${value.value}`, priceOverride: value.extraPrice, isActive: true, variantValues: { create: { attributeValueId: value.id } } })) } : undefined,
        planPricing: { create: chosenPlans.map((name, index) => ({ recurringPlanId: plans.get(name)!.id, overridePrice: money(planPrice(name, base)), isDefaultPlan: index === 0 })) },
        productTaxRules: { create: category.taxes.map((name) => ({ taxRuleId: taxes.get(name)!.id })) },
      },
      include: { variants: { orderBy: { createdAt: 'asc' } }, planPricing: true },
    });
    products.push({ id: product.id, isActive: product.isActive, productType: product.productType, baseSalesPrice: product.baseSalesPrice, variants: product.variants.map((variant) => ({ id: variant.id })), planPricing: product.planPricing });
  }

  const activeProducts = products.filter((product) => product.isActive && product.planPricing.length > 0);
  await prisma.discountRule.create({ data: { name: 'Seed Welcome 10%', code: 'SEEDWELCOME10', discountType: DiscountType.percentage, value: money(10), minimumPurchase: money(500), scopeType: DiscountScopeType.subscriptions, createdById: admin.id, isActive: true } });
  await prisma.discountRule.create({ data: { name: 'Seed Annual 20%', code: 'SEEDANNUAL20', discountType: DiscountType.percentage, value: money(20), minimumPurchase: money(5000), scopeType: DiscountScopeType.selected_products, createdById: admin.id, isActive: true, products: { create: activeProducts.filter((p) => p.productType === ProductType.service).slice(0, 18).map((product) => ({ productId: product.id })) } } });
  await prisma.discountRule.create({ data: { name: 'Seed Hardware 750', code: 'SEEDHW750', discountType: DiscountType.fixed, value: money(750), minimumPurchase: money(3500), scopeType: DiscountScopeType.selected_products, createdById: admin.id, isActive: true, products: { create: activeProducts.filter((p) => p.productType === ProductType.goods).slice(0, 18).map((product) => ({ productId: product.id })) } } });
  await prisma.discountRule.create({ data: { name: 'Seed Volume 15%', code: 'SEEDTEAM15', discountType: DiscountType.percentage, value: money(15), minimumQuantity: 5, scopeType: DiscountScopeType.all_products, createdById: admin.id, isActive: true } });

  const templateDefs = [
    ['Seed Starter Monthly Proposal', 'Seed Monthly Core', 'Immediate payment', 14, false, 12, 'month', [0, 1]],
    ['Seed Growth Quarterly Proposal', 'Seed Quarterly Growth', 'Net 15', 21, false, 18, 'month', [8, 9, 10]],
    ['Seed Annual Commitment Bundle', 'Seed Annual Commit', 'Net 30', 30, false, 24, 'month', [20, 21]],
    ['Seed Rental Rollout', 'Seed Weekly Rental', 'Immediate payment', 10, false, 12, 'week', [30, 31, 32]],
    ['Seed Enterprise Launch Pack', 'Seed Monthly Enterprise', '50% advance', 20, false, 12, 'month', [40, 41, 42]],
    ['Seed Evergreen Renewal Draft', 'Seed Annual Enterprise', 'Net 30', 25, true, null, null, [50, 51]],
  ] as const;
  const templateMap = new Map<string, string>();
  for (const [name, planName, paymentTermLabel, validityDays, isLastForever, durationCount, durationUnit, productIndexes] of templateDefs) {
    const template = await prisma.quotationTemplate.create({
      data: {
        name,
        validityDays,
        recurringPlanId: plans.get(planName)!.id,
        isLastForever,
        durationCount,
        durationUnit: durationUnit as 'week' | 'month' | 'year' | null,
        paymentTermLabel,
        description: `${name} is seeded for quotation template workflows.`,
        isActive: true,
        lines: { create: productIndexes.map((index, lineIndex) => ({ productId: activeProducts[index].id, variantId: activeProducts[index].variants[lineIndex % Math.max(activeProducts[index].variants.length, 1)]?.id ?? null, quantity: 1 + (lineIndex % 3), unitPrice: activeProducts[index].planPricing[0]?.overridePrice ?? activeProducts[index].baseSalesPrice, sortOrder: lineIndex })) },
      },
    });
    templateMap.set(name, template.id);
  }

  const defaultContacts = await prisma.contact.findMany({ where: { id: { in: portalUsers.map((user) => user.defaultContactId).filter((id): id is string => Boolean(id)) } }, select: { id: true, userId: true, name: true, email: true }, orderBy: { createdAt: 'asc' } });
  const customers = [...defaultContacts, ...linkedContacts, ...standaloneContacts];
  const subs: Array<{ id: string }> = [];
  const subDefs = [
    ['001', 0, 0, 'Seed Monthly Core', SubscriptionStatus.draft, 'Immediate payment', 0, 1, 'Seed Starter Monthly Proposal', undefined, undefined, undefined, undefined, -2, 5, undefined, undefined, undefined, undefined, 'Draft subscription'],
    ['002', 1, 1, 'Seed Quarterly Growth', SubscriptionStatus.quotation, 'Net 15', 8, 3, 'Seed Growth Quarterly Proposal', undefined, 'SEEDTEAM15', undefined, undefined, -4, 6, undefined, undefined, undefined, undefined, 'Quotation with discount'],
    ['003', 2, 2, 'Seed Annual Commit', SubscriptionStatus.quotation_sent, 'Net 30', 20, 1, 'Seed Annual Commitment Bundle', undefined, 'SEEDANNUAL20', undefined, undefined, -5, 2, undefined, undefined, undefined, undefined, 'Quotation sent'],
    ['004', 3, 3, 'Seed Annual Commit', SubscriptionStatus.confirmed, 'Net 30', 21, 1, 'Seed Annual Commitment Bundle', undefined, undefined, undefined, undefined, -3, 10, -1, 3, 3, undefined, 'Confirmed future start'],
    ['005', 4, 0, 'Seed Monthly Core', SubscriptionStatus.active, 'Immediate payment', 3, 1, 'Seed Starter Monthly Proposal', undefined, 'SEEDWELCOME10', undefined, undefined, -20, undefined, -18, -18, 12, undefined, 'Portal active subscription'],
    ['006', 5, 1, 'Seed Monthly Enterprise', SubscriptionStatus.active, '50% advance', 44, 5, undefined, undefined, 'SEEDTEAM15', undefined, undefined, -30, undefined, -28, -28, -2, undefined, 'Enterprise account'],
    ['007', 6, 0, 'Seed Starter Plus', SubscriptionStatus.active, 'Immediate payment', 1, 0, undefined, undefined, undefined, undefined, undefined, -5, undefined, -4.5, -4.5, 0.5, undefined, 'Basic account'],
    ['008', 7, 0, 'Seed Pro Annual', SubscriptionStatus.active, 'Net 30', 10, 2, undefined, undefined, 'SEEDPRO10', undefined, undefined, -10, undefined, -9, -9, 1, undefined, 'Pro account'],
    ['009', 8, 1, 'Seed Enterprise Monthly', SubscriptionStatus.active, '50% advance', 50, 4, undefined, undefined, undefined, undefined, undefined, -25, undefined, -22.5, -22.5, 2.5, undefined, 'Enterprise monthly'],
    ['010', 9, 0, 'Seed Annual Enterprise', SubscriptionStatus.active, 'Net 30', 70, 10, undefined, undefined, undefined, undefined, undefined, -40, undefined, -35, -35, 20, undefined, 'Enterprise annual'],
  ] as const;
  for (const [code, customerIndex, sellerIndex, planName, status, term, productIndex, quantity, templateName, relationType, discountCode, parentIndex, _unused, quotationDays, expiryDays, confirmedDays, startDays, nextInvoiceDays, expirationDays, notes] of subDefs) {
    subs.push(await createSeedSubscription({ subscriptionNumber: `${MARK.subscription}${code}`, customerContactId: customers[customerIndex].id, salespersonUserId: salespeople[sellerIndex].id, recurringPlanId: plans.get(planName)!.id, sourceChannel: customerIndex < 5 ? SourceChannel.portal : SourceChannel.admin, status, paymentTermLabel: term, productId: activeProducts[productIndex].id, variantId: activeProducts[productIndex].variants[0]?.id, quantity, quotationTemplateId: templateName ? templateMap.get(templateName) : undefined, relationType: relationType as RelationType | undefined, parentOrderId: typeof parentIndex === 'number' ? subs[parentIndex]?.id : undefined, discountCode: discountCode ?? undefined, quotationDays, expiryDays, confirmedDays, startDays, nextInvoiceDays, expirationDays, notes })); }
  subs.push(await createSeedSubscription({ subscriptionNumber: `${MARK.subscription}011`, customerContactId: customers[10].id, salespersonUserId: salespeople[1].id, recurringPlanId: plans.get('Seed Annual Commit')!.id, sourceChannel: SourceChannel.admin, status: SubscriptionStatus.quotation, paymentTermLabel: 'Net 30', productId: activeProducts[31].id, variantId: activeProducts[31].variants[0]?.id, quantity: 1, parentOrderId: subs[7].id, relationType: RelationType.renewal, quotationDays: -1, expiryDays: 9, notes: 'Renewal follow-up quotation' }));
  subs.push(await createSeedSubscription({ subscriptionNumber: `${MARK.subscription}012`, customerContactId: customers[11].id, salespersonUserId: salespeople[2].id, recurringPlanId: plans.get('Seed Monthly Core')!.id, sourceChannel: SourceChannel.admin, status: SubscriptionStatus.quotation, paymentTermLabel: 'Immediate payment', productId: activeProducts[90].id, variantId: activeProducts[90].variants[0]?.id, quantity: 1, parentOrderId: subs[4].id, relationType: RelationType.upsell, quotationDays: -2, expiryDays: 7, notes: 'Upsell follow-up quotation' }));

  await createSeedInvoice({ invoiceNumber: `${MARK.invoice}001`, subscriptionId: subs[4].id, status: InvoiceStatus.paid, invoiceDays: -18, dueDays: -18, sourceLabel: 'Portal checkout', payment: { reference: `${MARK.payment}001`, method: 'upi', provider: 'razorpay', status: PaymentStatus.succeeded, paidDays: -18, tx: 'seed_rzp_001' } });
  await createSeedInvoice({ invoiceNumber: `${MARK.invoice}002`, subscriptionId: subs[5].id, status: InvoiceStatus.confirmed, invoiceDays: -12, dueDays: -2, sourceLabel: 'Subscription Order' });
  await createSeedInvoice({ invoiceNumber: `${MARK.invoice}003`, subscriptionId: subs[6].id, status: InvoiceStatus.paid, invoiceDays: -14, dueDays: -10, sourceLabel: 'Subscription Order', payment: { reference: `${MARK.payment}003`, method: 'card', provider: 'razorpay', status: PaymentStatus.succeeded, paidDays: -11, tx: 'seed_rzp_003' } });
  await createSeedInvoice({ invoiceNumber: `${MARK.invoice}004`, subscriptionId: subs[7].id, status: InvoiceStatus.paid, invoiceDays: -50, dueDays: -45, sourceLabel: 'Subscription Order', payment: { reference: `${MARK.payment}004`, method: 'bank_transfer', provider: 'manual', status: PaymentStatus.succeeded, paidDays: -46, tx: 'seed_manual_004' } });
  await createSeedInvoice({ invoiceNumber: `${MARK.invoice}005`, subscriptionId: subs[8].id, status: InvoiceStatus.cancelled, invoiceDays: -6, dueDays: -1, sourceLabel: 'Subscription Order' });
  await createSeedInvoice({ invoiceNumber: `${MARK.invoice}006`, subscriptionId: subs[9].id, status: InvoiceStatus.draft, invoiceDays: -4, dueDays: -1, sourceLabel: 'Subscription Order' });

  const [productCount, activeProductCount, subscriptionCount, invoiceCount] = await Promise.all([
    prisma.product.count({ where: { slug: { startsWith: MARK.product } } }),
    prisma.product.count({ where: { slug: { startsWith: MARK.product }, isActive: true } }),
    prisma.subscriptionOrder.count({ where: { subscriptionNumber: { startsWith: MARK.subscription } } }),
    prisma.invoice.count({ where: { invoiceNumber: { startsWith: MARK.invoice } } }),
  ]);
  console.log(`Seeded admin ${admin.email}`);
  console.log(`Seeded internal users: ${sales.email}, ${ops.email}, ${finance.email}, ${success.email}`);
  console.log(`Seeded ${portalUsers.length} portal users and ${linkedContacts.length + standaloneContacts.length} additional contacts`);
  console.log(`Seeded ${productCount} products (${activeProductCount} active), ${subscriptionCount} subscriptions, and ${invoiceCount} invoices`);
  console.log('Portal user password: Portal@1234');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
