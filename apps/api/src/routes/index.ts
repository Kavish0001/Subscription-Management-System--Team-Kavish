import { Router } from 'express';

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
