import 'dotenv/config';

import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  APP_URL: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL: z.string().default('7d'),
  ADMIN_EMAIL: z.string().email().default('admin@example.com'),
  ADMIN_PASSWORD: z.string().min(9).default('Admin@1234'),
  ADMIN_NAME: z.string().default('System Admin'),
  MAIL_FROM: z.string().email().default('no-reply@example.com')
});

export const env = envSchema.parse(process.env);
