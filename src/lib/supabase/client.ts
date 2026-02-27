import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/**
 * Create a Supabase client for use in browser / Client Components.
 *
 * This is safe to call multiple times – @supabase/ssr deduplicates under the
 * hood using the URL + key pair, so you will always receive the same
 * underlying GoTrue / Realtime connection.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
