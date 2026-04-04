import { Router } from 'express';

import { authRouter } from '../modules/auth/auth.routes.js';
import { billingRouter } from '../modules/billing/billing.routes.js';
import { catalogRouter } from '../modules/catalog/catalog.routes.js';
import { contactsRouter } from '../modules/contacts/contact.routes.js';
import { reportsRouter } from '../modules/reports/report.routes.js';
import { subscriptionsRouter } from '../modules/subscriptions/subscription.routes.js';
import { usersRouter } from '../modules/users/user.routes.js';

export const apiRouter = Router();

apiRouter.get('/health', (_request, response) => {
  response.json({
    data: {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }
  });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/contacts', contactsRouter);
apiRouter.use('/', catalogRouter);
apiRouter.use('/subscriptions', subscriptionsRouter);
apiRouter.use('/', billingRouter);
apiRouter.use('/reports', reportsRouter);
