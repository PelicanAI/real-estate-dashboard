import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

/**
 * Create a Supabase client for use in Server Components, Server Actions, and
 * Route Handlers.
 *
 * The client uses the **anon** key and reads / writes auth tokens via the
 * Next.js cookie jar so that RLS policies are evaluated against the
 * currently-authenticated user.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // `setAll` can throw when called from a Server Component because
            // the response headers are read-only at that point. This is
            // expected -- the middleware will refresh the session instead.
          }
        },
      },
    },
  );
}

/**
 * Create a Supabase client with the **service role** key.
 *
 * This client bypasses RLS entirely and should **only** be used in trusted
 * server-side contexts such as cron jobs, webhooks, or admin operations.
 *
 * Never expose this client or its key to the browser.
 */
export async function createServiceClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Same as above -- safe to swallow in read-only contexts.
          }
        },
      },
    },
  );
}
