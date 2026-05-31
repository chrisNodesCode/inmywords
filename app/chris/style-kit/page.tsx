"use client";

import { useState } from "react";

// ─────────────────────────────────────────────────────────────────────────
// InMyWords — Style Kit v2 (proposal)
//
// A new visual language for InMyWords, derived from the /chris playground:
// calm canvas, soft rounded surfaces, low-contrast borders, one quiet sand
// accent, system-sans UI with mono accents. Dark-first, with a light variant.
//
// This page is a PREVIEW ONLY — it does not change any live InMyWords styles.
// If you like it, the token sets below become CSS variables app-wide.
// ─────────────────────────────────────────────────────────────────────────

type Tokens = {
  bg: string;
  surface: string;
  raised: string;
  border: string;
  borderSoft: string;
  text: string;
  textDim: string;
  textFaint: string;
  accent: string;
  accentText: string; // text color on accent fills
  // semantic ramp (shared hues, read well on both themes via tints)
  green: string;
  red: string;
  amber: string;
  blue: string;
};

const DARK: Tokens = {
  bg: "#0e0f12",
  surface: "#15171c",
  raised: "#181b21",
  border: "#23262d",
  borderSoft: "#1f2228",
  text: "#e7e9ee",
  textDim: "#9aa0aa",
  textFaint: "#6b7280",
  accent: "#c9a86a",
  accentText: "#1a1710",
  green: "#6fae8f",
  red: "#e0736a",
  amber: "#d9a441",
  blue: "#6f8fd0",
};

const LIGHT: Tokens = {
  bg: "#f7f6f3",
  surface: "#ffffff",
  raised: "#fbfaf8",
  border: "#e6e3dc",
  borderSoft: "#efece6",
  text: "#1b1c1f",
  textDim: "#5c6066",
  textFaint: "#9a9ea6",
  accent: "#a87f3f",
  accentText: "#ffffff",
  green: "#3f8f6f",
  red: "#c4564b",
  amber: "#b07e1f",
  blue: "#4f6fb0",
};

const SANS =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';
// Optional reading serif for long-form entry bodies (kept tasteful + light).
const SERIF = 'ui-serif, Georgia, "Times New Roman", serif';

const tint = (hex: string, alpha = "22") => `${hex}${alpha}`;

export default function StyleKitPage() {
  const [mode, setMode] = useState<"dark" | "light">("dark");
  const C = mode === "dark" ? DARK : LIGHT;

  return (
    <div style={{ background: C.bg, color: C.text, fontFamily: SANS, minHeight: "100vh" }}>
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "0 28px 120px" }}>
        {/* ── Header ─────────────────────────────────────────────── */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 72,
            borderBottom: `1px solid ${C.border}`,
            position: "sticky",
            top: 0,
            background: C.bg,
            zIndex: 10,
          }}
        >
          <div style={{ fontFamily: MONO, fontSize: 13, color: C.textFaint }}>
            inMyWords <span style={{ color: C.accent }}>/</span> style-kit{" "}
            <span style={{ color: C.textFaint }}>v2 · proposal</span>
          </div>
          <ModeToggle mode={mode} setMode={setMode} C={C} />
        </header>

        <Hero C={C} />

        <Section C={C} label="01 — Foundations" title="Palette">
          <Palette C={C} />
        </Section>

        <Section C={C} label="02 — Foundations" title="Typography">
          <TypeScale C={C} />
        </Section>

        <Section C={C} label="03 — Components" title="Buttons & inputs">
          <Controls C={C} />
        </Section>

        <Section C={C} label="04 — Components" title="Chips, tags & badges">
          <Chips C={C} />
        </Section>

        <Section C={C} label="05 — Applied" title="Journal composer">
          <Composer C={C} />
        </Section>

        <Section C={C} label="06 — Applied" title="Entry feed">
          <Feed C={C} />
        </Section>

        <Section C={C} label="07 — Applied" title="Entry — reading view">
          <Reading C={C} />
        </Section>

        <footer style={{ marginTop: 64, fontFamily: MONO, fontSize: 12, color: C.textFaint }}>
          preview only · no live InMyWords styles changed · toggle dark/light up top ↑
        </footer>
      </div>
    </div>
  );
}

// ── Shared bits ─────────────────────────────────────────────────────────────

function ModeToggle({
  mode,
  setMode,
  C,
}: {
  mode: "dark" | "light";
  setMode: (m: "dark" | "light") => void;
  C: Tokens;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        border: `1px solid ${C.border}`,
        borderRadius: 999,
        padding: 3,
        gap: 2,
      }}
    >
      {(["dark", "light"] as const).map((m) => (
        <button
          key={m}
          onClick={() => setMode(m)}
          style={{
            border: "none",
            borderRadius: 999,
            padding: "5px 14px",
            fontSize: 12.5,
            fontFamily: MONO,
            cursor: "pointer",
            background: mode === m ? C.accent : "transparent",
            color: mode === m ? C.accentText : C.textDim,
            transition: "background 0.15s ease",
          }}
        >
          {m}
        </button>
      ))}
    </div>
  );
}

function Section({
  C,
  label,
  title,
  children,
}: {
  C: Tokens;
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginTop: 56 }}>
      <p
        style={{
          fontFamily: MONO,
          fontSize: 11,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: C.textFaint,
          margin: "0 0 6px",
        }}
      >
        {label}
      </p>
      <h2 style={{ margin: "0 0 22px", fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Card({
  C,
  children,
  pad = 20,
  style,
}: {
  C: Tokens;
  children: React.ReactNode;
  pad?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        background: C.surface,
        padding: pad,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────

function Hero({ C }: { C: Tokens }) {
  return (
    <section style={{ padding: "60px 0 8px" }}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          fontFamily: MONO,
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: C.accent,
          border: `1px solid ${tint(C.accent, "55")}`,
          background: tint(C.accent, "14"),
          borderRadius: 999,
          padding: "4px 12px",
          marginBottom: 26,
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: 999, background: C.accent }} />
        Now in beta
      </span>
      <h1
        style={{
          margin: 0,
          fontSize: 44,
          lineHeight: 1.1,
          fontWeight: 650,
          letterSpacing: "-0.03em",
          maxWidth: 620,
        }}
      >
        You lived it. <span style={{ color: C.accent }}>InMyWords</span> helps you say it.
      </h1>
      <p
        style={{
          margin: "20px 0 0",
          maxWidth: 540,
          color: C.textDim,
          fontSize: 16.5,
          lineHeight: 1.65,
        }}
      >
        A journaling tool for neurodivergent adults seeking to understand, articulate, and
        document their own experience — in their own words.
      </p>
    </section>
  );
}

// ── Palette ─────────────────────────────────────────────────────────────────

function Palette({ C }: { C: Tokens }) {
  const groups: { label: string; items: [string, string][] }[] = [
    {
      label: "Surfaces",
      items: [
        ["bg", C.bg],
        ["surface", C.surface],
        ["raised", C.raised],
        ["border", C.border],
      ],
    },
    {
      label: "Text",
      items: [
        ["primary", C.text],
        ["secondary", C.textDim],
        ["faint", C.textFaint],
      ],
    },
    {
      label: "Accent & semantic",
      items: [
        ["accent", C.accent],
        ["green", C.green],
        ["amber", C.amber],
        ["red", C.red],
        ["blue", C.blue],
      ],
    },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {groups.map((g) => (
        <div key={g.label}>
          <p
            style={{
              fontFamily: MONO,
              fontSize: 11,
              color: C.textFaint,
              margin: "0 0 10px",
              letterSpacing: "0.04em",
            }}
          >
            {g.label}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {g.items.map(([name, hex]) => (
              <div key={name} style={{ width: 132 }}>
                <div
                  style={{
                    height: 56,
                    borderRadius: 10,
                    background: hex,
                    border: `1px solid ${C.border}`,
                  }}
                />
                <div style={{ marginTop: 7, fontSize: 12.5, color: C.text }}>{name}</div>
                <div style={{ fontFamily: MONO, fontSize: 11, color: C.textFaint }}>{hex}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Type scale ───────────────────────────────────────────────────────────────

function TypeScale({ C }: { C: Tokens }) {
  const rows: { name: string; style: React.CSSProperties; sample: string }[] = [
    { name: "Display / 44 / 650", style: { fontSize: 40, fontWeight: 650, letterSpacing: "-0.03em" }, sample: "In your own words" },
    { name: "Heading / 22 / 600", style: { fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }, sample: "Three steps, all yours" },
    { name: "Body / 16 / 400", style: { fontSize: 16, lineHeight: 1.65 }, sample: "No forms, no checklists — just write what you experienced." },
    { name: "Small / 13.5 / 400", style: { fontSize: 13.5, color: C.textDim }, sample: "Supporting detail and helper text lives here." },
    { name: "Mono label / 11 / upper", style: { fontFamily: MONO, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: C.textFaint }, sample: "Section label" },
    { name: "Reading serif / 18 (optional)", style: { fontFamily: SERIF, fontSize: 18, lineHeight: 1.7 }, sample: "An optional serif for long-form entry reading." },
  ];
  return (
    <Card C={C}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {rows.map((r) => (
          <div key={r.name} style={{ display: "flex", gap: 20, alignItems: "baseline", flexWrap: "wrap" }}>
            <div style={{ width: 200, flexShrink: 0, fontFamily: MONO, fontSize: 11, color: C.textFaint }}>
              {r.name}
            </div>
            <div style={{ ...r.style }}>{r.sample}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Buttons & inputs ─────────────────────────────────────────────────────────

function Controls({ C }: { C: Tokens }) {
  const base: React.CSSProperties = {
    border: "none",
    borderRadius: 10,
    padding: "10px 18px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: SANS,
  };
  return (
    <Card C={C}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <button style={{ ...base, background: C.accent, color: C.accentText }}>Get started</button>
        <button
          style={{
            ...base,
            background: "transparent",
            color: C.text,
            border: `1px solid ${C.border}`,
            fontWeight: 500,
          }}
        >
          See how it works
        </button>
        <button
          style={{
            ...base,
            background: "transparent",
            color: C.red,
            border: `1px solid ${tint(C.red, "66")}`,
            fontWeight: 500,
          }}
        >
          Delete
        </button>
        <button style={{ ...base, background: C.raised, color: C.textDim, fontWeight: 500 }}>
          Subtle
        </button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 18 }}>
        <input
          placeholder="Text input…"
          style={{
            flex: 1,
            minWidth: 200,
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            outline: "none",
            color: C.text,
            fontSize: 14.5,
            padding: "11px 14px",
            fontFamily: SANS,
          }}
        />
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: C.bg,
            border: `1px solid ${C.accent}`,
            borderRadius: 10,
            padding: "11px 14px",
            minWidth: 200,
            flex: 1,
          }}
        >
          <span style={{ color: C.text, fontSize: 14.5 }}>Focused input</span>
          <span style={{ width: 1, height: 16, background: C.accent, marginLeft: "auto" }} />
        </div>
      </div>
    </Card>
  );
}

// ── Chips / tags ─────────────────────────────────────────────────────────────

function Chips({ C }: { C: Tokens }) {
  const tags = ["masking", "the crash", "sensory sensitivity", "task paralysis", "burnout"];
  return (
    <Card C={C}>
      <p style={{ margin: "0 0 12px", fontFamily: MONO, fontSize: 11, color: C.textFaint }}>
        lived-experience tags
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {tags.map((t) => (
          <span
            key={t}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              border: `1px solid ${C.border}`,
              background: C.raised,
              color: C.textDim,
              borderRadius: 999,
              padding: "6px 13px",
              fontSize: 13,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: 999, background: C.accent }} />
            {t}
          </span>
        ))}
      </div>

      <p style={{ margin: "20px 0 12px", fontFamily: MONO, fontSize: 11, color: C.textFaint }}>
        states & badges
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        {[
          ["confirmed", C.green],
          ["needs review", C.amber],
          ["dismissed", C.red],
          ["A1 · reciprocity", C.blue],
        ].map(([label, color]) => (
          <span
            key={label}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              border: `1px solid ${tint(color, "66")}`,
              background: tint(color, "1c"),
              color: C.text,
              borderRadius: 999,
              padding: "5px 12px",
              fontSize: 12.5,
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: 999, background: color }} />
            {label}
          </span>
        ))}
      </div>
    </Card>
  );
}

// ── Composer ─────────────────────────────────────────────────────────────────

function Composer({ C }: { C: Tokens }) {
  return (
    <Card C={C} pad={0} style={{ overflow: "hidden" }}>
      <div style={{ padding: "22px 24px 8px" }}>
        <p style={{ margin: 0, fontFamily: MONO, fontSize: 11, color: C.textFaint, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          New entry
        </p>
        <p style={{ margin: "16px 0 0", fontSize: 18, lineHeight: 1.7, color: C.textFaint, fontFamily: SERIF }}>
          What did today actually feel like, underneath the surface?
        </p>
        <div style={{ height: 60 }} />
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "12px 18px",
          borderTop: `1px solid ${C.borderSoft}`,
          background: C.raised,
        }}
      >
        <span style={{ fontFamily: MONO, fontSize: 12, color: C.textFaint }}>0 words</span>
        <span style={{ fontFamily: MONO, fontSize: 12, color: C.textFaint }}>mood · neutral</span>
        <button
          style={{
            marginLeft: "auto",
            border: "none",
            borderRadius: 10,
            padding: "9px 18px",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            background: C.accent,
            color: C.accentText,
            fontFamily: SANS,
          }}
        >
          Save entry
        </button>
      </div>
    </Card>
  );
}

// ── Feed ─────────────────────────────────────────────────────────────────────

function Feed({ C }: { C: Tokens }) {
  const entries = [
    {
      title: "The meeting that wouldn't end",
      date: "May 28",
      snippet:
        "I kept nodding along but I'd lost the thread twenty minutes in. By the end I couldn't tell if I was tired or just done performing.",
      tags: ["masking", "burnout"],
    },
    {
      title: "Grocery store overwhelm",
      date: "May 24",
      snippet:
        "The lights, the music, someone's cart wheel squeaking. I left with three of the eight things I came for and called it a win.",
      tags: ["sensory sensitivity", "task paralysis"],
    },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {entries.map((e) => (
        <Card key={e.title} C={C} pad={20} style={{ background: C.surface }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>
              {e.title}
            </h3>
            <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 11.5, color: C.textFaint }}>
              {e.date}
            </span>
          </div>
          <p style={{ margin: "9px 0 0", fontSize: 14.5, lineHeight: 1.6, color: C.textDim }}>
            {e.snippet}
          </p>
          <div style={{ display: "flex", gap: 7, marginTop: 14 }}>
            {e.tags.map((t) => (
              <span
                key={t}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  border: `1px solid ${C.border}`,
                  background: C.raised,
                  color: C.textDim,
                  borderRadius: 999,
                  padding: "4px 11px",
                  fontSize: 12,
                }}
              >
                <span style={{ width: 5, height: 5, borderRadius: 999, background: C.accent }} />
                {t}
              </span>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

// ── Reading view ─────────────────────────────────────────────────────────────

function Reading({ C }: { C: Tokens }) {
  return (
    <Card C={C} pad={28}>
      <span style={{ fontFamily: MONO, fontSize: 11.5, color: C.textFaint }}>May 28, 2026</span>
      <h3 style={{ margin: "8px 0 18px", fontSize: 26, fontWeight: 650, letterSpacing: "-0.02em" }}>
        The meeting that wouldn&apos;t end
      </h3>
      <p style={{ margin: 0, fontFamily: SERIF, fontSize: 18, lineHeight: 1.75, color: C.text }}>
        I kept nodding along but I&apos;d lost the thread twenty minutes in. Every time someone
        looked my way I produced the right face — interested, engaged, fine. By the end I
        couldn&apos;t tell if I was tired or just done performing for a room that never noticed the
        difference.
      </p>
      <div style={{ display: "flex", gap: 7, marginTop: 22, flexWrap: "wrap" }}>
        {[
          ["masking", C.green],
          ["burnout", C.green],
          ["needs review", C.amber],
        ].map(([t, color]) => (
          <span
            key={t}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              border: `1px solid ${tint(color, "66")}`,
              background: tint(color, "1c"),
              color: C.text,
              borderRadius: 999,
              padding: "5px 12px",
              fontSize: 12.5,
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: 999, background: color }} />
            {t}
          </span>
        ))}
      </div>
    </Card>
  );
}
