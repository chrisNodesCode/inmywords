"use client";

// Breadcrumb surface switcher. Renders `~/chris/<surface> ▾` where the terminal
// label is a dropdown for jumping between playground surfaces. The `~/chris/`
// prefix still links to the playground home. Drop-in replacement for the old
// static breadcrumb in each surface's top bar.

import Link from "next/link";
import { useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FixedDropdown } from "./FixedDropdown";
import { SURFACES } from "./surfaces";

const MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';

export function SurfaceSwitcher() {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const current = SURFACES.find(
    (s) => pathname === s.href || pathname.startsWith(s.href + "/")
  );
  const label =
    current?.name || pathname.replace("/chris/", "").split("/")[0] || "chris";

  const go = (href: string) => {
    setOpen(false);
    if (href !== current?.href) router.push(href);
  };

  return (
    <span style={{ display: "inline-flex", alignItems: "center", fontFamily: MONO, fontSize: 14 }}>
      <Link href="/chris" style={{ color: "var(--pg-text-faint)", textDecoration: "none" }}>
        ~/chris/
      </Link>
      <button
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        title="Switch surface"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontFamily: MONO,
          fontSize: 14,
          color: "var(--pg-text)",
          padding: 0,
        }}
      >
        {label}
        <span
          aria-hidden
          style={{
            fontSize: 9,
            color: "var(--pg-text-faint)",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.12s ease",
          }}
        >
          ▾
        </span>
      </button>

      {open && (
        <FixedDropdown anchorRef={btnRef} onClose={() => setOpen(false)} width={190} maxHeight={400}>
          <div style={{ padding: 4 }}>
            {SURFACES.map((s) => {
              const active = current?.href === s.href;
              return (
                <button
                  key={s.href}
                  onClick={() => go(s.href)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    textAlign: "left",
                    border: "none",
                    background: active ? "var(--pg-card-hover)" : "transparent",
                    color: active ? "var(--pg-text)" : "var(--pg-text-dim)",
                    cursor: "pointer",
                    fontFamily: MONO,
                    fontSize: 13,
                    padding: "8px 10px",
                    borderRadius: 8,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--pg-card-hover)")}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = active ? "var(--pg-card-hover)" : "transparent")
                  }
                >
                  <span style={{ color: "var(--pg-text-faint)" }}>~/chris/</span>
                  <span style={{ flex: 1, color: active ? "var(--pg-text)" : undefined }}>{s.name}</span>
                  {active && <span style={{ color: "var(--pg-accent)", fontSize: 9 }}>●</span>}
                </button>
              );
            })}
          </div>
        </FixedDropdown>
      )}
    </span>
  );
}
