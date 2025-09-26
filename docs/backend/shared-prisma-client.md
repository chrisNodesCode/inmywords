# Shared Prisma Client Proposal

## Overview

This document proposes consolidating `PrismaClient` instantiation into a shared factory that is safe across:

* Next.js API routes and the NextAuth handler.
* Serverless/Vercel edge-disallowed Lambdas where each invocation may reuse the module cache.
* Long-lived Node.js processes used for background jobs or scripts (e.g., `prisma/seed.mjs`).
* Local development with hot module reloading, where repeated `new PrismaClient()` calls quickly exhaust database connection limits.

Our goal is to provide a single source of truth for client configuration, guard against duplicate connections, and simplify future connection pooling or logging enhancements.

## Requirements

1. **Singleton semantics in dev**: Ensure module reloads do not spawn unlimited connections. Adopt the `globalThis` cache pattern recommended by Prisma.
2. **Stateless serverless compatibility**: Maintain a lightweight factory that returns a cached instance when the module cache persists between invocations but falls back to a fresh client when cold-started.
3. **Background worker friendliness**: Support optional explicit lifecycle hooks (e.g., `$disconnect()`) for scripts or jobs that need to cleanly exit.
4. **Type-safe imports**: Continue using the generated Prisma client types without adding runtime dependencies beyond `@prisma/client`.
5. **Observability hooks**: Centralize where log levels, middlewares, and metrics instrumentation are configured.

## Proposed Module Structure

Create `lib/prisma.js` with the following shape:

```js
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
```

Key details:

* **Global cache**: Reuses the same instance across hot reloads by persisting it on `globalThis` in non-production environments.
* **Production behavior**: Relies on module caching between serverless invocations. If the function cold-starts, a new client is created, which is the same behavior as today but without multiplying clients within a warm runtime.
* **Extensibility**: Central location to configure logging, middlewares, or request-scoped context wrappers later.

## Usage Patterns

* **API routes / NextAuth**: Replace `new PrismaClient()` with `import prisma from '@/lib/prisma';`. No additional changes required.
* **Background jobs & scripts**: Import the same singleton. Long-running scripts that need to exit should `await prisma.$disconnect()` in a `finally` block to close the connection after use. Document this in script templates.
* **Testing utilities**: Tests can mock the module or instantiate isolated clients by clearing the cache in setup/teardown when needed.

## Hot Reload Safeguards

* The `globalThis` cache ensures that each HMR cycle reuses the existing client rather than creating a new instance.
* We will guard against multiple assignments by checking `globalForPrisma.prisma` before creating a new client.
* For Jest or Vitest environments that reload per test file, test setup can clear `globalForPrisma.prisma` to avoid cross-test bleed.

## Migration Plan

1. **Introduce `lib/prisma.js`** with the shared logic described above.
2. **Codemod imports** across `pages/api/**/*`, `pages/api/auth/[...nextauth].js`, and `prisma/seed.mjs` to use the shared module.
3. **Update `prisma/seed.mjs`** to disconnect explicitly at the end of the script via `await prisma.$disconnect()`.
4. **Add documentation** referencing the shared client in `docs/backend/prisma-usage-inventory.md` and developer onboarding materials.
5. **Regression testing**: Run unit/integration suites locally, smoke-test NextAuth flows, and exercise webhook endpoints.
6. **Monitor in staging**: Confirm no increase in database connections or latency.

## Open Questions

* Do we want to expose a helper for request-scoped middlewares (e.g., logging correlation IDs)?
- feedback: use your best judgement based on what most scalable apps like this one incorporate
* Should the shared module enforce a strict singleton in production by writing to `globalThis` as well, or keep the cache dev-only to avoid stale references during hot deploys?
- feedback: use your best judgement based on what most scalable apps like this one incorporate
* Are there background job runners outside the repo that also need this shared client?
- feedback: use your best judgement based on what most scalable apps like this one incorporate

## Review & Next Steps

* **Reviewers**: Backend (TBD), Infra (TBD). This proposal should be circulated to the respective teams for feedback before implementation.
* **Action item**: Gather reviewer comments and update this document with decisions on logging defaults, production caching strategy, and script disconnect patterns.

Once feedback is incorporated, proceed with the migration plan to roll out the shared client.
