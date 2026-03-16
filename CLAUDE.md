# CLAUDE.md — InMyWords

This file provides essential context for Claude Code working on the InMyWords project.
Read this before taking any action on files, the database, or deployments.

Project folder: /Users/fto-chrislam/Desktop/imw-dev

---

## ⚠️ Critical: Database Isolation

This project uses a dedicated Neon serverless Postgres database.

- **InMyWords DB identifier:** `nameless-block`
- **BaseTracer DB identifier:** `broad-math`

These are completely separate databases. **Never share or swap DATABASE_URL between projects.**
Before running any `prisma migrate` or `prisma db push`, verify the connection string in `.env.local`
contains `nameless-block`. If you are unsure, stop and ask.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Frontend | React + Tailwind CSS + shadcn/ui |
| Auth | Clerk |
| Database | Neon (serverless Postgres) via Vercel integration |
| ORM | Prisma |
| AI (Phase 2) | Vercel AI SDK + Anthropic SDK |
| PDF (Phase 3) | @react-pdf/renderer |
| Deployment | Vercel |
| Node version | 24.x |

---

## Auth: Clerk Dev Bypass for Claude Code Desktop Preview

Claude Code Desktop's built-in preview panel cannot complete Clerk's auth flow out of the box.
Clerk redirects unauthenticated requests server-side and runs a client-side SDK that checks for
a session cookie. SSO providers (Google, GitHub) are additionally blocked because the preview
panel sandboxes cross-origin OAuth redirects.

**The solution is a three-layer bypass** controlled by a single env flag.

### Layer 1 — proxy.ts (middleware)

Do NOT use `clerkMiddleware()` when bypass is active. Even returning `NextResponse.next()`
from inside `clerkMiddleware()` still adds `x-middleware-rewrite` and `x-clerk-auth-*`
response headers that cause the preview panel's embedded Chrome browser to abort navigation.
Use a plain pass-through function instead:

```typescript
import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export const proxy =
  process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true"
    ? (_request: NextRequest) => NextResponse.next()
    : clerkMiddleware();

export const config = { matcher: [...] };
```

### Layer 2 — API Routes

`auth()` from Clerk throws if `clerkMiddleware()` hasn't run for that request. So the bypass
check must happen BEFORE calling `auth()` — make `getUserId` async and short-circuit:

```typescript
async function getUserId(): Promise<string | null> {
  if (process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true") {
    return "dev-user-local";   // auth() never called
  }
  const { userId } = await auth();
  return userId;
}
```

Apply this pattern to every API route. Call `await getUserId()` instead of `getUserId(await auth())`.

### Layer 3 — Layout (ClerkProvider)

In `app/layout.tsx`, skip ClerkProvider entirely when bypass is active. Clerk's client SDK
detects a missing "dev browser token" and redirects to `clerk.accounts.dev` to acquire one.
That external redirect is blocked in the preview panel sandbox, aborting the page load.

```typescript
const devBypass = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true";

export default function RootLayout({ children }) {
  const body = <html>...</html>;
  if (devBypass) return body;          // no Clerk client SDK
  return <ClerkProvider>{body}</ClerkProvider>;
}
```

### Private Network Access header (next.config.ts)

Chrome blocks embedded browsers (public origin) from loading localhost (private network)
unless the server opts in. Add to `next.config.ts`:

```typescript
async headers() {
  return [{
    source: "/(.*)",
    headers: [{ key: "Access-Control-Allow-Private-Network", value: "true" }],
  }];
},
```

### First-Time Login (Production / Vercel Preview)

When `DEV_BYPASS_AUTH` is not set, Clerk is fully active. Sign in with **email only** —
SSO (Google, GitHub) may have issues in some sandboxed environments.

### Env Flag

Add to `.env.local` only — this file is gitignored and must never be committed:

```
NEXT_PUBLIC_DEV_BYPASS_AUTH=true
```

### Environment Rules

| Environment | `DEV_BYPASS_AUTH` | Clerk Active |
|---|---|---|
| `.env.local` (Claude Code) | `true` | ❌ |
| Vercel Preview | not set | ✅ |
| Vercel Production | not set | ✅ |

**Never add `DEV_BYPASS_AUTH` to Vercel environment variables. It must only exist in `.env.local`.**

---

## Dev Server Management

Use `preview_start` (not raw `npm run dev` in Bash) to start the development server inside
Claude Code. Running `npm run dev` directly in Bash can cause `.next/dev/lock` conflicts.

If a stale lock exists:
```bash
pkill -f "next dev"
rm -f .next/dev/lock
```
Then call `preview_start` again.

Configure `preview_start` with a named config in `.claude/launch.json`.

---

## Database Rules

- **Every** Prisma query touching `JournalEntry` must include `where: { userId }`.
- There are no exceptions. Never use a naked `findMany()` without a userId filter.
- The `userId` field maps to the Clerk user ID (or `dev-user-local` in dev bypass mode).

```typescript
// ✅ Correct
const entries = await prisma.journalEntry.findMany({
  where: { userId },
  orderBy: { createdAt: 'desc' },
});

// ❌ Never do this
const entries = await prisma.journalEntry.findMany();
```

---

## Notion: Token-Efficient Workflow

This project uses Notion for planning documentation. When referencing Notion during a session,
**do not fetch all child pages**. Fetch only the specific page needed using the IDs below.

| Page | ID |
|---|---|
| 📁 InMyWords (root) | `325f9ee1-d6e2-81d9-aee0-c4c2e6b943aa` |
| 🏠 Home | `325f9ee1-d6e2-813d-8ac8-e2348c2ff416` |
| 🎯 Vision & North Star | `325f9ee1-d6e2-814e-a8ac-edd05756765e` |
| 🗺️ Roadmap | `325f9ee1-d6e2-8104-83c2-d606120e6061` |
| 🏗️ Technical Architecture | `325f9ee1-d6e2-8190-8605-e33e4c69517b` |
| 📋 Feature Backlog | `325f9ee1-d6e2-8194-be34-f85f5f1fe10f` |
| 📓 Dev Log | `325f9ee1-d6e2-81a1-b1c6-f7f100684e1b` |
| 🗃️ Backlog DB | data source `a1b7bdce-bffb-4671-973d-a0a3d3f213d2` |

When starting a task, fetch only the relevant ticket. When completing a task, update its
`Status` to `Done`. When adding new work, create a new row in the Backlog DB.

---

## Current Phase: 0 — Rebuild

**Goal:** Restore working journal app with stable DB, correct env wiring, Clerk bypass,
and basic CRUD. Phase 0 is complete when a journal entry can be created and retrieved
and every record in the DB has a `userId` attached.

### Phase 0 checklist
- [x] `prisma db pull` on `nameless-block` — confirm clean state
- [x] Clerk dev bypass implemented (three layers: proxy.ts, API routes, layout.tsx)
- [x] Prisma `JournalEntry` schema defined and migrated (`20260316155118_init`)
- [x] API routes: POST / GET / GET[id] / PATCH / DELETE `/api/entries`
- [x] Basic journal UI: textarea + submit + entry list
- [x] Smoke test: entry persists, retrieves, userId is present on record
- [x] Preview panel working end-to-end (create entry from UI, appears in list)

---

## What Is InMyWords

A neurodivergent self-advocacy journaling tool. The core loop:

**Capture → LLM categorizes → User confirms → Export clinician/HR-ready PDF**

North star: *"You lived it. InMyWords helps you say it."*

Phase 2 adds AI categorization via Vercel AI SDK + Anthropic SDK.
Phase 3 adds PDF export via @react-pdf/renderer.
Do not build ahead of the current phase.