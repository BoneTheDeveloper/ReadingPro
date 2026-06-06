FROM mcr.microsoft.com/playwright:v1.60.0-noble

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma

RUN corepack enable && pnpm install --frozen-lockfile --ignore-scripts

COPY . .

RUN pnpm prisma generate --generator client

ENV CI=true

CMD ["pnpm", "e2e"]
