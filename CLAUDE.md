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

### Chris's Playground (`/chris`) — owner-only area, same DB

`/chris` is a personal playground (to-dos and future tools), gated to the owner.
It now shares the **main `nameless-block` database** (merged 2026-05-31 from the
former standalone `bitter-queen` project) so playground data can cross-reference
journal entries and tags. It is NOT a separate DB anymore.

- **Models:** `Todo` (+ `Priority` enum) live in `prisma/schema.prisma` alongside `JournalEntry`. A `Todo` may optionally link to a `JournalEntry` via `entryId` (relation `Todo.entry` / `JournalEntry.todos`, `onDelete: SetNull`). The to-dos UI links/unlinks entries via a picker fed by `GET /chris/api/entries`.
- **Modules:** To-dos, Projects, Journal (shared with IMW), Shopping, Prompts, and **Messaging** (`/chris/messages`). Module cards are listed in `app/chris/page.tsx`.
- **Shared `_lib` UI:** `ProjectSelect` (dropdown project filter — the standard across todos/journal/messaging/prompts; supersedes the older chip-based `ProjectFilterBar`), `FullscreenButton` (browser-fullscreen toggle in every top bar), `ThemeControls` (dark/light toggle + accent picker, in every top bar), `Spinner` (loading indicator — replaces plain "loading…" text), `useAutosave` (debounced autosave for editors/modals), `FixedDropdown`, `dragReorder`.
- **Theming:** the playground has dark/light + 6 accents (mirrors IMW), via `_lib/playgroundTheme` (`PlaygroundThemeProvider` in `layout.tsx`). Structural colors are `--pg-*` CSS vars flipped by a `data-pg-theme` attr; the accent is a single `--pg-accent` var. **Pages reference colors through their local `C` object, whose values are `var(--pg-*)` — keep using `C.*`, never hardcode hex.** Preference persists in `localStorage` (`chris.theme.mode` / `chris.theme.accent`). Semantic colors (status/priority/mood/danger) stay fixed across themes. The `/chris/style-kit` page is a separate design experiment with its own palette — not wired to this system.
- **Project linkage:** `Todo`, `JournalEntry`, `Prompt`, and `Message` all carry an optional `projectId` (relation to `Project`, `onDelete: SetNull`). New items inherit the active project filter; the feed filters by it.
- **`Todo` extras:** `phone` and `url` (both nullable). Clicking a to-do opens a detail modal (`TodoDetailModal`) exposing all fields; optional fields (note/due/priority/phone/url/project) stay hidden until they hold a value or are toggled on via the icon row. `url` opens in a new tab; `phone` is a `tel:` link.
- **Client:** uses the standard `import { prisma } from "@/lib/prisma"`.
- **Migrations workflow (`migrate dev` — the canonical path):** migration history is back in sync with the live DB as of `20260602184246_add_prompt_status_and_messaging` (that migration baselined earlier `db push` drift — `Prompt.status` + the `Message` table). **Use `prisma migrate dev` for all schema changes; do NOT use `db push`** (it silently re-introduces drift that later forces a destructive reset). See the "Prisma Migrations" section below for the required shadow-DB step on Neon and the dev-server restart gotcha.
- **Owner gate:** `lib/playground-auth.ts` (`getPlaygroundUserId()` returns a userId only for `PLAYGROUND_OWNER_EMAIL`) + `app/chris/OwnerGate.tsx` (client redirect). Non-owners are blocked at both the UI and the API.
- **Layout:** `app/chris/layout.tsx` is self-contained — no IMW sidebar/theme. `SidebarWrapper` hides the IMW sidebar on `/chris*`.

---

## ⚠️ Critical: Ship to `main` only — never create preview deployments

Vercel preview deployments (and the Neon preview branches they can spawn) have cost the owner **hundreds of dollars** in forgotten charges. Hard rules — these override the default "branch first" git etiquette:

- **Commit and push directly to `main`.** Do NOT create feature branches, do NOT push non-`main` branches, do NOT open pull requests. Each of those triggers a Vercel preview build.
- The repo enforces this in `vercel.json` via `ignoreCommand`: Vercel only builds when `VERCEL_GIT_COMMIT_REF == "main"`; every other ref is skipped. **Do not remove or weaken this** — it's a cost guardrail, not a style choice.
- dev and prod share the **one** Neon DB (`nameless-block`), so a push to `main` is already "live" — there is no value in a preview environment here anyway.
- If a branch ever gets pushed by accident, delete it immediately (`git push origin --delete <branch>`) and check Vercel/Neon for any preview deployment or DB branch it created.
- Never create Neon database branches for testing. Use a **local throwaway Postgres** as the migrate shadow DB (see the Migrations workflow section).

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
- Prisma 7 no longer accepts `DATABASE_URL` inside `schema.prisma`. Connection string lives in `prisma.config.ts` (loads `.env` via `dotenv/config`; the value is in both `.env` and `.env.local`).
- Always run `prisma generate` before `next build`. Build script: `"build": "prisma generate && next build"`.

#### Migrations workflow (read before any schema change)
**Always use `prisma migrate dev` — never `prisma db push`.** `db push` mutates the live DB without writing a migration file, creating drift that a later `migrate dev` can only resolve by offering a **destructive reset**. History was re-baselined on 2026-06-02 to undo exactly that; don't reintroduce it.

Neon can't host the shadow database `migrate dev` needs (the pooled connection can't `CREATE DATABASE`), so spin up a throwaway local Postgres and point `SHADOW_DATABASE_URL` at it. `prisma.config.ts` already wires `datasource.shadowDatabaseUrl = process.env.SHADOW_DATABASE_URL` (unset = ignored at runtime).

```bash
# one-time-ish: throwaway shadow Postgres (Homebrew postgresql@14)
initdb -D /tmp/imw-shadow-pg -U postgres --no-locale --encoding=UTF8
pg_ctl -D /tmp/imw-shadow-pg -o "-p 5433" -l /tmp/shadow-pg.log start
createdb -p 5433 -U postgres shadow

# then, for any schema change:
SHADOW_DATABASE_URL="postgresql://postgres@127.0.0.1:5433/shadow" \
  npx prisma migrate dev --name <change_name>

pg_ctl -D /tmp/imw-shadow-pg stop   # tear down when done
```

- **Restart the dev server after adding a model/field.** The running Next process caches the generated Prisma client; new models otherwise 500 with `Cannot read properties of undefined (reading 'create')` until you `pkill -f "next dev"` + restart (or re-launch the preview).
- **Baselining drift without data loss** (if it ever happens again): generate the catch-up SQL with `prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script` (needs `SHADOW_DATABASE_URL`), drop it into a new `prisma/migrations/<ts>_<name>/migration.sql`, then `prisma migrate resolve --applied <ts>_<name>` so it records as applied **without** re-running against prod. Verify with `migrate diff --from-migrations … --to-config-datasource --exit-code` → "No difference detected".

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

> **Note:** A proposed redesign ("Style Kit v2", dark-first, derived from the
> `/chris` playground look) is documented in `docs/style-kit-v2-plan.md` with a
> live preview at `/chris/style-kit`. It is **deferred and not yet applied** — the
> system below is still the live one. Don't start the rollout unless asked.

The current UI uses a "Structural Warmth" design language. Always use CSS tokens — never hardcode colors.

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

### Shared title-generation helper (`lib/generate-title.ts`)
All three auto-naming surfaces use this one module. It exports:
- `generateTitle(content, kind)` — calls Claude, returns a string or null. `kind` is `"journal"` (evocative, friend-like voice) or `"prompt"` (descriptive, file-name-style voice).
- `countWords(text)` + `MIN_TITLE_WORDS = 10` — callers use these to gate thin drafts before calling `generateTitle`.
- Always strips stray quotes/fences from Claude's reply.
- Throws on Anthropic failure; callers catch and treat naming as best-effort.

### Title Generation — main journal (`/api/entries/[id]/generate-title`)
- Triggers on save when plain text ≥ 10 chars (called from `app/journal/page.tsx`)
- `id` accepts `"new"` for the composer (no ownership check needed)
- Composer title input has no placeholder — stays blank until AI populates it
- User can override at any time; manual titles are never overwritten by AI
- Gated by `asd_user` plan check (unlike the playground routes below)

### Title Generation — playground prompts (`/chris/api/prompts/[id]/generate-title`)
- Owner-gated (no plan check — `/chris` is already owner-only)
- Fires after prompt save and after a content edit while still untitled
- Uses `"prompt"` voice: descriptive label for what the prompt *does*
- Displayed in `PromptRow` as bold title above the dimmed content preview
- Never overwrites a title the user typed manually

### Title Generation — playground journal (`/chris/api/entries/[id]/generate-title`)
- Owner-gated; mirrors the prompt route but uses `"journal"` voice
- Fires after entry save (if no manual title supplied) and after an untitled content edit
- Persists via standard `/api/entries/[id]` PATCH

### Messaging — message translation with editable persona presets (`/chris/messages`)
Owner-only playground tool for drafting Slack/email/text messages and rewriting them for how they'll *land*. Three-stage flow: **draft → response → finalDraft**, tracked by `Message.status` (`"draft" | "response" | "final"`).
- **Two orthogonal dimensions:** `channel` (`slack|email|text` — delivery medium, appended as a short note) and **`mode`** (`professional|dating|friends` — the persona/voice).
- `Message` model: `channel`, `draft` (TipTap JSON), `response` (plain text), `finalDraft` (TipTap JSON), `status`.
- `MessagePreset` model: one row per `(userId, key)` where `key` is a `MessageMode`. `prompt` is the **owner-editable** system prompt; seeded from `DEFAULT_MODE_PROMPTS` on first `GET /chris/api/message-presets`. Edited via the "✎ edit prompts" modal on the messages page.
- `lib/translate-message.ts` (server-only — never import into a client component) — `translateMessage(plainText, channel, systemPrompt)`. Caller supplies the preset's prompt; the channel medium-note is appended. Exports `MESSAGE_MODES`, `DEFAULT_MODE_PROMPTS`, `isMessageMode`, channel helpers. **Mode metadata is duplicated in `page.tsx` (`MODES`)** on purpose, so the client never imports this server module.
- Defaults: *professional* = neurodivergent→neurotypical top-down-processing rewrite for an educated workplace (lead with the headline, make implicit social signals explicit, soften bluntness, no small talk/emoji, preserve meaning); *dating* = warm/genuine/confident messages to women on dating apps; *friends* = casual warm messages. All editable + "reset to default".
- Routes (owner-gated via `getPlaygroundUserId`, no `asd_user` plan gate): `GET/POST /chris/api/messages`, `PATCH/DELETE /chris/api/messages/[id]`, `POST /chris/api/messages/[id]/translate` (body `{ channel?, mode? }` — loads that mode's preset prompt), `POST /chris/api/messages/reorder`, `GET /chris/api/message-presets` (get-or-seed), `PATCH /chris/api/message-presets/[id]` (`{ prompt? }` or `{ reset: true }`).
- `status` auto-advances server-side: `translate` sets `response`; saving a non-empty `finalDraft` sets `final`.
- UI: composer header has the **mode dropdown** (persisted in `localStorage` `chris.messages.mode`) + channel toggle + "edit prompts" button. Feed of collapsible cards; expanded **MessageWorkspace** is the numbered 3-step stepper showing the active mode; "Use as final draft" seeds step 3 (editor remounts via `key`). The **PromptModal** has a tab per mode + textarea + save/reset.
- Replaced the old "Automations" stub card on the `/chris` landing.

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
