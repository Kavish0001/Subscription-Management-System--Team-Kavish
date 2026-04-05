import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');
  const passwordHash = await bcrypt.hash('Admin@123', 12);
  const userPasswordHash = await bcrypt.hash('Pass@123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { isEmailVerified: true },
    create: { email: 'admin@example.com', passwordHash, role: 'admin', isEmailVerified: true },
  });

  await prisma.contact.upsert({
    where: { id: 'admin-contact' },
    update: {},
    create: { id: 'admin-contact', userId: admin.id, name: 'Admin User', email: 'admin@example.com', isDefault: true },
  });

  console.log('Wiping database strictly for safe wipe...');
  // Delete in reverse order of dependencies to avoid FK violation
  await prisma.payment.deleteMany();
  await prisma.invoiceLine.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.subscriptionOrderLineTax.deleteMany();
  await prisma.subscriptionOrderLine.deleteMany();
  await prisma.subscriptionOrder.deleteMany();
  await prisma.address.deleteMany();
  
  // Wiping random portal users but preserving the admin account
  await prisma.contact.deleteMany({ where: { user: { role: 'portal_user' } }});
  await prisma.user.deleteMany({ where: { role: 'portal_user' }});

  // Clear configuration
  await prisma.quotationTemplateLine.deleteMany();
  await prisma.quotationTemplate.deleteMany();
  await prisma.paymentTermLine.deleteMany();
  await prisma.paymentTerm.deleteMany();
  await prisma.discountRuleProduct.deleteMany();
  await prisma.discountRule.deleteMany();
  await prisma.productVariantValue.deleteMany();
  await prisma.productAttributeValue.deleteMany();
  await prisma.productAttribute.deleteMany();
  await prisma.productPlanPricing.deleteMany();
  await prisma.productTaxRule.deleteMany();
  await prisma.product.deleteMany();
  // Don't delete RecurringPlans/TaxRules to avoid breaking IDs that we upsert, just add more

  // ---- CONFIGURATION DATA ---- //

  console.log('Seeding configuration data (Taxes, Plans, Attributes, Terms, Discounts, Quotes)...');

  // Taxes
  const gst = await prisma.taxRule.upsert({ where: { id: 'gst-18' }, update: {}, create: { id: 'gst-18', name: 'GST 18%', ratePercent: 18, taxType: 'GST', isInclusive: false } });
  await prisma.taxRule.upsert({ where: { id: 'vat-5' }, update: {}, create: { id: 'vat-5', name: 'VAT 5%', ratePercent: 5, taxType: 'VAT', isInclusive: false } });
  await prisma.taxRule.upsert({ where: { id: 'zero' }, update: {}, create: { id: 'zero', name: 'Tax Exempt', ratePercent: 0, taxType: 'NONE', isInclusive: true } });
  await prisma.taxRule.upsert({ where: { id: 'igst-28' }, update: {}, create: { id: 'igst-28', name: 'IGST 28%', ratePercent: 28, taxType: 'GST', isInclusive: false } });

  // Recurring Plans
  const monthly = await prisma.recurringPlan.upsert({ where: { id: 'plan-monthly' }, update: {}, create: { id: 'plan-monthly', name: 'Monthly Standard', price: 999, intervalCount: 1, intervalUnit: 'month', isRenewable: true, isClosable: true } });
  const sixMonth = await prisma.recurringPlan.upsert({ where: { id: 'plan-6month' }, update: {}, create: { id: 'plan-6month', name: 'Half-Yearly Saver', price: 5499, intervalCount: 6, intervalUnit: 'month', isRenewable: true, isClosable: true } });
  const yearly = await prisma.recurringPlan.upsert({ where: { id: 'plan-yearly' }, update: {}, create: { id: 'plan-yearly', name: 'Annual Premium', price: 9999, intervalCount: 12, intervalUnit: 'month', isRenewable: true, isClosable: true } });
  await prisma.recurringPlan.upsert({ where: { id: 'plan-weekly' }, update: {}, create: { id: 'plan-weekly', name: 'Weekly Essentials', price: 299, intervalCount: 1, intervalUnit: 'week', isRenewable: true, isClosable: true } });
  await prisma.recurringPlan.upsert({ where: { id: 'plan-custom-ent' }, update: {}, create: { id: 'plan-custom-ent', name: 'Enterprise Custom', price: 50000, intervalCount: 1, intervalUnit: 'year', isRenewable: true, isClosable: false } });

  // Attributes
  const attrColor = await prisma.productAttribute.create({ data: { name: 'Color', description: 'Product variants by color' } });
  await prisma.productAttributeValue.createMany({ data: [{ attributeId: attrColor.id, value: 'Space Black' }, { attributeId: attrColor.id, value: 'Titanium Silver' }, { attributeId: attrColor.id, value: 'Rose Gold' }] });
  const attrSize = await prisma.productAttribute.create({ data: { name: 'Size', description: 'Apparel or dimensional size' } });
  await prisma.productAttributeValue.createMany({ data: [{ attributeId: attrSize.id, value: 'Small', extraPrice: 0 }, { attributeId: attrSize.id, value: 'Medium', extraPrice: 100 }, { attributeId: attrSize.id, value: 'Large', extraPrice: 200 }] });
  const attrStorage = await prisma.productAttribute.create({ data: { name: 'Storage', description: 'Digital device storage' } });
  await prisma.productAttributeValue.createMany({ data: [{ attributeId: attrStorage.id, value: '128GB' }, { attributeId: attrStorage.id, value: '256GB', extraPrice: 5000 }, { attributeId: attrStorage.id, value: '512GB', extraPrice: 10000 }] });

  // Payment Terms
  const termNet30 = await prisma.paymentTerm.create({ data: { name: 'Net 30 Days', earlyDiscount: 2, earlyDiscountDays: 10 } });
  await prisma.paymentTermLine.create({ data: { paymentTermId: termNet30.id, dueType: 'percent', dueValue: 100, afterDays: 30 } });
  const termDueReceipt = await prisma.paymentTerm.create({ data: { name: 'Due on Receipt' } });
  await prisma.paymentTermLine.create({ data: { paymentTermId: termDueReceipt.id, dueType: 'percent', dueValue: 100, afterDays: 0 } });
  const termSplit5050 = await prisma.paymentTerm.create({ data: { name: '50% Upfront, 50% Net 30' } });
  await prisma.paymentTermLine.create({ data: { paymentTermId: termSplit5050.id, dueType: 'percent', dueValue: 50, afterDays: 0 } });
  await prisma.paymentTermLine.create({ data: { paymentTermId: termSplit5050.id, dueType: 'percent', dueValue: 50, afterDays: 30 } });

  // Discounts
  await prisma.discountRule.create({ data: { name: 'Summer Sale 2026', code: 'SUMMER20', type: 'percentage', value: 20, startDate: new Date(), endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), usageLimit: 500, scopeType: 'all_products' } });
  await prisma.discountRule.create({ data: { name: 'Welcome Bonus', code: 'WELCOME', type: 'percentage', value: 10, usageLimit: 10000, scopeType: 'all_products' } });
  await prisma.discountRule.create({ data: { name: 'Flat 500 Off', code: 'FLAT500', type: 'fixed', value: 500, minimumPurchase: 2000, scopeType: 'all_products' } });
  await prisma.discountRule.create({ data: { name: 'Enterprise SaaS Trial', code: 'FREETRIAL', type: 'percentage', value: 100, usageLimit: 50, scopeType: 'subscriptions' } });

  // Cats
  const catGoods = await prisma.productCategory.upsert({ where: { id: 'cat-goods' }, update: {}, create: { id: 'cat-goods', name: 'Physical Goods' }});
  const catServices = await prisma.productCategory.upsert({ where: { id: 'cat-services' }, update: {}, create: { id: 'cat-services', name: 'Services' }});

  // ---- PRODUCTS ---- //

  // Office chair: picsum IDs for furniture/chair-style images
  // Standing desk: clean desk/workspace style
  // Keyboard: tech/keyboard close-up style
  // etc. IDs verified from https://picsum.photos/images
  const oneTimeProducts = [
    { name: 'Ergonomic Office Chair', slug: 'office-chair', price: 12000, cost: 8000, cat: catGoods.id, type: 'goods',
      images: 'https://picsum.photos/id/2/600/400,https://picsum.photos/id/20/600/400,https://picsum.photos/id/164/600/400,https://picsum.photos/id/201/600/400' },
    { name: 'Standing Desk', slug: 'standing-desk', price: 25000, cost: 15000, cat: catGoods.id, type: 'goods',
      images: 'https://picsum.photos/id/180/600/400,https://picsum.photos/id/26/600/400,https://picsum.photos/id/60/600/400,https://picsum.photos/id/188/600/400' },
    { name: 'Mechanical Keyboard', slug: 'mech-keyboard', price: 4500, cost: 2500, cat: catGoods.id, type: 'goods',
      images: 'https://picsum.photos/id/0/600/400,https://picsum.photos/id/3/600/400,https://picsum.photos/id/119/600/400' },
    { name: 'Wireless Mouse', slug: 'wireless-mouse', price: 2000, cost: 1000, cat: catGoods.id, type: 'goods',
      images: 'https://picsum.photos/id/1/600/400,https://picsum.photos/id/48/600/400,https://picsum.photos/id/96/600/400' },
    { name: 'Noise Cancelling Headphones', slug: 'nc-headphones', price: 18000, cost: 12000, cat: catGoods.id, type: 'goods',
      images: 'https://picsum.photos/id/9/600/400,https://picsum.photos/id/29/600/400,https://picsum.photos/id/77/600/400,https://picsum.photos/id/103/600/400' },
    { name: 'USB-C Hub', slug: 'usb-c-hub', price: 2500, cost: 1200, cat: catGoods.id, type: 'goods',
      images: 'https://picsum.photos/id/6/600/400,https://picsum.photos/id/42/600/400,https://picsum.photos/id/160/600/400' },
  ];

  const dbProducts = [];
  for (const item of oneTimeProducts) {
    const p = await prisma.product.create({
      data: { name: item.name, slug: item.slug, categoryId: item.cat, productType: item.type as any, baseSalesPrice: item.price, costPrice: item.cost, description: `Premium ${item.name}.`, imageUrl: item.images }
    });
    await prisma.productTaxRule.create({ data: { id: `ptr-${item.slug}`, productId: p.id, taxRuleId: gst.id } });
    dbProducts.push(p);
  }


  const subProducts = [
    { name: 'Fresh Organic Milk', slug: 'organic-milk', price: 90, cost: 50, cat: catGoods.id, type: 'goods', subs: [true, false, false], multiplier: 30,
      images: 'https://picsum.photos/id/429/600/400,https://picsum.photos/id/102/600/400,https://picsum.photos/id/292/600/400' },
    { name: 'Cloud Web Hosting', slug: 'web-hosting', price: 0, cost: 0, cat: catServices.id, type: 'service', subs: [true, true, true], multiplier: 499,
      images: 'https://picsum.photos/id/180/600/400,https://picsum.photos/id/0/600/400,https://picsum.photos/id/325/600/400,https://picsum.photos/id/442/600/400' },
    { name: 'Marketing SaaS Platform', slug: 'marketing-saas', price: 0, cost: 0, cat: catServices.id, type: 'service', subs: [false, true, true], multiplier: 2999,
      images: 'https://picsum.photos/id/367/600/400,https://picsum.photos/id/175/600/400,https://picsum.photos/id/6/600/400,https://picsum.photos/id/42/600/400' },
    { name: 'Fitness App Access', slug: 'fitness-app', price: 0, cost: 0, cat: catServices.id, type: 'service', subs: [true, false, true], multiplier: 299,
      images: 'https://picsum.photos/id/145/600/400,https://picsum.photos/id/488/600/400,https://picsum.photos/id/536/600/400' },
  ];

  for (const item of subProducts) {
    const p = await prisma.product.create({
      data: { name: item.name, slug: item.slug, categoryId: item.cat, productType: item.type as any, baseSalesPrice: item.price, costPrice: item.cost, description: `High quality ${item.name}.`, imageUrl: item.images }
    });
    await prisma.productTaxRule.create({ data: { id: `ptr-${item.slug}`, productId: p.id, taxRuleId: gst.id } });
    dbProducts.push(p);
    
    const baseRecur = item.price > 0 ? item.price * item.multiplier : item.multiplier;
    if (item.subs[0]) await prisma.productPlanPricing.create({ data: { productId: p.id, recurringPlanId: monthly.id, price: baseRecur * 0.95 }});
    if (item.subs[1]) await prisma.productPlanPricing.create({ data: { productId: p.id, recurringPlanId: sixMonth.id, price: baseRecur * 6 * 0.9 }});
    if (item.subs[2]) await prisma.productPlanPricing.create({ data: { productId: p.id, recurringPlanId: yearly.id, price: baseRecur * 12 * 0.85 }});
  }

  // Quotation Templates
  const templateB2B = await prisma.quotationTemplate.create({ data: { name: 'Standard B2B IT Procurement', validityDays: 30, paymentTermLabel: 'Net 30 Days', description: 'Standard IT hardware bundle for new offices.' } });
  await prisma.quotationTemplateLine.create({ data: { templateId: templateB2B.id, productId: dbProducts[0].id, quantity: 5, unitPrice: 12000, sortOrder: 1 } });
  await prisma.quotationTemplateLine.create({ data: { templateId: templateB2B.id, productId: dbProducts[1].id, quantity: 5, unitPrice: 25000, sortOrder: 2 } });
  
  const templateSaaS = await prisma.quotationTemplate.create({ data: { name: 'Enterprise SaaS Annual Proposal', validityDays: 15, recurringPlanId: yearly.id, paymentTermLabel: '50% Upfront, 50% Net 30', description: 'Yearly subscription to the Marketing SaaS Platform with 10% volume discount.' } });
  await prisma.quotationTemplateLine.create({ data: { templateId: templateSaaS.id, productId: dbProducts.find((p) => p.slug === 'marketing-saas')?.id || dbProducts[2].id, quantity: 1, unitPrice: 30000, sortOrder: 1 } });

  // ---- DUMMY USERS & ORDERS ---- //

  console.log('Generating dummy customer data...');
  const indianCities = ['Mumbai', 'Delhi', 'Bengaluru', 'Ahmedabad', 'Chennai', 'Kolkata', 'Pune', 'Hyderabad'];
  const firstNames = ['Aarav', 'Vihaan', 'Aditya', 'Rohan', 'Harsh', 'Ananya', 'Diya', 'Kriti', 'Sneha'];
  const lastNames = ['Sharma', 'Patel', 'Singh', 'Kumar', 'Gupta', 'Desai'];

  const user = await prisma.user.upsert({
    where: { email: 'harsh.kewalramani@example.com' },
    update: { isEmailVerified: true },
    create: { email: 'harsh.kewalramani@example.com', passwordHash: userPasswordHash, role: 'portal_user', isEmailVerified: true }
  });
  const myContact = await prisma.contact.create({ data: { userId: user.id, name: 'Harsh Kewalramani', email: 'harsh.kewalramani@example.com', isDefault: true } });
  await prisma.address.create({ data: { contactId: myContact.id, type: 'shipping', line1: 'Thaltej Gam', city: 'Ahmedabad', postalCode: '380059', country: 'India' } });

  for (let i = 1; i <= 35; i++) {
    const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
    const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
    const cityIdx = Math.floor(Math.random() * indianCities.length);
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@example.com`;

    const u = await prisma.user.create({ data: { email, passwordHash: userPasswordHash, role: 'portal_user', isEmailVerified: true } });
    const contact = await prisma.contact.create({ data: { userId: u.id, name: `${fn} ${ln}`, email, phone: `+91 98${Math.floor(Math.random() * 10000000)}`, isDefault: true } });
    await prisma.address.create({ data: { contactId: contact.id, type: 'shipping', line1: `${Math.floor(Math.random() * 500) + 1}, ${fn} Apartments`, city: indianCities[cityIdx], postalCode: `4000${Math.floor(Math.random() * 90) + 10}`, country: 'India' } });

    if (i % 3 !== 0) { 
      const prodsToBuyCount = Math.floor(Math.random() * 2) + 1;
      for (let j = 0; j < prodsToBuyCount; j++) {
        const prod = dbProducts[Math.floor(Math.random() * dbProducts.length)];
        const price = Number(prod.baseSalesPrice) > 0 ? Number(prod.baseSalesPrice) : 899;
        
        const isRecurring = prod.productType === 'service' || Math.random() > 0.5;
        let planId = null;
        if (isRecurring) {
           planId = Math.random() > 0.5 ? monthly.id : yearly.id;
        }
        const startDate = new Date(Date.now() - Math.random() * 5000000000);
        const expDate = isRecurring ? new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000) : null;
        const nextInv = isRecurring ? new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) : null;

        const order = await prisma.subscriptionOrder.create({
          data: {
             subscriptionNumber: `SUB-${10000 + i * 10 + j}`,
             customerContactId: contact.id,
             status: 'active',
             totalAmount: price,
             subtotal: price,
             sourceChannel: 'portal',
             recurringPlanId: planId,
             startDate: startDate,
             expirationDate: expDate,
             nextInvoiceDate: nextInv
          }
        });
        await prisma.subscriptionOrderLine.create({ data: { subscriptionOrderId: order.id, productId: prod.id, productNameSnapshot: prod.name, quantity: 1, unitPrice: price, lineTotal: price } });

        const rand = Math.random();
        let invStatus: any = 'paid';
        let dueDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
        
        if (rand < 0.2) {
          invStatus = 'overdue';
          dueDate = new Date(Date.now() - Math.floor(Math.random() * 30 + 1) * 24 * 60 * 60 * 1000); // Past 1-30 days
        } else if (rand < 0.35) {
          invStatus = 'draft';
        }

        const inv = await prisma.invoice.create({
          data: {
              invoiceNumber: `INV-${50000 + i * 100 + j}`,
              subscriptionOrderId: order.id,
              contactId: contact.id,
              status: invStatus,
              subtotal: price,
              totalAmount: price,
              dueDate: dueDate
          }
        });
        await prisma.invoiceLine.create({ data: { invoiceId: inv.id, productNameSnapshot: prod.name, quantity: 1, unitPrice: price, lineTotal: price }});
        
        if (invStatus === 'paid') {
          await prisma.payment.create({ data: { invoiceId: inv.id, amount: price, method: 'card', status: 'succeeded', paidAt: new Date(Date.now() - Math.floor(Math.random() * 10) * 24 * 60 * 60 * 1000) } });
        }
      }
    }
  }

  console.log('Seed complete. Generated massive dataset!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
