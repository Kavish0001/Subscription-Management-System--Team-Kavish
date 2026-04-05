import { Router, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireAdminOrInternal } from '../../middleware/role-guard';
import * as svc from './quotation-templates.service';

export const quotationTemplatesRouter = Router();
const auth = [authenticate, requireAdminOrInternal] as any[];

quotationTemplatesRouter.get('/', ...auth, async (_req, res: Response, next: NextFunction) => {
  try { res.json(await svc.listTemplates()); } catch (e) { next(e); }
});
quotationTemplatesRouter.get('/:id', ...auth, async (req: any, res: Response, next: NextFunction) => {
  try { res.json(await svc.getTemplateById(req.params.id)); } catch (e) { next(e); }
});
quotationTemplatesRouter.post('/', ...auth, async (req: any, res: Response, next: NextFunction) => {
  try { res.status(201).json(await svc.createTemplate(req.body)); } catch (e) { next(e); }
});
quotationTemplatesRouter.put('/:id', ...auth, async (req: any, res: Response, next: NextFunction) => {
  try { res.json(await svc.updateTemplate(req.params.id, req.body)); } catch (e) { next(e); }
});
quotationTemplatesRouter.delete('/:id', ...auth, async (req: any, res: Response, next: NextFunction) => {
  try { await svc.deleteTemplate(req.params.id); res.json({ ok: true }); } catch (e) { next(e); }
});
