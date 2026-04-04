import type { Job } from 'bullmq';
import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import pino, { type Logger } from 'pino';

export type NotificationJob = Pick<Job, 'id' | 'name' | 'data'>;

export function resolveRedisUrl(redisUrl = process.env.REDIS_URL) {
  return redisUrl ?? 'redis://localhost:6379';
}

export function createRedisConnection(redisUrl = resolveRedisUrl()) {
  return new Redis(redisUrl, {
    maxRetriesPerRequest: null
  });
}

export async function processNotificationJob(job: NotificationJob, now = new Date()) {
  return {
    jobId: job.id ?? null,
    name: job.name,
    processedAt: now.toISOString()
  };
}

export function createNotificationWorker({
  logger = pino(),
  connection = createRedisConnection()
}: {
  logger?: Logger;
  connection?: Redis;
} = {}) {
  const worker = new Worker(
    'notifications',
    async (job) => {
      logger.info({ jobId: job.id, name: job.name, data: job.data }, 'Processing job');
      return processNotificationJob(job);
    },
    { connection }
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Job completed');
  });

  worker.on('failed', (job, error) => {
    logger.error({ jobId: job?.id, error }, 'Job failed');
  });

  return worker;
}
