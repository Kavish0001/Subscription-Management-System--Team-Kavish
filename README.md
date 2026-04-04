# Veltrix

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

## Quality gates
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

## Automation
- `.github/workflows/ci.yml` runs Prisma client generation, lint, typecheck, tests, Prisma validation, and builds on pull requests and pushes to `main`.
- `.github/workflows/cd.yml` verifies the repo on `main`, builds the API and worker Docker images, and uploads packaged build artifacts for the web, API, and worker outputs.
