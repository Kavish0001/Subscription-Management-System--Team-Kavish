import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireAdminOrInternal } from '../../middleware/role-guard';
import * as svc from './catalog.service';

export const catalogRouter = Router();

// Categories
catalogRouter.get('/categories', async (_req, res: Response, next: NextFunction) => {
  try { res.json(await svc.listCategories()); } catch (e) { next(e); }
});
catalogRouter.post('/categories', authenticate, requireAdminOrInternal, async (req, res: Response, next: NextFunction) => {
  try { res.status(201).json(await svc.createCategory(req.body.name)); } catch (e) { next(e); }
});

// Attributes
catalogRouter.get('/attributes', authenticate, requireAdminOrInternal, async (_req, res: Response, next: NextFunction) => {
  try { res.json(await svc.listAttributes()); } catch (e) { next(e); }
});
catalogRouter.get('/attributes/:id', authenticate, requireAdminOrInternal, async (req, res: Response, next: NextFunction) => {
  try { res.json(await svc.getAttributeById(req.params.id)); } catch (e) { next(e); }
});
catalogRouter.post('/attributes', authenticate, requireAdminOrInternal, async (req, res: Response, next: NextFunction) => {
  try { res.status(201).json(await svc.createAttribute(req.body)); } catch (e) { next(e); }
});
catalogRouter.put('/attributes/:id', authenticate, requireAdminOrInternal, async (req, res: Response, next: NextFunction) => {
  try { res.json(await svc.updateAttribute(req.params.id, req.body)); } catch (e) { next(e); }
});
catalogRouter.delete('/attributes/:id', authenticate, requireAdminOrInternal, async (req, res: Response, next: NextFunction) => {
  try { await svc.deleteAttribute(req.params.id); res.json({ ok: true }); } catch (e) { next(e); }
});
catalogRouter.post('/attributes/:id/values', authenticate, requireAdminOrInternal, async (req, res: Response, next: NextFunction) => {
  try { res.status(201).json(await svc.addAttributeValue(req.params.id, req.body)); } catch (e) { next(e); }
});
catalogRouter.put('/attributes/:id/values/:valueId', authenticate, requireAdminOrInternal, async (req, res: Response, next: NextFunction) => {
  try { res.json(await svc.updateAttributeValue(req.params.valueId, req.body)); } catch (e) { next(e); }
});
