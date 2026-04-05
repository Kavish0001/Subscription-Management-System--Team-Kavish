import { Router, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireAdminOrInternal } from '../../middleware/role-guard';
import * as svc from './payment-terms.service';

export const paymentTermsRouter = Router();
const auth = [authenticate, requireAdminOrInternal] as any[];

paymentTermsRouter.get('/', ...auth, async (_req, res: Response, next: NextFunction) => {
  try { res.json(await svc.listPaymentTerms()); } catch (e) { next(e); }
});
paymentTermsRouter.get('/:id', ...auth, async (req: any, res: Response, next: NextFunction) => {
  try { res.json(await svc.getPaymentTermById(req.params.id)); } catch (e) { next(e); }
});
paymentTermsRouter.post('/', ...auth, async (req: any, res: Response, next: NextFunction) => {
  try { res.status(201).json(await svc.createPaymentTerm(req.body)); } catch (e) { next(e); }
});
paymentTermsRouter.put('/:id', ...auth, async (req: any, res: Response, next: NextFunction) => {
  try { res.json(await svc.updatePaymentTerm(req.params.id, req.body)); } catch (e) { next(e); }
});
paymentTermsRouter.delete('/:id', ...auth, async (req: any, res: Response, next: NextFunction) => {
  try { await svc.deletePaymentTerm(req.params.id); res.json({ ok: true }); } catch (e) { next(e); }
});
