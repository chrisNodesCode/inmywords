// Prisma 7 config for Chris's Playground DB — kept entirely separate from the
// InMyWords config (prisma.config.ts). Use via the --config flag, e.g.:
//   prisma migrate dev --config ./prisma-playground.config.ts
// (the npm "playground:*" scripts wrap this for you).
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma-playground/schema.prisma",
  migrations: {
    path: "prisma-playground/migrations",
  },
  datasource: {
    // ⚠️ Playground DB ONLY. Never point this at the InMyWords database.
    // CLI migrations use the unpooled (direct) connection — Neon recommends
    // bypassing the pgbouncer pooler for migrate operations. Falls back to the
    // pooled URL if a direct one isn't set.
    url:
      process.env["PLAYGROUND_DIRECT_URL"] ||
      process.env["PLAYGROUND_DATABASE_URL"]!,
  },
});
