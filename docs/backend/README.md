# Backend Developer Guide

## Shared Prisma Client

All API routes, auth handlers, and backend utilities must import the singleton Prisma client from `@/api/prismaClient` instead of constructing their own `PrismaClient` instances. This module wraps the generated client with a `globalThis` guard so hot reloading in development and module re-evaluation in serverless runtimes reuse the same connection.

```js
import prisma from '@/api/prismaClient';
```

### Script Lifecycle Etiquette

Long-running scripts (e.g., `prisma/seed.mjs`) should import the same helper and call the exported `disconnectPrisma` function in a `finally` block before exiting. This ensures Node processes release database connections cleanly and resets the cached client for follow-up runs.

```js
import prisma, { disconnectPrisma } from '@/api/prismaClient.js';

async function main() {
  // ... script logic that uses prisma ...
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });
```

Avoid calling `new PrismaClient()` directly anywhere outside `src/api/prismaClient.js`. An ESLint rule enforces this convention to prevent accidental connection churn.
