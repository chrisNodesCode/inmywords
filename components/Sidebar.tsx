"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { useIMWTheme } from "@/components/ThemeProvider";
import AccentPicker from "@/components/AccentPicker";
import FontPicker from "@/components/FontPicker";

const devBypass = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true";

const NAV_ITEMS = [
  { label: "journal", href: "/" },
  { label: "export", href: "/export", disabled: true },
];

function DarkModeToggle() {
  const { prefs, setDarkMode } = useIMWTheme();

  return (
    <div
      style={{
        display: "inline-flex",
        borderRadius: "20px",
        border: "0.5px solid var(--imw-border-medium)",
        overflow: "hidden",
      }}
    >
      {(["light", "dark"] as const).map((mode) => {
        const isActive = mode === "dark" ? prefs.darkMode : !prefs.darkMode;
        return (
          <button
            key={mode}
            onClick={() => setDarkMode(mode === "dark")}
            style={{
              padding: "4px 10px",
              fontSize: "11px",
              fontWeight: isActive ? 500 : 400,
              background: isActive ? "var(--imw-ac)" : "transparent",
              color: isActive ? "#ffffff" : "var(--imw-text-tertiary)",
              border: "none",
              cursor: "pointer",
              transition: "background 0.15s, color 0.15s",
            }}
          >
            {mode}
          </button>
        );
      })}
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="imw-deep-write-chrome"
      style={{
        width: "200px",
        minWidth: "200px",
        minHeight: "100vh",
        background: "var(--imw-bg-sidebar)",
        borderRight: "0.5px solid var(--imw-border-default)",
        display: "flex",
        flexDirection: "column",
        position: "sticky",
        top: 0,
        alignSelf: "flex-start",
        height: "100vh",
      }}
    >
      {/* Wordmark */}
      <div style={{ padding: "20px 16px 12px" }}>
        <Link
          href="/"
          style={{
            fontSize: "15px",
            fontWeight: 600,
            color: "var(--imw-text-primary)",
            letterSpacing: "-0.01em",
            textDecoration: "none",
          }}
        >
          InMyWords
        </Link>
      </div>

      {/* Nav items */}
      <nav style={{ padding: "0 8px" }}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href && !item.disabled;
          const content = (
            <>
              <span className={`imw-nav-dot${isActive ? "" : ""}`} />
              {item.label}
            </>
          );

          if (item.disabled) {
            return (
              <div
                key={item.label}
                className="imw-nav-item"
                style={{ opacity: 0.4, cursor: "not-allowed" }}
              >
                <span className="imw-nav-dot" />
                {item.label}
              </div>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`imw-nav-item${isActive ? " imw-nav-item--active" : ""}`}
              style={{ textDecoration: "none" }}
            >
              {content}
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="imw-divider" style={{ margin: "10px 12px" }} />

      {/* Appearance controls */}
      <div style={{ padding: "4px 12px", display: "flex", flexDirection: "column", gap: "14px" }}>
        <span className="imw-label">appearance</span>

        {/* Dark mode toggle */}
        <div>
          <DarkModeToggle />
        </div>

        {/* Accent swatches */}
        <div>
          <AccentPicker />
        </div>

        {/* Font chips */}
        <div>
          <FontPicker />
        </div>
      </div>

      {/* Bottom: user button */}
      {!devBypass && (
        <div style={{ marginTop: "auto", padding: "16px 12px" }}>
          <UserButton />
        </div>
      )}
    </aside>
  );
}
