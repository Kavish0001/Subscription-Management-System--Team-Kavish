import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { requireAdminOrInternal, requireAnyAuth } from '../../middleware/role-guard';
import { getMyContacts, listContacts, getContactById, createContact, updateContact, updateAddress, createAddress } from './contacts.service';

export const contactsRouter = Router();

contactsRouter.get('/me', authenticate, requireAnyAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json(await getMyContacts(req.user!.userId)); } catch (e) { next(e); }
});

contactsRouter.get('/', authenticate, requireAdminOrInternal, async (_req, res: Response, next: NextFunction) => {
  try { res.json(await listContacts()); } catch (e) { next(e); }
});

contactsRouter.get('/:id', authenticate, requireAdminOrInternal, async (req, res: Response, next: NextFunction) => {
  try { res.json(await getContactById(req.params.id)); } catch (e) { next(e); }
});

contactsRouter.post('/', authenticate, requireAnyAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.status(201).json(await createContact({ ...req.body, userId: req.user!.role === 'portal_user' ? req.user!.userId : req.body.userId })); } catch (e) { next(e); }
});

contactsRouter.put('/:id', authenticate, requireAnyAuth, async (req, res: Response, next: NextFunction) => {
  try { res.json(await updateContact(req.params.id, req.body)); } catch (e) { next(e); }
});

contactsRouter.put('/:id/addresses/:addressId', authenticate, requireAnyAuth, async (req, res: Response, next: NextFunction) => {
  try { res.json(await updateAddress(req.params.addressId, req.body)); } catch (e) { next(e); }
});

contactsRouter.post('/:id/addresses', authenticate, requireAnyAuth, async (req, res: Response, next: NextFunction) => {
  try { res.status(201).json(await createAddress(req.params.id, req.body)); } catch (e) { next(e); }
});
