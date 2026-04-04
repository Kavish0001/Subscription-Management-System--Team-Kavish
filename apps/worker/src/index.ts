import 'dotenv/config';

import pino from 'pino';

import { createNotificationWorker, createRedisConnection } from './worker.js';

const logger = pino();
const redisConnection = createRedisConnection();
const worker = createNotificationWorker({ logger, connection: redisConnection });

logger.info('Worker started');

async function shutdown() {
  await worker.close();
  redisConnection.disconnect();
}

process.on('SIGINT', () => {
  void shutdown();
});

process.on('SIGTERM', () => {
  void shutdown();
});
