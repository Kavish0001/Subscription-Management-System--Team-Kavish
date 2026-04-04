import 'dotenv/config';

import { PrismaClient, UserRole } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function ensureUser(input: {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}) {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
    include: {
      contacts: {
        include: { addresses: true }
      }
    }
  });

  if (existingUser) {
    if (existingUser.contacts.length === 0) {
      await prisma.contact.create({
        data: {
          userId: existingUser.id,
          name: input.name,
          isDefault: true,
          addresses: {
            create: [
              {
                type: 'billing',
                line1: 'Seed Address',
                city: 'Ahmedabad',
                state: 'Gujarat',
                postalCode: '380001',
                country: 'India',
                isDefault: true
              }
            ]
          }
        }
      });
    }

    return existingUser;
  }

  const passwordHash = await argon2.hash(input.password);

  return prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      role: input.role,
      contacts: {
        create: {
          name: input.name,
          isDefault: true,
          addresses: {
            create: [
              {
                type: 'billing',
                line1: 'Seed Address',
                city: 'Ahmedabad',
                state: 'Gujarat',
                postalCode: '380001',
                country: 'India',
                isDefault: true
              },
              {
                type: 'shipping',
                line1: 'Seed Address',
                city: 'Ahmedabad',
                state: 'Gujarat',
                postalCode: '380001',
                country: 'India',
                isDefault: true
              }
            ]
          }
        }
      }
    }
  });
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'Admin@1234';
  const adminName = process.env.ADMIN_NAME ?? 'System Admin';

  const admin = await ensureUser({
    email: adminEmail.toLowerCase(),
    password: adminPassword,
    name: adminName,
    role: UserRole.admin
  });

  const salesUser = await ensureUser({
    email: 'sales@example.com',
    password: 'Sales@1234',
    name: 'Aarav Sales',
    role: UserRole.internal_user
  });

  const category = await prisma.productCategory.upsert({
    where: { slug: 'saas-subscriptions' },
    update: {
      name: 'SaaS Subscriptions',
      description: 'Recurring software plans for teams and businesses.'
    },
    create: {
      name: 'SaaS Subscriptions',
      slug: 'saas-subscriptions',
      description: 'Recurring software plans for teams and businesses.'
    }
  });

  const [monthlyPlan, yearlyPlan] = await Promise.all([
    prisma.recurringPlan.findFirst({
      where: { name: 'Monthly Billing' }
    }),
    prisma.recurringPlan.findFirst({
      where: { name: 'Annual Billing' }
    })
  ]);

  const activeMonthlyPlan =
    monthlyPlan ??
    (await prisma.recurringPlan.create({
      data: {
        name: 'Monthly Billing',
        intervalCount: 1,
        intervalUnit: 'month',
        price: 999,
        minimumQuantity: 1,
        isClosable: true,
        isPausable: true,
        isRenewable: true
      }
    }));

  const activeYearlyPlan =
    yearlyPlan ??
    (await prisma.recurringPlan.create({
      data: {
        name: 'Annual Billing',
        intervalCount: 1,
        intervalUnit: 'year',
        price: 9999,
        minimumQuantity: 1,
        autoCloseEnabled: false,
        isClosable: true,
        isPausable: true,
        isRenewable: true
      }
    }));

  const starterProduct = await prisma.product.upsert({
    where: { slug: 'starter-subscription' },
    update: {
      name: 'Starter Subscription',
      description: 'Core subscription billing for early-stage teams.',
      productType: 'service',
      baseSalesPrice: 999,
      costPrice: 249,
      categoryId: category.id,
      isSubscriptionEnabled: true,
      imageUrl: 'https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=900&q=80'
    },
    create: {
      name: 'Starter Subscription',
      slug: 'starter-subscription',
      description: 'Core subscription billing for early-stage teams.',
      productType: 'service',
      baseSalesPrice: 999,
      costPrice: 249,
      categoryId: category.id,
      isSubscriptionEnabled: true,
      imageUrl: 'https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=900&q=80'
    }
  });

  const growthProduct = await prisma.product.upsert({
    where: { slug: 'growth-subscription' },
    update: {
      name: 'Growth Subscription',
      description: 'Expanded billing automation and revenue visibility.',
      productType: 'service',
      baseSalesPrice: 2499,
      costPrice: 799,
      categoryId: category.id,
      isSubscriptionEnabled: true,
      imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=80'
    },
    create: {
      name: 'Growth Subscription',
      slug: 'growth-subscription',
      description: 'Expanded billing automation and revenue visibility.',
      productType: 'service',
      baseSalesPrice: 2499,
      costPrice: 799,
      categoryId: category.id,
      isSubscriptionEnabled: true,
      imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=80'
    }
  });

  await Promise.all([
    prisma.productPlanPricing.upsert({
      where: {
        productId_recurringPlanId: {
          productId: starterProduct.id,
          recurringPlanId: activeMonthlyPlan.id
        }
      },
      update: {
        overridePrice: 999,
        isDefaultPlan: true
      },
      create: {
        productId: starterProduct.id,
        recurringPlanId: activeMonthlyPlan.id,
        overridePrice: 999,
        isDefaultPlan: true
      }
    }),
    prisma.productPlanPricing.upsert({
      where: {
        productId_recurringPlanId: {
          productId: starterProduct.id,
          recurringPlanId: activeYearlyPlan.id
        }
      },
      update: {
        overridePrice: 9999
      },
      create: {
        productId: starterProduct.id,
        recurringPlanId: activeYearlyPlan.id,
        overridePrice: 9999
      }
    }),
    prisma.productPlanPricing.upsert({
      where: {
        productId_recurringPlanId: {
          productId: growthProduct.id,
          recurringPlanId: activeMonthlyPlan.id
        }
      },
      update: {
        overridePrice: 2499,
        isDefaultPlan: true
      },
      create: {
        productId: growthProduct.id,
        recurringPlanId: activeMonthlyPlan.id,
        overridePrice: 2499,
        isDefaultPlan: true
      }
    }),
    prisma.productPlanPricing.upsert({
      where: {
        productId_recurringPlanId: {
          productId: growthProduct.id,
          recurringPlanId: activeYearlyPlan.id
        }
      },
      update: {
        overridePrice: 24999
      },
      create: {
        productId: growthProduct.id,
        recurringPlanId: activeYearlyPlan.id,
        overridePrice: 24999
      }
    })
  ]);

  const template = await prisma.quotationTemplate.findFirst({
    where: { name: 'Starter Annual Proposal' }
  });

  const activeTemplate =
    template ??
    (await prisma.quotationTemplate.create({
      data: {
        name: 'Starter Annual Proposal',
        validityDays: 15,
        recurringPlanId: activeYearlyPlan.id,
        paymentTermLabel: 'Immediate payment',
        description: 'Default annual quotation for the starter plan.'
      }
    }));

  const templateLine = await prisma.quotationTemplateLine.findFirst({
    where: {
      quotationTemplateId: activeTemplate.id,
      productId: starterProduct.id
    }
  });

  if (!templateLine) {
    await prisma.quotationTemplateLine.create({
      data: {
        quotationTemplateId: activeTemplate.id,
        productId: starterProduct.id,
        quantity: 1,
        unitPrice: 9999,
        sortOrder: 0
      }
    });
  }

  const taxRule = await prisma.taxRule.findFirst({
    where: { name: 'GST 18%' }
  });

  const activeTaxRule =
    taxRule ??
    (await prisma.taxRule.create({
      data: {
        name: 'GST 18%',
        ratePercent: 18,
        taxType: 'gst',
        isInclusive: false
      }
    }));

  await Promise.all([
    prisma.productTaxRule.upsert({
      where: {
        productId_taxRuleId: {
          productId: starterProduct.id,
          taxRuleId: activeTaxRule.id
        }
      },
      update: {},
      create: {
        productId: starterProduct.id,
        taxRuleId: activeTaxRule.id
      }
    }),
    prisma.productTaxRule.upsert({
      where: {
        productId_taxRuleId: {
          productId: growthProduct.id,
          taxRuleId: activeTaxRule.id
        }
      },
      update: {},
      create: {
        productId: growthProduct.id,
        taxRuleId: activeTaxRule.id
      }
    })
  ]);

  const discount = await prisma.discountRule.findUnique({
    where: { code: 'WELCOME10' }
  });

  if (!discount) {
    await prisma.discountRule.create({
      data: {
        name: 'Welcome 10%',
        code: 'WELCOME10',
        discountType: 'percentage',
        value: 10,
        minimumPurchase: 500,
        scopeType: 'subscriptions',
        createdById: admin.id
      }
    });
  }

  console.log(`Seeded admin ${admin.email}`);
  console.log(`Seeded internal user ${salesUser.email}`);
  console.log('Seeded catalog, plans, quotation template, tax rule, and discount data');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
