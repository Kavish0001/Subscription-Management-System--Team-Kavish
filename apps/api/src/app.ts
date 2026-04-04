import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import pinoHttp from 'pino-http';

import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { errorHandler } from './middleware/error-handler.js';
import { apiRouter } from './routes/index.js';

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.APP_URL,
      credentials: true
    }),
  );
  app.use(helmet());
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(
    pinoHttp({
      logger
    }),
  );
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 200,
      standardHeaders: true,
      legacyHeaders: false
    }),
  );

  app.use('/api/v1', apiRouter);
  app.use(errorHandler);

  return app;
}
