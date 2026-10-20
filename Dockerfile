# syntax=docker/dockerfile:1.7
#
# Multi-stage build. Build-time does NOT touch the database: the home page and
# sitemap are force-dynamic and no module-level Prisma query exists.

FROM node:22-bookworm-slim AS base
WORKDIR /app
# openssl is required by Prisma engines; libc6-compat keeps sharp happy on alpine/glibc edge cases.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm@9.12.0 \
    && pnpm install --frozen-lockfile

FROM deps AS builder
COPY . .
RUN pnpm exec prisma generate \
    && pnpm build

FROM base AS migrator
COPY prisma ./prisma
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm@9.12.0 \
    && pnpm install --frozen-lockfile --prod \
    && pnpm exec prisma generate
CMD ["pnpm", "exec", "prisma", "migrate", "deploy"]

FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    UPLOAD_DIR=/data/uploads

RUN groupadd --gid 1001 nodejs \
    && useradd --uid 1001 --gid nodejs --create-home nextjs \
    && mkdir -p /data/uploads \
    && chown -R nextjs:nodejs /data

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
