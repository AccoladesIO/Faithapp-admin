# syntax=docker/dockerfile:1
#
# Production image for the Discovery Hub Admin Portal (Next.js).
#
# Build:
#   docker build \
#     --build-arg NEXT_PUBLIC_API_URL=https://api.example.com/v1 \
#     --build-arg NEXT_PUBLIC_PRODUCT_NAME="Discovery Hub" \
#     --build-arg NEXT_PUBLIC_CHURCH_NAME="Your Church" \
#     --build-arg NEXT_PUBLIC_LOGO_URL=https://example.com/logo.png \
#     --build-arg NEXT_PUBLIC_CURRENCY_SYMBOL='$' \
#     --build-arg NEXT_PUBLIC_CURRENCY_LOCALE=en-US \
#     -t discovery-hub-admin .
#
# Run:
#   docker run -p 3000:3000 discovery-hub-admin
#
# NEXT_PUBLIC_* values are inlined into the JS bundle at build time (this is
# how Next.js works), so changing one always requires a rebuild — there is no
# runtime override for them. Everything else the app needs is read at request
# time and can be passed with `docker run -e VAR=value`.

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN corepack enable

# ---- Install dependencies (cached separately from source for fast rebuilds) ----
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    HUSKY=0 pnpm install --frozen-lockfile

# ---- Build ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_PRODUCT_NAME
ARG NEXT_PUBLIC_CHURCH_NAME
ARG NEXT_PUBLIC_LOGO_URL
ARG NEXT_PUBLIC_CURRENCY_SYMBOL
ARG NEXT_PUBLIC_CURRENCY_LOCALE
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_PRODUCT_NAME=$NEXT_PUBLIC_PRODUCT_NAME \
    NEXT_PUBLIC_CHURCH_NAME=$NEXT_PUBLIC_CHURCH_NAME \
    NEXT_PUBLIC_LOGO_URL=$NEXT_PUBLIC_LOGO_URL \
    NEXT_PUBLIC_CURRENCY_SYMBOL=$NEXT_PUBLIC_CURRENCY_SYMBOL \
    NEXT_PUBLIC_CURRENCY_LOCALE=$NEXT_PUBLIC_CURRENCY_LOCALE \
    NEXT_TELEMETRY_DISABLED=1

RUN pnpm build

# ---- Runtime (minimal — only the standalone server output + static assets) ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1

CMD ["node", "server.js"]
