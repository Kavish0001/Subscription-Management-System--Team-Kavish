FROM node:20-alpine
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/worker/package.json apps/worker/package.json

RUN pnpm install --filter @subscription/worker --no-frozen-lockfile

COPY . .

RUN pnpm --filter @subscription/worker build

CMD ["pnpm", "--filter", "@subscription/worker", "start"]
