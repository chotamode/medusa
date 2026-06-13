import { loadEnv, defineConfig } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

const REDIS_URL = process.env.REDIS_URL

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: REDIS_URL,
    // "shared" (default) runs API + background jobs in one process — fine for a
    // single small instance. To scale, deploy two instances of this image:
    // one with MEDUSA_WORKER_MODE=server (+ DISABLE_MEDUSA_ADMIN=false) and one
    // with MEDUSA_WORKER_MODE=worker (+ DISABLE_MEDUSA_ADMIN=true).
    workerMode:
      (process.env.MEDUSA_WORKER_MODE as "shared" | "server" | "worker") ||
      "shared",
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  admin: {
    // Disable the admin build on worker instances (keep enabled on the server).
    disable: process.env.DISABLE_MEDUSA_ADMIN === "true",
    // Public URL the statically-built admin uses to reach the backend. Leave
    // unset when the admin is served from the same origin (the default here).
    backendUrl: process.env.MEDUSA_BACKEND_URL,
  },
  // When REDIS_URL is set, use the Redis-backed event bus and workflow engine
  // so the app runs reliably across restarts (and multiple instances).
  modules: REDIS_URL
    ? [
        {
          resolve: "@medusajs/medusa/event-bus-redis",
          options: { redisUrl: REDIS_URL },
        },
        {
          resolve: "@medusajs/medusa/workflow-engine-redis",
          // `redisUrl` replaced the deprecated `redis.url` in v2.12.2+.
          options: { redis: { redisUrl: REDIS_URL } },
        },
      ]
    : [],
})
