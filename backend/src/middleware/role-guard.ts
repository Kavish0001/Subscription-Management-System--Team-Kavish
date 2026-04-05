import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }
    if (!roles.includes(req.user.role)) { res.status(403).json({ error: 'Forbidden' }); return; }
    next();
  };
}

export const requireAdmin = requireRole('admin');
export const requireAdminOrInternal = requireRole('admin', 'internal_user');
export const requireAnyAuth = requireRole('admin', 'internal_user', 'portal_user');
