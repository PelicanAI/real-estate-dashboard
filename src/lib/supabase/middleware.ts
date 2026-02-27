import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Refresh the Supabase auth session on every request so that the
 * server-side cookie stays in sync with the client.
 *
 * Call this from the root Next.js middleware (`src/middleware.ts`).
 *
 * Returns the (possibly updated) response together with the Supabase client
 * so the caller can inspect the user session for route protection.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // 1. Forward the cookies to the request so that downstream Server
          //    Components / Route Handlers see the updated values.
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          // 2. Re-create the response so Next.js picks up the modified
          //    request cookies.
          supabaseResponse = NextResponse.next({
            request,
          });

          // 3. Set the cookies on the outgoing response so the browser
          //    stores them.
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Calling getUser() triggers the token refresh when needed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabaseResponse, user };
}
