# syntax=docker/dockerfile:1

# -----------------------------------------------------------------------------
# Production image for this Medusa application.
#
# Uses a glibc (Debian) base instead of Alpine/musl: Medusa's admin build
# (Vite/Rollup/esbuild) and image tooling (sharp) ship prebuilt native binaries
# that are far less troublesome on glibc. Multi-arch friendly: the official
# `node` images publish linux/amd64 and linux/arm64, so this builds natively on
# an ARM VPS. Build context is this `app/` directory.
# -----------------------------------------------------------------------------

ARG NODE_VERSION=20

# --- base -------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS base
WORKDIR /app
ENV CI=true

# --- deps: full deps needed to build ---------------------------------------
FROM base AS deps
# Toolchain for any dependency that compiles native bindings.
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* .npmrc* ./
# Use `npm install` (not `npm ci`) so platform-specific optional native deps
# (e.g. @rollup/rollup-linux-arm64-gnu) are resolved for the actual build
# architecture, even if the committed lockfile was generated elsewhere.
RUN \
  if [ -f yarn.lock ]; then corepack enable && yarn install --frozen-lockfile; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable && pnpm install --frozen-lockfile; \
  else npm install --no-audit --no-fund; fi

# --- build: compile server + bundle admin dashboard ------------------------
FROM deps AS build
COPY . .
ENV NODE_ENV=production
RUN npm run build
# Install prod-only deps inside the build output for a lean runtime.
RUN cd .medusa/server && \
  if [ -f /app/yarn.lock ]; then corepack enable && yarn install --frozen-lockfile --production; \
  else npm install --omit=dev --no-audit --no-fund; fi

# --- runner: minimal production image --------------------------------------
FROM base AS runner
ENV NODE_ENV=production \
    PORT=9000
RUN groupadd -r medusa && useradd -r -g medusa medusa
COPY --from=build --chown=medusa:medusa /app/.medusa/server ./
COPY --chown=medusa:medusa docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
USER medusa
EXPOSE 9000
# Healthcheck uses Node's built-in fetch (no extra packages needed on slim).
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||9000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
