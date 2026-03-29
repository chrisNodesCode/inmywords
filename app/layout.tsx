import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "next-themes";
import { IMWThemeProvider } from "@/components/ThemeProvider";
import { PlanProvider } from "@/components/PlanProvider";
import { SidebarWrapper } from "@/app/SidebarWrapper";
import "./globals.css";

export const metadata: Metadata = {
  title: "InMyWords",
  description: "A neurodivergent self-advocacy journaling tool",
  robots: { index: false, follow: false },
};

const devBypass = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const body = (
    // suppressHydrationWarning: next-themes and IMWThemeProvider both set
    // attributes on <html> client-side, causing expected hydration mismatches.
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,900&family=IBM+Plex+Sans:wght@400;600&family=Noto+Serif:ital,wght@0,400;0,700;1,400&family=PT+Serif:ital,wght@0,400;0,700;1,400&family=Open+Sans:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="antialiased"
        style={{ backgroundColor: "var(--imw-bg-base)", color: "var(--imw-text-primary)" }}
      >
        {/* next-themes: handles system dark/light detection.
            attribute="data-mode" aligns with our CSS selectors. */}
        <ThemeProvider
          attribute="data-mode"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* IMWThemeProvider: fetches user preferences from DB on mount,
              applies data-accent, data-font, --imw-font-body to <html>. */}
          <IMWThemeProvider>
            <PlanProvider>
              <div style={{ display: "flex", minHeight: "100vh" }}>
                <SidebarWrapper />
                <main style={{ flex: 1, minWidth: 0 }}>{children}</main>
              </div>
            </PlanProvider>
          </IMWThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );

  if (devBypass) return body;

  return <ClerkProvider>{body}</ClerkProvider>;
}
