import { Router, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireAdminOrInternal } from '../../middleware/role-guard';
import { getSummary } from './reports.service';

export const reportsRouter = Router();

reportsRouter.get('/summary', authenticate, requireAdminOrInternal, async (_req, res: Response, next: NextFunction) => {
  try { res.json(await getSummary()); } catch (e) { next(e); }
});
