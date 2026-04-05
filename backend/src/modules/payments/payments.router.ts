import { Router, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireAnyAuth } from '../../middleware/role-guard';
import { mockPayment } from './payments.service';

export const paymentsRouter = Router();

paymentsRouter.post('/mock', authenticate, requireAnyAuth, async (req, res: Response, next: NextFunction) => {
  try { res.json(await mockPayment(req.body.invoiceId)); } catch (e) { next(e); }
});
