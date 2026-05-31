# Chris's Playground — DB & area

A deliberately separate corner of the InMyWords repo. Lives at `/chris`, has its
own database, and does not share data with InMyWords.

## What's isolated

| Concern | InMyWords | Playground |
|---|---|---|
| Route | `/`, `/journal`, … | `/chris/*` |
| Layout | root + Sidebar + IMW theme | `app/chris/layout.tsx` (self-contained) |
| Prisma schema | `prisma/schema.prisma` | `prisma-playground/schema.prisma` |
| Prisma config | `prisma.config.ts` | `prisma-playground.config.ts` |
| Generated client | `lib/generated/prisma` | `lib/generated/playground` |
| DB client import | `@/lib/prisma` → `prisma` | `@/lib/playground-db` → `playgroundDb` |
| Connection string | `DATABASE_URL` (`nameless-block`) | `PLAYGROUND_DATABASE_URL` (separate Neon project) |

Shared (intentionally, to avoid new Vercel/Neon charges): the same Next.js app
and the same Vercel project/deployment. `/chris` ships as a route, not a new
project — so it costs nothing extra to host.

## One-time setup (when ready)

1. In the new Neon project, copy the pooled connection string.
2. Paste it into **both** `.env` and `.env.local` as `PLAYGROUND_DATABASE_URL`
   (`.env` is read by the Prisma CLI; `.env.local` by the Next.js runtime).
3. Create the client + first migration:
   ```bash
   npm run playground:migrate    # creates tables + generates the client
   npm run playground:generate   # (re)generate the client only
   ```
4. Optional: `npm run playground:studio` to browse the playground DB.

> ⚠️ The playground scripts use `--config ./prisma-playground.config.ts` so they
> can **never** touch the InMyWords `nameless-block` database. Always use the
> `playground:*` scripts for playground DB work.

## Using the client in code

```ts
import { playgroundDb } from "@/lib/playground-db";

const todos = await playgroundDb.todo.findMany({ where: { userId } });
```

## Modules

| Module | Route | API | Status |
|---|---|---|---|
| To-dos | `app/chris/todos/page.tsx` | `app/chris/api/todos/*` | ✅ live |
