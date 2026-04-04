import { Router } from 'express';

import { prisma } from '../../lib/prisma.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

export const contactsRouter = Router();

contactsRouter.use(requireAuth);

contactsRouter.get('/', requireRole('admin', 'internal_user'), async (_request, response) => {
  const contacts = await prisma.contact.findMany({
    include: { addresses: true },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  response.json({ data: contacts });
});
