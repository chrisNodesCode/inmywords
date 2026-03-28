"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";

const devBypass = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true";

// ── Shared button styles ───────────────────────────────────────────────────

const btnPrimary: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "11px 22px",
  background: "var(--imw-ac)",
  color: "#fff",
  border: "none",
  borderRadius: 0,
  fontFamily: "var(--imw-font-ui)",
  fontSize: "0.85rem",
  fontWeight: 600,
  cursor: "pointer",
  textDecoration: "none",
  boxShadow: "2px 2px 0 0 var(--imw-text-primary)",
  transition: "transform 0.1s ease, box-shadow 0.1s ease",
};

const btnGhost: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "11px 22px",
  background: "transparent",
  color: "var(--imw-text-primary)",
  border: "1.5px solid var(--imw-border-medium)",
  borderRadius: 0,
  fontFamily: "var(--imw-font-ui)",
  fontSize: "0.85rem",
  fontWeight: 400,
  cursor: "pointer",
  textDecoration: "none",
  transition: "border-color 0.15s ease",
};

// ── Component ──────────────────────────────────────────────────────────────

export default function LandingPage() {
  const router = useRouter();

  // Redirect authenticated users to the journal
  const { isSignedIn, isLoaded } = devBypass
    ? { isSignedIn: false, isLoaded: true }
    // eslint-disable-next-line react-hooks/rules-of-hooks
    : useUser();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/journal");
    }
  }, [isLoaded, isSignedIn, router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--imw-bg-base)",
        fontFamily: "var(--imw-font-ui)",
      }}
    >
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          backgroundColor: "var(--imw-bg-surface)",
          borderBottom: "1px solid var(--imw-border-default)",
          padding: "0 48px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <span
          style={{
            fontFamily: "var(--imw-font-display)",
            fontSize: "1.05rem",
            fontWeight: 900,
            color: "var(--imw-text-primary)",
            letterSpacing: "-0.01em",
          }}
        >
          in<span style={{ color: "var(--imw-ac)" }}>My</span>Words
        </span>

        {/* Nav actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Link
            href="/sign-in"
            style={{
              fontFamily: "var(--imw-font-ui)",
              fontSize: "0.85rem",
              fontWeight: 400,
              color: "var(--imw-text-secondary)",
              textDecoration: "none",
            }}
          >
            Sign in
          </Link>
          <Link href="/sign-up" style={btnPrimary}>
            Join the beta
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section
        style={{
          padding: "96px 24px 80px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          {/* Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "4px 14px",
              background: "var(--imw-ac-l)",
              color: "var(--imw-ac-d)",
              border: "1px solid var(--imw-ac-b)",
              borderRadius: 20,
              fontFamily: "var(--imw-font-ui)",
              fontSize: "0.6rem",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: 32,
            }}
          >
            Beta — Free to join
          </div>

          {/* Headline */}
          <h1
            style={{
              fontFamily: "var(--imw-font-display)",
              fontSize: "2.6rem",
              fontWeight: 900,
              lineHeight: 1.15,
              color: "var(--imw-text-primary)",
              margin: "0 0 20px",
              letterSpacing: "-0.02em",
            }}
          >
            You lived it. InMyWords helps you say it.
          </h1>

          {/* Subheadline */}
          <p
            style={{
              fontFamily: "var(--imw-font-ui)",
              fontSize: "1rem",
              fontWeight: 400,
              lineHeight: 1.75,
              color: "var(--imw-text-secondary)",
              margin: "0 0 36px",
            }}
          >
            A journaling tool designed for neurodivergent adults who are seeking
            to understand, articulate, and document their own experience — for
            clinicians, HR, or themselves.
          </p>

          {/* CTA buttons */}
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
              marginBottom: 20,
            }}
          >
            <Link href="/sign-up" style={btnPrimary}>
              Join the free beta
            </Link>
            <a href="#how-it-works" style={btnGhost}>
              See how it works
            </a>
          </div>

          {/* Disclaimer */}
          <p
            style={{
              fontFamily: "var(--imw-font-ui)",
              fontSize: "0.7rem",
              fontWeight: 400,
              color: "var(--imw-text-tertiary)",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Not a diagnostic tool. InMyWords does not assess, diagnose, or imply
            clinical certainty of any kind.
          </p>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section
        id="how-it-works"
        style={{
          backgroundColor: "var(--imw-bg-alt)",
          padding: "80px 48px",
        }}
      >
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          {/* Label */}
          <p
            className="imw-label"
            style={{
              textAlign: "center",
              marginBottom: 10,
              color: "var(--imw-text-tertiary)",
            }}
          >
            How it works
          </p>

          {/* Title */}
          <h2
            style={{
              fontFamily: "var(--imw-font-display)",
              fontSize: "1.4rem",
              fontWeight: 900,
              color: "var(--imw-text-primary)",
              textAlign: "center",
              margin: "0 0 48px",
              lineHeight: 1.3,
            }}
          >
            Three steps. All in your words.
          </h2>

          {/* Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 24,
            }}
          >
            {[
              {
                step: "01 — Capture",
                title: "Write freely",
                body: "No forms, no checklists. Just write what you experienced, in whatever words feel true to you.",
              },
              {
                step: "02 — Recognize",
                title: "AI finds patterns",
                body: "The AI reads your entries and surfaces patterns — masking, burnout, task paralysis, sensory sensitivity, and more.",
              },
              {
                step: "03 — Document",
                title: "Export with confidence",
                body: "Generate a structured, clinician-friendly document that lets your experiences speak for themselves.",
              },
            ].map((card) => (
              <div
                key={card.step}
                style={{
                  backgroundColor: "var(--imw-bg-surface)",
                  border: "1px solid var(--imw-border-default)",
                  padding: "28px 24px",
                }}
              >
                <p
                  className="imw-label"
                  style={{
                    marginBottom: 12,
                    color: "var(--imw-ac-d)",
                  }}
                >
                  {card.step}
                </p>
                <h3
                  className="imw-h2"
                  style={{ marginBottom: 10 }}
                >
                  {card.title}
                </h3>
                <p
                  className="imw-ui-small"
                  style={{ lineHeight: 1.7, margin: 0 }}
                >
                  {card.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who it's for ────────────────────────────────────────────────── */}
      <section
        style={{
          backgroundColor: "var(--imw-bg-base)",
          padding: "80px 48px",
        }}
      >
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          {/* Label */}
          <p
            className="imw-label"
            style={{
              textAlign: "center",
              marginBottom: 10,
              color: "var(--imw-text-tertiary)",
            }}
          >
            Who it&apos;s for
          </p>

          {/* Title */}
          <h2
            style={{
              fontFamily: "var(--imw-font-display)",
              fontSize: "1.4rem",
              fontWeight: 900,
              color: "var(--imw-text-primary)",
              textAlign: "center",
              margin: "0 0 48px",
              lineHeight: 1.3,
            }}
          >
            For anyone who&apos;s been told they &ldquo;seem fine.&rdquo;
          </h2>

          {/* 2×2 grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 20,
            }}
          >
            {[
              {
                title: "Self-advocates",
                body: "Adults exploring late diagnosis who need help translating their lived experience into language clinicians understand.",
              },
              {
                title: "Workplace navigators",
                body: "People pursuing HR accommodations who need clear documentation of functional impact — not just a label.",
              },
              {
                title: "Heavy maskers",
                body: "Those who\u2019ve spent years appearing \u201cfine\u201d and need a tool that sees through the performance to the real pattern.",
              },
              {
                title: "Post-burnout recoverers",
                body: "Anyone rebuilding after a crash and trying to understand what happened — in their own words, at their own pace.",
              },
            ].map((card) => (
              <div
                key={card.title}
                style={{
                  backgroundColor: "var(--imw-bg-surface)",
                  border: "1px solid var(--imw-border-default)",
                  padding: "28px 24px",
                }}
              >
                <h3
                  className="imw-h2"
                  style={{ marginBottom: 10 }}
                >
                  {card.title}
                </h3>
                <p
                  className="imw-ui-small"
                  style={{
                    lineHeight: 1.7,
                    margin: 0,
                    color: "var(--imw-text-secondary)",
                  }}
                >
                  {card.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer CTA ──────────────────────────────────────────────────── */}
      <section
        style={{
          backgroundColor: "var(--imw-text-primary)",
          padding: "80px 48px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <h2
            style={{
              fontFamily: "var(--imw-font-display)",
              fontSize: "2rem",
              fontWeight: 900,
              color: "var(--imw-bg-base)",
              margin: "0 0 16px",
              lineHeight: 1.2,
            }}
          >
            Your story deserves to be heard.
          </h2>

          <p
            style={{
              fontFamily: "var(--imw-font-ui)",
              fontSize: "0.95rem",
              fontWeight: 400,
              color: "rgba(245, 240, 232, 0.7)",
              lineHeight: 1.75,
              margin: "0 0 36px",
            }}
          >
            Join the beta — free access while we build together. No credit
            card. No clinical framing. Just your words.
          </p>

          <Link
            href="/sign-up"
            style={{
              ...btnPrimary,
              boxShadow: "2px 2px 0 0 rgba(245, 240, 232, 0.3)",
            }}
          >
            Get started free
          </Link>

          <p
            style={{
              fontFamily: "var(--imw-font-ui)",
              fontSize: "0.65rem",
              fontWeight: 400,
              color: "rgba(245, 240, 232, 0.4)",
              lineHeight: 1.6,
              marginTop: 32,
              marginBottom: 0,
            }}
          >
            InMyWords is a self-documentation tool, not a medical service. By
            signing up, you agree to our{" "}
            <Link
              href="/tos"
              style={{ color: "rgba(245, 240, 232, 0.5)", textDecoration: "underline" }}
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              style={{ color: "rgba(245, 240, 232, 0.5)", textDecoration: "underline" }}
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </section>

      {/* ── Footer nav ──────────────────────────────────────────────────── */}
      <footer
        style={{
          backgroundColor: "var(--imw-bg-surface)",
          borderTop: "1px solid var(--imw-border-default)",
          padding: "20px 48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <span
          style={{
            fontFamily: "var(--imw-font-display)",
            fontSize: "0.9rem",
            fontWeight: 900,
            color: "var(--imw-text-primary)",
            letterSpacing: "-0.01em",
          }}
        >
          in<span style={{ color: "var(--imw-ac)" }}>My</span>Words
        </span>

        {/* Footer links */}
        <div style={{ display: "flex", gap: 24 }}>
          {[
            { label: "Terms of service", href: "/tos" },
            { label: "Privacy policy", href: "/privacy" },
            { label: "Contact", href: "mailto:hello@inmywords.app" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                fontFamily: "var(--imw-font-ui)",
                fontSize: "0.75rem",
                fontWeight: 400,
                color: "var(--imw-text-tertiary)",
                textDecoration: "none",
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </footer>
    </div>
  );
}
