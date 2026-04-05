import { Router, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireAdminOrInternal, requireAnyAuth } from '../../middleware/role-guard';
import * as svc from './invoices.service';

export const invoicesRouter = Router();

invoicesRouter.get('/', authenticate, requireAdminOrInternal, async (_req, res: Response, next: NextFunction) => {
  try { res.json(await svc.listInvoices()); } catch (e) { next(e); }
});
invoicesRouter.get('/:id', authenticate, requireAnyAuth, async (req, res: Response, next: NextFunction) => {
  try { res.json(await svc.getInvoiceById(req.params.id)); } catch (e) { next(e); }
});
invoicesRouter.post('/', authenticate, requireAnyAuth, async (req, res: Response, next: NextFunction) => {
  try { res.status(201).json(await svc.createInvoiceFromSubscription(req.body.subscriptionOrderId)); } catch (e) { next(e); }
});
