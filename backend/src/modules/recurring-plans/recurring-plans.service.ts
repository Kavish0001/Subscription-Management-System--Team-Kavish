import { prisma } from '../../lib/prisma';
import { createError } from '../../middleware/error-handler';

export const listRecurringPlans = () => prisma.recurringPlan.findMany({ orderBy: { name: 'asc' } });
export async function getRecurringPlanById(id: string) {
  const p = await prisma.recurringPlan.findUnique({ where: { id } });
  if (!p) throw createError('Plan not found', 404);
  return p;
}
export const createRecurringPlan = (data: any) => prisma.recurringPlan.create({ data });
export const updateRecurringPlan = (id: string, data: any) => prisma.recurringPlan.update({ where: { id }, data });
export const deleteRecurringPlan = (id: string) => prisma.recurringPlan.delete({ where: { id } });
