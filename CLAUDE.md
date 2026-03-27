# CLAUDE.md — InMyWords

This file provides essential context for Claude Code working on the InMyWords project.
Read this before taking any action on files, the database, or deployments.

Project folder: /Users/fto-chrislam/Desktop/imw-dev/inmywords

---

## ⚠️ Critical: Database Isolation

This project uses a dedicated Neon serverless Postgres database.

- **InMyWords DB identifier:** `nameless-block`
- **BaseTracer DB identifier:** `broad-math`

These are completely separate databases. **Never share or swap DATABASE_URL between projects.**
Before running any `prisma migrate` or `prisma db push`, verify the connection string in `.env.local`
contains `nameless-block`. If you are unsure, stop and ask.

---

## Backlog Workflow (Required)

At the start of every session, search the Notion backlog for tickets relevant to the work being requested. The backlog data source URL is:
`collection://a1b7bdce-bffb-4671-973d-a0a3d3f213d2`

When you complete a ticket, immediately mark its Status as **Done** in Notion before moving to the next task. Do not batch updates at the end of a session — mark each ticket done as you finish it.

To update a ticket status, use the Notion MCP `notion-update-page` tool with:
```
command: update_properties
properties: { "Status": "Done" }
```

---

## Current State

Phases 0–3 are complete and deployed to production at https://inmywords.app.
The next milestone is **Phase 4 — Quiet Beta** (3–5 trusted ND users).

| Phase | Name | Status |
|---|---|---|
| 0 | Rebuild | ✅ Complete |
| 1 | Personal MVP | ✅ Complete |
| — | UI Redesign Sprint | ✅ Complete |
| 2 | AI Integration | ✅ Complete |
| 3 | Eval Prep | ✅ Complete |
| 4 | Quiet Beta | 🔜 Next |
| 5 | PDF Export | ⏳ Post-UAT |
| 6 | Monetization | 📋 Planned |

**Last known good commits:** `adb190b` (UI redesign) + `974a60e` (composer placeholder fix)

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.1.6 (App Router, Turbopack) |
| Language | TypeScript |
| Frontend | React + Tailwind CSS v4 (layout only) + shadcn/ui |
| Rich Text | TipTap v2 |
| Auth | Clerk |
| Database | Neon (`nameless-block`) via Prisma adapter |
| ORM | Prisma 7 (uses `prisma.config.ts`, NOT `schema.prisma` for DB URL) |
| AI | Vercel AI SDK v6 + Anthropic SDK (`@ai-sdk/anthropic`) |
| PDF | @react-pdf/renderer (Phase 5 — deferred) |
| Deployment | Vercel |
| Node | 24.x |

### Key Prisma Notes
- Prisma 7 no longer accepts `DATABASE_URL` inside `schema.prisma`. Connection string lives in `prisma.config.ts`.
- Always run `prisma generate` before `next build`. Build script: `"build": "prisma generate && next build"`.

### Key AI SDK Notes
- Use `maxOutputTokens` (not `maxTokens`) in Vercel AI SDK v6.
- Claude wraps JSON responses in markdown fences despite "Return ONLY valid JSON" instructions.
  Always strip before parsing:
  ```typescript
  text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
  ```

---

## Auth: Clerk Dev Bypass for Claude Code Desktop Preview

Claude Code Desktop's built-in preview panel cannot complete Clerk's auth flow out of the box.

**The solution is a three-layer bypass** controlled by a single env flag:
`NEXT_PUBLIC_DEV_BYPASS_AUTH=true` in `.env.local` only.

### Layer 1 — proxy.ts (middleware)

Do NOT use `clerkMiddleware()` when bypass is active. Even `NextResponse.next()` inside
`clerkMiddleware()` adds headers that abort preview panel navigation.

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

`auth()` throws if `clerkMiddleware()` hasn't run. Short-circuit before calling it:

```typescript
async function getUserId(): Promise<string | null> {
  if (process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true") {
    return "dev-user-local";
  }
  const { userId } = await auth();
  return userId;
}
```

### Layer 3 — Layout (ClerkProvider)

Clerk's client SDK redirects to `clerk.accounts.dev` if no dev browser token is found.
Skip ClerkProvider entirely in bypass mode:

```typescript
const devBypass = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true";

export default function RootLayout({ children }) {
  const body = <html>...</html>;
  if (devBypass) return body;
  return <ClerkProvider>{body}</ClerkProvider>;
}
```

### Private Network Access header (next.config.ts)

```typescript
async headers() {
  return [{
    source: "/(.*)",
    headers: [{ key: "Access-Control-Allow-Private-Network", value: "true" }],
  }];
},
```

### Environment Rules

| Environment | `DEV_BYPASS_AUTH` | Clerk Active |
|---|---|---|
| `.env.local` (Claude Code) | `true` | ❌ |
| Vercel Preview | not set | ✅ |
| Vercel Production | not set | ✅ |

**Never add `DEV_BYPASS_AUTH` to Vercel environment variables.**

---

## Dev Server Management

Use `preview_start` (not `npm run dev` in Bash) to avoid `.next/dev/lock` conflicts.

If a stale lock exists:
```bash
pkill -f "next dev"
rm -f .next/dev/lock
```
Then call `preview_start` again.

---

## Database Rules

Every Prisma query touching `JournalEntry` must include `where: { userId }`. No exceptions.

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

## Design System

The UI uses a "Structural Warmth" design language. Always use CSS tokens — never hardcode colors.

### Key Tokens
```css
--imw-bg-base:      #F5F0E8 (light) / #131310 (dark)
--imw-bg-surface:   #FDFAF6 (light) / #1C1916 (dark)
--imw-text-primary: #1C1714 (light) / #F5F0E8 (dark)
--imw-ac:           accent color (user-selected; default sand/amber)
--imw-ac-l:         accent light variant
--imw-ac-b:         accent border
--imw-ac-d:         accent dark variant
--imw-font-display: Fraunces (weight 900) — headings, entry titles, display text
--imw-font-ui:      IBM Plex Sans (400/600) — all UI chrome
```

### Typography
- Root: `html { font-size: 18px }` — all sizing in rem
- Exception: composer title input is 22px absolute (approved)
- Entry titles in feed: Fraunces 900, 1.05rem
- Entry detail title: Fraunces 900, 1.7rem

### Interaction Patterns
- Buttons: `border-radius: 0`, `box-shadow: 2px 2px 0 0 var(--imw-text-primary)` (light)
- Hover: `translate(1px, 1px)` + reduced shadow
- Active: `translate(2px, 2px)` + no shadow
- All transitions must be calm and gentle — no sudden snaps

### Layout
- 720px centered content wells on all pages
- 50px sticky top bar per page (content differs per page)
- Collapsible sidebar: full width or 40px rail with icon-only nav
- Sidebar collapse state persists via `localStorage`

---

## App Structure

```
app/
  page.tsx               — Journal feed + composer (root route)
  entries/[id]/page.tsx  — Entry detail + Eval Prep qualifiers
  in-my-words/page.tsx   — DSM-5 Eval Prep view
  settings/page.tsx      — User preferences
  api/
    entries/             — CRUD routes
    entries/[id]/analyze — LLM category classification
    entries/[id]/generate-title — AI title generation
    preferences/         — GET / PUT user preferences

lib/
  ai.ts                  — Anthropic provider singleton
  theme.ts               — CATEGORIES taxonomy, accent palettes, font options
  tiptap-content.ts      — parseEntryContent(), extractPlainText()

components/
  AnnotationTag.tsx      — Category chip with confirm/dismiss UX
  WriteControlsDrawer.tsx — Slide-in panel (word count, mood, font, line width)
  StoplightWithClerk.tsx — DSM-5 coverage rollup (isolated for dev bypass safety)
```

---

## AI Features

### Title Generation (`/api/entries/[id]/generate-title`)
- Triggers automatically at ~30 words (debounced 1500ms); **pending ticket to increase threshold by ~25–35 chars** (see Backlog)
- `id` accepts `"new"` for the composer (no ownership check needed)
- Composer title input has no placeholder — stays blank until AI populates it
- User can override at any time; manual titles are never overwritten by AI

### Category Classification (`/api/entries/[id]/analyze`)
- Sends entry content to Claude with the IMW lived experience taxonomy
- Returns JSON: `{ tags: string[], confidence: "high"|"medium"|"low", note?: string }`
- Tags stored in `aiSuggestions` field (Json?) on JournalEntry
- User confirms or dismisses per-tag via AnnotationTag component
- Confirmed tags PATCH to DB immediately

### Classification Prompt Rules
The classifier must require at least one *signal type* before applying any tag:
- Expressed consequence
- Behavioral adaptation
- Noted confusion/mismatch
- A pattern the user explicitly flags

Topic mention alone is NOT sufficient. See classification prompt `.md` artifact for full
per-tag definitions, when-to-apply, and when-NOT-to-apply guidance with false-positive examples.

### IMW Lived Experience Taxonomy (defined in `lib/theme.ts` as `CATEGORIES`)
`executive-function`, `sensory-processing`, `social-communication`, `emotional-dysregulation`,
`functional-impairment`, `masking`, `coping`, `workplace-academic`, `medical-clinical`

⚠️ `masking` and `coping` are distinct tags — do not conflate them.

### DSM-5 Parallel Tag System (Eval Prep)
A second tag layer mapped to ASD diagnostic criteria:
- Subcriteria: A1, A2, A3, B1, B2, B3, B4
- Criterion C → `childhoodMemory` boolean flag on entry (user-set)
- Criterion D → `affectedFunctioning` boolean flag on entry (user-set)
- Both render as qualifier toggle chips on the entry detail page

### Auto-Analyze
- `autoAnalyze` preference toggle, default **off**
- When on, triggers classification automatically after saving an entry

---

## Prisma Schema (Current Fields)

```prisma
model JournalEntry {
  id                  String   @id @default(cuid())
  userId              String
  title               String?
  content             String   // TipTap JSON or legacy plain text
  mood                String?
  tags                String[]
  aiSuggestions       Json?
  childhoodMemory     Boolean  @default(false)
  affectedFunctioning Boolean  @default(false)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  @@index([userId])
}

model UserPreferences {
  id               String   @id @default(cuid())
  userId           String   @unique
  darkMode         Boolean  @default(false)
  accentColor      String   @default("sand")
  bodyFont         String   @default("ibm-plex-sans")
  editorFontSize   Int      @default(16)
  lineWidth        String   @default("normal")
  deepWriteDefault Boolean  @default(false)
  autoAnalyze      Boolean  @default(false)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}
```
```
