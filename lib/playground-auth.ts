import { currentUser } from "@clerk/nextjs/server";

// Owner-only gate for the playground. Mirrors the eval-prep owner pattern.
export const PLAYGROUND_OWNER_EMAIL = "chrislahoma@gmail.com";

const devBypass = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true";

// Returns the caller's userId ONLY if they are the playground owner; otherwise
// null (treated as unauthorized by the API routes). In dev-bypass mode Clerk
// isn't active, so short-circuit to the local dev user (see CLAUDE.md).
export async function getPlaygroundUserId(): Promise<string | null> {
  if (devBypass) {
    return "dev-user-local";
  }
  // currentUser() gives us the email to verify ownership. It relies on
  // clerkMiddleware having run, which it has (we only skip it in bypass mode).
  const user = await currentUser();
  if (!user) return null;
  const email = user.primaryEmailAddress?.emailAddress;
  if (email !== PLAYGROUND_OWNER_EMAIL) return null;
  return user.id;
}
