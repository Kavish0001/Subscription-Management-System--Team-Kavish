import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { requireAdmin, requireAdminOrInternal } from '../../middleware/role-guard';
import { listUsers, getUserById, createInternalUser, updateUser } from './users.service';

export const usersRouter = Router();

usersRouter.get('/', authenticate, requireAdminOrInternal, async (_req, res: Response, next: NextFunction) => {
  try { res.json(await listUsers()); } catch (e) { next(e); }
});

usersRouter.get('/:id', authenticate, requireAdminOrInternal, async (req, res: Response, next: NextFunction) => {
  try { res.json(await getUserById(req.params.id)); } catch (e) { next(e); }
});

usersRouter.post('/', authenticate, requireAdmin, async (req, res: Response, next: NextFunction) => {
  try { res.status(201).json(await createInternalUser(req.body)); } catch (e) { next(e); }
});

usersRouter.put('/:id', authenticate, requireAdmin, async (req, res: Response, next: NextFunction) => {
  try { res.json(await updateUser(req.params.id, req.body)); } catch (e) { next(e); }
});
