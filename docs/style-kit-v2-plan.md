# InMyWords — Style Kit v2 (rollout plan)

**Status:** Proposal approved in principle. **Deferred** — finish iterating on the
`/chris` playground tools first; implement app-wide later only if time/budget allows.
**Decided direction:** Dark-first (light as a toggle option).
**Created:** 2026-05-31

---

## Why

The `/chris` playground's look (calm dark canvas, soft rounded surfaces, one quiet
sand accent, system-sans + mono) resonated more than the original InMyWords
"Structural Warmth" system (Fraunces display serif, brutalist `border-radius: 0`
buttons with hard offset shadows, multi-accent palette). This plan refactors the
InMyWords visual language to match the playground.

## Live preview

- **Route:** `/chris/style-kit` (owner-gated, under the playground layout).
- **File:** `app/chris/style-kit/page.tsx` (self-contained; dark/light toggle).
- **Important:** Preview is intentionally **left uncommitted / local-only** so it
  never ships to production until rollout is approved. It does NOT change any live
  InMyWords styles.

## The language

- **Surfaces:** 14px-radius cards, 1px low-contrast borders, gentle elevation
  (subtle gradient/shadow) — no hard brutalist offset shadows.
- **Accent:** a single restrained sand highlight (links, primary buttons, tag
  dots). Retire the multi-accent palette as the primary system.
- **Type:** system-sans for UI, mono for labels/meta/breadcrumbs. Retire Fraunces
  as the brand face. Keep an **optional reading serif** (`ui-serif`) for long-form
  entry bodies so journaling still reads warm.
- **Theme:** two token sets with identical keys → drop-in CSS variables; dark and
  light both supported for free.

## Token sets (source of truth)

```ts
// DARK (default)
bg:        #0e0f12   surface:  #15171c   raised:   #181b21
border:    #23262d   borderSoft: #1f2228
text:      #e7e9ee   textDim:  #9aa0aa   textFaint: #6b7280
accent:    #c9a86a   accentText (on accent fills): #1a1710
green:     #6fae8f   red: #e0736a   amber: #d9a441   blue: #6f8fd0

// LIGHT (option)
bg:        #f7f6f3   surface:  #ffffff   raised:   #fbfaf8
border:    #e6e3dc   borderSoft: #efece6
text:      #1b1c1f   textDim:  #5c6066   textFaint: #9a9ea6
accent:    #a87f3f   accentText: #ffffff
green:     #3f8f6f   red: #c4564b   amber: #b07e1f   blue: #4f6fb0
```

Fonts:
```
SANS  = ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif
MONO  = ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace
SERIF = ui-serif, Georgia, "Times New Roman", serif   // optional, entry bodies only
```

Scale hints (from the preview): radius sm 8 / md 12 / lg 14 / pill 999;
display 44/650/-0.03em, heading 22/600, body 16/1.65, small 13.5, mono-label
11/upper/0.1em.

## Rollout plan (when approved — do it incrementally, NOT big-bang)

1. **Tokens → CSS variables** in `app/globals.css`: dark values under `:root`,
   light values under `[data-mode="light"]` (aligns with existing next-themes
   `attribute="data-mode"` setup in `app/layout.tsx`).
2. **Convert surface-by-surface, previewing each before moving on:**
   landing → journal feed → composer → entry detail → settings/sidebar.
3. **Retire old system pieces as you go:** Fraunces display font, `border-radius: 0`
   + hard offset-shadow buttons, the multi-accent token set in `lib/theme.ts`
   (`ACCENTS`, NEUTRAL_COLORS chips, font options) where they conflict.
4. Keep the optional reading serif wired for entry bodies only.

## Open questions for the iteration phase

- Final accent warmth/saturation; does the reading serif stay?
- Corner radius + border-contrast density.
- How much of `lib/theme.ts` (user-selectable accents/fonts) to keep vs. simplify.
