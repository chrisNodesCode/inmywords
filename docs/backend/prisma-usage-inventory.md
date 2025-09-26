# Prisma Client Usage Inventory

This note documents every `new PrismaClient()` instantiation found within API route handlers, the NextAuth handler, and scripts. Each entry summarizes where the client is created, the runtime context, and any connection-lifetime considerations that may affect a shared-client refactor.

| File | Runtime context | Connection lifetime considerations |
| --- | --- | --- |
| `pages/api/account/index.js` | Next.js API Route (HTTP request lifecycle) | Fresh client per invocation; susceptible to connection exhaustion and slow warm-up in hot-reload/dev environments. |
| `pages/api/entries/[id].js` | Next.js API Route | Same per-request instantiation; repeated churn under load and during dev HMR. |
| `pages/api/entries/index.js` | Next.js API Route | Per-request client; handler imports adapter from NextAuth, increasing pressure during auth-heavy flows. |
| `pages/api/entries/reorder.js` | Next.js API Route | Per-request client; short-lived mutations but repeated on drag reorder operations. |
| `pages/api/groups/[id].js` | Next.js API Route | Same concerns; invoked for CRUD on groups. |
| `pages/api/groups/index.js` | Next.js API Route | Same concerns; list/create groups. |
| `pages/api/groups/reorder.js` | Next.js API Route | High-churn updates; per-request instantiation risks accumulating idle connections in dev. |
| `pages/api/notebooks/[id].js` | Next.js API Route | Same concerns; notebooks CRUD. |
| `pages/api/notebooks/[id]/tree.js` | Next.js API Route | Tree fetcher potentially hit frequently; creating new client each time can hurt cold-start latency. |
| `pages/api/notebooks/index.js` | Next.js API Route | Same concerns; notebooks listing/creation. |
| `pages/api/precursors/[id].js` | Next.js API Route | Same concerns; precursor detail operations. |
| `pages/api/precursors/index.js` | Next.js API Route | Same concerns; precursor list/create. |
| `pages/api/subgroups/[id].js` | Next.js API Route | Same concerns; subgroup detail. |
| `pages/api/subgroups/index.js` | Next.js API Route | Same concerns; subgroup list/create. |
| `pages/api/subgroups/reorder.js` | Next.js API Route | High-frequency reorder calls; repeated instantiations in quick succession. |
| `pages/api/tags/[id].js` | Next.js API Route | Same concerns; tag detail updates. |
| `pages/api/tags/index.js` | Next.js API Route | Same concerns; tag list/create. |
| `pages/api/stripe/webhook.js` | Next.js API Route (Edge-disabled webhook) | Webhook handler may run in long-lived background context depending on deployment; repeated instantiation risks exceeding connection limits during bursty webhook deliveries. |
| `pages/api/auth/[...nextauth].js` | NextAuth handler (API Route) | Client persisted across adapter and callbacks per invocation only; Next.js dev hot-reloads spawn new clients, potentially exhausting DB connections. |
| `prisma/seed.mjs` | Node.js script | Script-run instantiation (non-serverless); long-running seed tasks safe but should share clients if invoked alongside API handlers to avoid extra connections. |

## Notes

* Every API route currently creates a distinct `PrismaClient` on module load, which in the Vercel/Next.js dev server results in a new database connection for each reloaded module.
* None of the handlers explicitly call `$disconnect()`, so leaked connections can accumulate in local development where modules are re-evaluated on each hot reload.
* The seed script correctly relies on a single client during its run, but does not share a singleton with the rest of the app, so a shared utility could further standardize configuration.
* No background job workers were found instantiating `PrismaClient`, but the webhook route may execute in an environment with longer-lived processes compared to standard API routes.
