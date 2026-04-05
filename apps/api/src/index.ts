import dns from 'node:dns';

import { createApp } from './app.js';
import { env } from './config/env.js';
import { mailer } from './lib/email.js';
import { logger } from './lib/logger.js';

dns.setDefaultResultOrder('ipv4first');

const app = createApp();

app.listen(env.PORT, async () => {
  logger.info(`API listening on http://localhost:${env.PORT}`);
  await mailer.checkConnection();
});
