"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

// Restricts the entire /chris playground to the owner only. Mirrors the
// eval-prep gate. In dev-bypass mode ClerkProvider isn't mounted, so we skip
// the check entirely and render through.
const devBypass = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true";
const OWNER_EMAIL = "chrislahoma@gmail.com";

export function OwnerGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { user, isLoaded } = devBypass ? { user: null, isLoaded: true } : useUser();

  const isOwner =
    devBypass || user?.primaryEmailAddress?.emailAddress === OWNER_EMAIL;

  useEffect(() => {
    if (!devBypass && isLoaded && !isOwner) {
      router.replace("/");
    }
  }, [isLoaded, isOwner, router]);

  // Render nothing until we've confirmed ownership (avoids a flash for
  // non-owners and during the Clerk load).
  if (!devBypass && (!isLoaded || !isOwner)) return null;

  return <>{children}</>;
}
