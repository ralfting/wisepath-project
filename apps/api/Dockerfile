# API image for local development with docker compose.
# Build from the repository root: docker build -f apps/api/Dockerfile .

FROM node:20-bookworm-slim

# OpenSSL for the Prisma query engine
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

WORKDIR /repo

# Install dependencies first so they are cached until a manifest or the lockfile changes
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/api/package.json apps/api/
# The workspace packages the API bundles (domain rules, HTTP contract)
COPY packages/domain/package.json packages/domain/
COPY packages/contract/package.json packages/contract/
RUN pnpm install --frozen-lockfile --filter "@wisepath/api..."

COPY prisma prisma
COPY packages packages
COPY apps/api apps/api

WORKDIR /repo/apps/api
RUN pnpm exec prisma generate && pnpm build

ENV NODE_ENV=development \
    HOST=0.0.0.0 \
    PORT=3001
EXPOSE 3001

# Apply pending migrations, then start the API
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/main"]
