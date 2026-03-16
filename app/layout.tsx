import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "InMyWords",
  description: "A neurodivergent self-advocacy journaling tool",
};

const devBypass = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const body = (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );

  // Skip ClerkProvider in dev bypass mode — prevents Clerk's client SDK
  // from running and making external redirects that break the preview panel.
  if (devBypass) return body;

  return <ClerkProvider>{body}</ClerkProvider>;
}
