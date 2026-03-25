"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { Menu, Search, X } from "lucide-react";
import { useIMWTheme } from "@/components/ThemeProvider";
import AccentPicker from "@/components/AccentPicker";
import FontPicker from "@/components/FontPicker";
import { useMobile } from "@/hooks/useMobile";

const devBypass = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true";

// Only rendered when ClerkProvider is active (not in dev bypass)
function WordmarkText() {
  const { user } = useUser();
  const name = user?.firstName ?? user?.username;
  return <>{name ? `${name}'s words` : "InMyWords"}</>;
}

function AutoAnalyzeToggle() {
  const { prefs, setAutoAnalyze } = useIMWTheme();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span className="imw-label">ai analysis</span>
      <button
        onClick={() => setAutoAnalyze(!prefs.autoAnalyze)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
        aria-label={`Auto-analyze is ${prefs.autoAnalyze ? "on" : "off"}`}
      >
        <span
          style={{
            width: 28,
            height: 16,
            borderRadius: 8,
            background: prefs.autoAnalyze ? "var(--imw-ac)" : "var(--imw-border-medium)",
            position: "relative",
            transition: "background 0.2s",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 2,
              left: prefs.autoAnalyze ? 14 : 2,
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#fff",
              transition: "left 0.2s",
            }}
          />
        </span>
        <span className="imw-ui-small" style={{ color: "var(--imw-text-secondary)" }}>
          auto on save
        </span>
      </button>
    </div>
  );
}

const NAV_ITEMS = [
  { label: "journal", href: "/" },
  { label: "in my words", href: "/in-my-words" },
];

function DarkModeToggle() {
  const { prefs, setDarkMode } = useIMWTheme();

  return (
    <div style={{ display: "inline-flex", border: "0.5px solid var(--imw-border-medium)" }}>
      {(["light", "dark"] as const).map((mode) => {
        const isActive = mode === "dark" ? prefs.darkMode : !prefs.darkMode;
        return (
          <button
            key={mode}
            onClick={() => setDarkMode(mode === "dark")}
            style={{
              padding: "4px 10px",
              fontSize: "0.75rem",
              fontWeight: isActive ? 600 : 400,
              background: isActive ? "var(--imw-ac)" : "transparent",
              color: isActive ? "#ffffff" : "var(--imw-text-tertiary)",
              border: "none",
              borderRadius: 0,
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

function SidebarContents({ onNavClick, onCollapse }: { onNavClick?: () => void; onCollapse?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {/* Wordmark */}
      <div style={{ padding: "20px 16px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link
          href="/"
          onClick={onNavClick}
          style={{
            fontSize: "0.85rem",
            fontWeight: 600,
            color: "var(--imw-text-primary)",
            letterSpacing: "-0.01em",
            textDecoration: "none",
          }}
        >
          {devBypass ? "your words" : <WordmarkText />}
        </Link>
        <div style={{ display: "flex", gap: 2 }}>
          <button
            type="button"
            className="imw-btn imw-btn--ghost imw-btn--sm"
            onClick={() => {
              onNavClick?.();
              window.dispatchEvent(new CustomEvent("imw:open-search"));
            }}
            aria-label="Search entries"
          >
            <Search size={14} />
          </button>
          {onCollapse && (
            <button
              type="button"
              className="imw-btn imw-btn--ghost imw-btn--sm"
              onClick={onCollapse}
              aria-label="Collapse sidebar"
              title="Hide sidebar"
              style={{ fontSize: "0.65rem" }}
            >
              ←
            </button>
          )}
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ padding: "0 8px", marginBottom: 8 }}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onNavClick}
              className={`imw-nav-item${isActive ? " imw-nav-item--active" : ""}`}
              style={{ textDecoration: "none" }}
            >
              <span className="imw-nav-dot" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="imw-divider" style={{ margin: "12px 12px" }} />

      {/* Appearance section */}
      <div style={{ padding: "4px 12px", display: "flex", flexDirection: "column", gap: "14px", marginBottom: 8 }}>
        <span className="imw-label">appearance</span>

        <div>
          <DarkModeToggle />
        </div>

        <div>
          <AccentPicker />
        </div>

        <div>
          <FontPicker />
        </div>
      </div>

      {/* Divider */}
      <div className="imw-divider" style={{ margin: "12px 12px" }} />

      {/* AI analysis section */}
      <div style={{ padding: "4px 12px" }}>
        <AutoAnalyzeToggle />
      </div>

      {/* Bottom: user button */}
      {!devBypass && (
        <div style={{ marginTop: "auto", padding: "16px 12px" }}>
          <UserButton />
        </div>
      )}
    </>
  );
}

export default function Sidebar() {
  const isMobile = useMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("imw-sidebar-collapsed") === "true";
    }
    return false;
  });
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    localStorage.setItem("imw-sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  if (isMobile) {
    return (
      <>
        {/* Fixed mobile top bar */}
        <div className="imw-mobile-topbar imw-deep-write-chrome">
          <button
            type="button"
            className="imw-btn imw-btn--ghost imw-btn--sm"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation"
            style={{ marginRight: 12 }}
          >
            <Menu size={18} />
          </button>
          <Link
            href="/"
            style={{
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "var(--imw-text-primary)",
              letterSpacing: "-0.01em",
              textDecoration: "none",
              flex: 1,
            }}
          >
            {devBypass ? "your words" : <WordmarkText />}
          </Link>
          <button
            type="button"
            className="imw-btn imw-btn--ghost imw-btn--sm"
            onClick={() => window.dispatchEvent(new CustomEvent("imw:open-search"))}
            aria-label="Search entries"
          >
            <Search size={16} />
          </button>
        </div>

        {/* Backdrop */}
        {mobileMenuOpen && (
          <div
            className="imw-sidebar-backdrop"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar drawer */}
        <aside
          className={`imw-sidebar-mobile ${mobileMenuOpen ? "imw-sidebar-mobile-open" : "imw-sidebar-mobile-closed"}`}
          style={{
            background: "var(--imw-bg-surface)",
            borderRight: "0.5px solid var(--imw-border-default)",
            display: "flex",
            flexDirection: "column",
            height: "100vh",
            overflowY: "auto",
          }}
        >
          {/* Close button */}
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 12px 0" }}>
            <button
              type="button"
              className="imw-btn imw-btn--ghost imw-btn--sm"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close navigation"
            >
              <X size={16} />
            </button>
          </div>
          <SidebarContents onNavClick={() => setMobileMenuOpen(false)} />
        </aside>
      </>
    );
  }

  // Desktop: collapsed rail
  if (collapsed) {
    const isJournal = pathname === "/" || pathname.startsWith("/entries");
    const isWords = pathname === "/in-my-words";
    const railBtnStyle = {
      background: "none",
      border: "none",
      cursor: "pointer",
      fontFamily: "var(--imw-font-display)",
      fontWeight: 900 as const,
      fontSize: "0.65rem",
      padding: "8px 0",
      width: "100%",
      textAlign: "center" as const,
      transition: "color 0.15s",
    };
    return (
      <div
        className="imw-deep-write-chrome"
        style={{
          width: 40,
          minWidth: 40,
          height: "100vh",
          position: "sticky",
          top: 0,
          alignSelf: "flex-start",
          background: "var(--imw-bg-surface)",
          borderRight: "2px solid var(--imw-text-primary)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 10,
          gap: 4,
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => setCollapsed(false)}
          aria-label="Expand sidebar"
          style={{ ...railBtnStyle, color: "var(--imw-text-tertiary)", marginBottom: 4 }}
        >
          →
        </button>
        <button
          onClick={() => router.push("/")}
          aria-label="Journal"
          title="Journal"
          style={{ ...railBtnStyle, color: isJournal ? "var(--imw-ac)" : "var(--imw-text-tertiary)" }}
        >
          J
        </button>
        <button
          onClick={() => router.push("/in-my-words")}
          aria-label="In My Words"
          title="In My Words"
          style={{ ...railBtnStyle, color: isWords ? "var(--imw-ac)" : "var(--imw-text-tertiary)" }}
        >
          W
        </button>
      </div>
    );
  }

  // Desktop: expanded sidebar
  return (
    <aside
      className="imw-deep-write-chrome"
      style={{
        width: "200px",
        minWidth: "200px",
        minHeight: "100vh",
        background: "var(--imw-bg-surface)",
        borderRight: "0.5px solid var(--imw-border-default)",
        display: "flex",
        flexDirection: "column",
        position: "sticky",
        top: 0,
        alignSelf: "flex-start",
        height: "100vh",
        transition: "width 0.22s, min-width 0.22s",
        overflow: "hidden",
      }}
    >
      <SidebarContents onCollapse={() => setCollapsed(true)} />
    </aside>
  );
}
