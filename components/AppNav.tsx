"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

const devBypass = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true";

export default function AppNav() {
  const { theme, setTheme } = useTheme();

  return (
    <nav className="border-b bg-background">
      <div className="mx-auto max-w-2xl flex items-center justify-between px-4 py-4">
        {/* Wordmark */}
        <Link
          href="/"
          className="text-base font-semibold tracking-tight hover:opacity-80 transition-opacity"
        >
          InMyWords
        </Link>

        {/* Nav links + user */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Journal
          </Link>
          <span className="text-sm text-muted-foreground/40 cursor-not-allowed select-none">
            Export
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
          {!devBypass && <UserButton />}
        </div>
      </div>
    </nav>
  );
}
