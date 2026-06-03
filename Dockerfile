# syntax=docker/dockerfile:1

# --- Build stage: install everything and build all three packages ----------------------
FROM node:22-bookworm-slim AS builder
RUN corepack enable
# OpenSSL is required by Prisma's query engine.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm -r build

# --- Runtime stage: serve API + WS + built PWA from one Fastify process -----------------
FROM node:22-bookworm-slim AS runtime
RUN corepack enable && corepack prepare pnpm@11.1.1 --activate
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL=file:/data/app.db
ENV WEB_DIST=/app/apps/web/dist

# Bring over the fully built & installed workspace (incl. generated Prisma client).
COPY --from=builder /app /app
COPY docker-entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# SQLite database lives on a mounted volume so data survives container restarts.
VOLUME ["/data"]
EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
