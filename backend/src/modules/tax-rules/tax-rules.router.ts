import { Router, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireAdminOrInternal } from '../../middleware/role-guard';
import * as svc from './tax-rules.service';

export const taxRulesRouter = Router();
const auth = [authenticate, requireAdminOrInternal] as any[];

taxRulesRouter.get('/', async (_req, res: Response, next: NextFunction) => {
  try { res.json(await svc.listTaxRules()); } catch (e) { next(e); }
});
taxRulesRouter.get('/:id', ...auth, async (req: any, res: Response, next: NextFunction) => {
  try { res.json(await svc.getTaxRuleById(req.params.id)); } catch (e) { next(e); }
});
taxRulesRouter.post('/', ...auth, async (req: any, res: Response, next: NextFunction) => {
  try { res.status(201).json(await svc.createTaxRule(req.body)); } catch (e) { next(e); }
});
taxRulesRouter.put('/:id', ...auth, async (req: any, res: Response, next: NextFunction) => {
  try { res.json(await svc.updateTaxRule(req.params.id, req.body)); } catch (e) { next(e); }
});
taxRulesRouter.delete('/:id', ...auth, async (req: any, res: Response, next: NextFunction) => {
  try { await svc.deleteTaxRule(req.params.id); res.json({ ok: true }); } catch (e) { next(e); }
});
