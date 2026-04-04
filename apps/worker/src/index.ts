import 'dotenv/config';

import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import pino from 'pino';

const logger = pino();
const redisConnection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null
});

const worker = new Worker(
  'notifications',
  async (job) => {
    logger.info({ jobId: job.id, name: job.name, data: job.data }, 'Processing job');
    return { processedAt: new Date().toISOString() };
  },
  { connection: redisConnection },
);

worker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Job completed');
});

worker.on('failed', (job, error) => {
  logger.error({ jobId: job?.id, error }, 'Job failed');
});

logger.info('Worker started');
