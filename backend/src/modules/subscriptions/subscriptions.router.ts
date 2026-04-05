import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { requireAdminOrInternal, requireAnyAuth } from '../../middleware/role-guard';
import * as svc from './subscriptions.service';

export const subscriptionsRouter = Router();

subscriptionsRouter.get('/my', authenticate, requireAnyAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json(await svc.getMySubscriptions(req.user!.userId)); } catch (e) { next(e); }
});

subscriptionsRouter.get('/', authenticate, requireAdminOrInternal, async (_req, res: Response, next: NextFunction) => {
  try { res.json(await svc.listSubscriptions()); } catch (e) { next(e); }
});

subscriptionsRouter.get('/:id', authenticate, requireAnyAuth, async (req, res: Response, next: NextFunction) => {
  try { res.json(await svc.getSubscriptionById(req.params.id)); } catch (e) { next(e); }
});

subscriptionsRouter.post('/', authenticate, requireAnyAuth, async (req, res: Response, next: NextFunction) => {
  try { res.status(201).json(await svc.createSubscription(req.body)); } catch (e) { next(e); }
});

subscriptionsRouter.put('/:id', authenticate, requireAdminOrInternal, async (req, res: Response, next: NextFunction) => {
  try { res.json(await svc.updateSubscription(req.params.id, req.body)); } catch (e) { next(e); }
});

subscriptionsRouter.delete('/:id', authenticate, requireAdminOrInternal, async (req, res: Response, next: NextFunction) => {
  try { await svc.deleteSubscription(req.params.id); res.json({ ok: true }); } catch (e) { next(e); }
});

subscriptionsRouter.post('/:id/send-quotation', authenticate, requireAdminOrInternal, async (req, res: Response, next: NextFunction) => {
  try { res.json(await svc.sendQuotation(req.params.id)); } catch (e) { next(e); }
});

subscriptionsRouter.post('/:id/confirm', authenticate, requireAdminOrInternal, async (req, res: Response, next: NextFunction) => {
  try { res.json(await svc.confirmSubscription(req.params.id)); } catch (e) { next(e); }
});

subscriptionsRouter.post('/:id/renew', authenticate, requireAnyAuth, async (req, res: Response, next: NextFunction) => {
  try { res.json(await svc.renewSubscription(req.params.id)); } catch (e) { next(e); }
});

subscriptionsRouter.post('/:id/close', authenticate, requireAnyAuth, async (req, res: Response, next: NextFunction) => {
  try { res.json(await svc.closeSubscription(req.params.id)); } catch (e) { next(e); }
});
