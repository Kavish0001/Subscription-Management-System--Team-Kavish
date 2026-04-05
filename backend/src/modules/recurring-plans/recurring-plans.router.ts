import { Router, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireAdminOrInternal } from '../../middleware/role-guard';
import * as svc from './recurring-plans.service';

export const recurringPlansRouter = Router();
const auth = [authenticate, requireAdminOrInternal] as any[];

recurringPlansRouter.get('/', async (_req, res: Response, next: NextFunction) => {
  try { res.json(await svc.listRecurringPlans()); } catch (e) { next(e); }
});
recurringPlansRouter.get('/:id', ...auth, async (req: any, res: Response, next: NextFunction) => {
  try { res.json(await svc.getRecurringPlanById(req.params.id)); } catch (e) { next(e); }
});
recurringPlansRouter.post('/', ...auth, async (req: any, res: Response, next: NextFunction) => {
  try { res.status(201).json(await svc.createRecurringPlan(req.body)); } catch (e) { next(e); }
});
recurringPlansRouter.put('/:id', ...auth, async (req: any, res: Response, next: NextFunction) => {
  try { res.json(await svc.updateRecurringPlan(req.params.id, req.body)); } catch (e) { next(e); }
});
recurringPlansRouter.delete('/:id', ...auth, async (req: any, res: Response, next: NextFunction) => {
  try { await svc.deleteRecurringPlan(req.params.id); res.json({ ok: true }); } catch (e) { next(e); }
});
