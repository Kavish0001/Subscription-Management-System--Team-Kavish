# Subscription Management System

Scalable monorepo scaffold for a subscription, billing, invoicing, and customer portal platform.

## Apps
- `apps/api`: Express API + Prisma + PostgreSQL
- `apps/web`: Vite React SPA with Tailwind CSS
- `apps/worker`: BullMQ worker for async jobs
- `packages/shared`: shared types, enums, and Zod contracts

## Quick start
1. `corepack enable`
2. `pnpm install`
3. `docker compose -f infra/docker/docker-compose.yml up -d`
4. `pnpm --filter @subscription/api prisma:migrate`
5. `pnpm --filter @subscription/api prisma:seed`
6. `pnpm dev`
