import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

// Layer 1: Bypass Clerk entirely in Claude Code Desktop preview.
// When bypass is active, use a plain pass-through to avoid clerkMiddleware
// adding x-middleware-rewrite and x-clerk-auth-* response headers, which
// cause the preview panel's embedded browser to abort navigation.

// Public routes that don't require authentication
const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

export const proxy =
  process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true"
    ? (_request: NextRequest) => NextResponse.next()
    : clerkMiddleware(async (auth, request) => {
        // Protect all routes except sign-in and sign-up
        if (!isPublicRoute(request)) {
          await auth.protect();
        }
      });

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
