import { prisma } from '../../lib/prisma';

export async function getSummary() {
  const [activeSubscriptions, overdueInvoices, recentSubscriptions, recentPayments, totalRevenueAgg, mrrAgg, productSales] = await Promise.all([
    prisma.subscriptionOrder.count({ where: { status: 'active' } }),
    prisma.invoice.count({ where: { status: 'overdue' } }),
    prisma.subscriptionOrder.findMany({ take: 5, orderBy: { createdAt: 'desc' }, include: { customerContact: true, recurringPlan: true } }),
    prisma.payment.findMany({ take: 5, where: { status: 'succeeded' }, orderBy: { paidAt: 'desc' }, include: { invoice: { include: { contact: true } } } }),
    prisma.payment.aggregate({ where: { status: 'succeeded' }, _sum: { amount: true } }),
    prisma.subscriptionOrder.aggregate({ where: { status: 'active' }, _sum: { totalAmount: true } }),
    prisma.subscriptionOrderLine.groupBy({ by: ['productNameSnapshot'], _sum: { quantity: true, lineTotal: true } }),
  ]);

  const sortedProducts = [...productSales].sort((a: any, b: any) => Number(b._sum.quantity ?? 0) - Number(a._sum.quantity ?? 0));
  const mappedProducts = sortedProducts.map((p: any) => ({
    name: p.productNameSnapshot,
    sales: Number(p._sum.quantity ?? 0),
    revenue: Number(p._sum.lineTotal ?? 0)
  }));

  const topProducts = mappedProducts.slice(0, 3);
  const bottomProducts = mappedProducts.slice(-3).reverse();

  return {
    activeSubscriptions,
    overdueInvoices,
    totalRevenue: Number(totalRevenueAgg._sum.amount ?? 0),
    mrr: Number(mrrAgg._sum.totalAmount ?? 0),
    recentSubscriptions,
    recentPayments,
    topProducts,
    bottomProducts,
  };
}
