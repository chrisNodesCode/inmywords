import { auth } from "@clerk/nextjs/server";

// Mirrors the InMyWords dev-bypass pattern (see CLAUDE.md). Clerk's `auth()`
// throws if clerkMiddleware() hasn't run, so short-circuit in bypass mode.
// The playground is personal, but we still scope rows by userId for safety.
export async function getPlaygroundUserId(): Promise<string | null> {
  if (process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true") {
    return "dev-user-local";
  }
  const { userId } = await auth();
  return userId;
}
