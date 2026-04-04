import { SubscriptionStatus } from '@prisma/client';
import { Router } from 'express';


import { prisma } from '../../lib/prisma.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { syncSubscriptionOperationalStatuses } from '../subscriptions/lifecycle.js';

export const reportsRouter = Router();

reportsRouter.use(requireAuth, requireRole('admin', 'internal_user'));

reportsRouter.get('/dashboard', async (_request, response) => {
  await syncSubscriptionOperationalStatuses(prisma);

  const [activeSubscriptions, invoicesPaid, revenueAgg, overdueInvoices] = await Promise.all([
    prisma.subscriptionOrder.count({ where: { status: SubscriptionStatus.in_progress } }),
    prisma.invoice.count({ where: { status: 'paid' } }),
    prisma.invoice.aggregate({
      _sum: { totalAmount: true },
      where: { status: 'paid' }
    }),
    prisma.invoice.count({
      where: {
        status: { in: ['draft', 'confirmed'] },
        dueDate: { lt: new Date() }
      }
    })
  ]);

  response.json({
    data: {
      activeSubscriptions,
      invoicesPaid,
      revenue: Number(revenueAgg._sum.totalAmount ?? 0),
      overdueInvoices
    }
  });
});
