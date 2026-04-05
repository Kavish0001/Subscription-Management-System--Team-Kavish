import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { requireAdmin, requireAdminOrInternal, requireAnyAuth } from '../../middleware/role-guard';
import * as svc from './discount-rules.service';

export const discountRulesRouter = Router();

discountRulesRouter.get('/', authenticate, requireAdminOrInternal, async (_req, res: Response, next: NextFunction) => {
  try { res.json(await svc.listDiscountRules()); } catch (e) { next(e); }
});
discountRulesRouter.post('/validate', authenticate, requireAnyAuth, async (req, res: Response, next: NextFunction) => {
  try { res.json(await svc.validateDiscountCode(req.body.code, req.body.subtotal)); } catch (e) { next(e); }
});
discountRulesRouter.post('/', authenticate, requireAdmin, async (req, res: Response, next: NextFunction) => {
  try { res.status(201).json(await svc.createDiscountRule(req.body)); } catch (e) { next(e); }
});
discountRulesRouter.put('/:id', authenticate, requireAdmin, async (req, res: Response, next: NextFunction) => {
  try { res.json(await svc.updateDiscountRule(req.params.id, req.body)); } catch (e) { next(e); }
});
discountRulesRouter.delete('/:id', authenticate, requireAdmin, async (req, res: Response, next: NextFunction) => {
  try { await svc.deleteDiscountRule(req.params.id); res.json({ ok: true }); } catch (e) { next(e); }
});
