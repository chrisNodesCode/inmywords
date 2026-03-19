// Auth layout — no sidebar, centered content, full IMW theme tokens
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "next-themes";
import "../globals.css";

export const metadata: Metadata = {
  title: "InMyWords",
  description: "A neurodivergent self-advocacy journaling tool",
  robots: { index: false, follow: false },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <meta name="robots" content="noindex, nofollow" />
        </head>
        <body className="antialiased">
          <ThemeProvider
            attribute="data-mode"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <div
              style={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "var(--imw-bg-base, #f5f4f1)",
                gap: "2rem",
                padding: "2rem",
              }}
            >
              {/* Wordmark */}
              <div
                style={{
                  fontFamily: "var(--font-geist-sans, sans-serif)",
                  fontSize: "1.25rem",
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  color: "var(--imw-text-primary, #1a1a18)",
                  opacity: 0.9,
                }}
              >
                InMyWords
              </div>
              {children}
            </div>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
