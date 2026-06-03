// Prisma 7 config — URLs live here, not in schema.prisma
// npm install --save-dev prisma dotenv
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"]!,
    // Shadow DB is only needed for `prisma migrate dev` / `migrate diff
    // --from-migrations`. Neon's pooled connection can't CREATE DATABASE, so
    // point this at a throwaway Postgres (local or a separate Neon db) when you
    // run those commands. Unset in normal app runtime. See CLAUDE.md.
    shadowDatabaseUrl: process.env["SHADOW_DATABASE_URL"],
  },
});
