FROM node:20-alpine
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --filter @subscription/api... --no-frozen-lockfile

COPY . .

RUN pnpm --filter @subscription/api prisma:generate
RUN pnpm --filter @subscription/shared build
RUN pnpm --filter @subscription/api build

EXPOSE 4000

CMD ["pnpm", "--filter", "@subscription/api", "start"]
