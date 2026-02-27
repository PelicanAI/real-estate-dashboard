import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next.js middleware – runs on every matched route before rendering.
 *
 * Responsibilities:
 *  1. Refresh the Supabase auth session (keeps cookies in sync).
 *  2. Redirect unauthenticated users to /login.
 *  3. Redirect authenticated users away from /login to /dashboard.
 */
export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // ------------------------------------------------------------------
  // Public routes – always allow through
  // ------------------------------------------------------------------
  const isPublicRoute =
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/cron");

  // ------------------------------------------------------------------
  // Unauthenticated visitors trying to access protected routes
  // ------------------------------------------------------------------
  if (!user && !isPublicRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    // Preserve the originally-requested URL so we can redirect back after login.
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ------------------------------------------------------------------
  // Authenticated users landing on /login – send them to the dashboard
  // ------------------------------------------------------------------
  if (user && pathname === "/login") {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/properties";
    return NextResponse.redirect(dashboardUrl);
  }

  return supabaseResponse;
}

/**
 * Match all routes except Next.js internals and static assets.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     *  - _next/static  (static files)
     *  - _next/image   (image optimization files)
     *  - favicon.ico   (favicon)
     *  - public folder assets (svg, png, jpg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
