import { type NextRequest, NextResponse } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";
import { isClerkConfigured } from "@/lib/clerk";

/**
 * Clerk's proxy, mounted only when accounts are switched on.
 *
 * `clerkMiddleware()` throws without a publishable key, and the proxy runs on
 * every request, so calling it unguarded would 500 the entire site rather than
 * just the signed-in parts. Building the handler once at module scope — rather
 * than per request — keeps the hot path free of the check.
 *
 * Supabase's `updateSession` used to run here to refresh its auth cookies.
 * Identity is Clerk's job now, and the site no longer has a Supabase session
 * to keep alive.
 */
const handler = isClerkConfigured ? clerkMiddleware() : null;

export async function proxy(request: NextRequest) {
  if (!handler) return NextResponse.next();
  return handler(request, {} as never);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - image files (svg, png, jpg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
