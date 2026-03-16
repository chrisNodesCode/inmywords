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
| Framework | Next.js 15 (App Router) |
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

**The solution is a two-layer bypass** controlled by a single env flag.

### Layer 1 — Middleware

In `middleware.ts` (or `src/proxy.ts` depending on project structure), add this at the top of
the `clerkMiddleware` callback:

```typescript
import { NextResponse } from "next/server";

// inside clerkMiddleware(async (auth, request) => { ... }):
if (process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true') {
  return NextResponse.next();
}
```

### Layer 2 — API Routes

For any route that calls `auth()` to get a `userId`, add a mock fallback:

```typescript
const clerkId = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true'
  ? 'dev-user-local'
  : (await auth()).userId;
```

Apply this pattern to every API route that uses `auth()`. Do not leave any route relying
on a real Clerk session while the bypass flag is active or those routes will fail.

### First-Time Login

The middleware bypass removes server-side redirects, but Clerk's client-side SDK still runs
in the browser. On first preview load you will see a Clerk sign-in screen.

- Sign in once using **email only** — SSO (Google, GitHub) is permanently blocked in the
  preview panel due to cross-origin sandboxing
- The session cookie persists across server restarts for approximately 7 days
- No re-authentication is needed until the session expires

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
- [ ] `prisma db pull` on `nameless-block` — confirm clean state
- [ ] Clerk dev bypass implemented in `middleware.ts` (both layers)
- [ ] Prisma `JournalEntry` schema defined and migrated
- [ ] API routes: POST / GET / GET[id] / PATCH / DELETE `/api/entries`
- [ ] Basic journal UI: textarea + submit + entry list
- [ ] Smoke test: entry persists, retrieves, userId is present on record

---

## What Is InMyWords

A neurodivergent self-advocacy journaling tool. The core loop:

**Capture → LLM categorizes → User confirms → Export clinician/HR-ready PDF**

North star: *"You lived it. InMyWords helps you say it."*

Phase 2 adds AI categorization via Vercel AI SDK + Anthropic SDK.
Phase 3 adds PDF export via @react-pdf/renderer.
Do not build ahead of the current phase.