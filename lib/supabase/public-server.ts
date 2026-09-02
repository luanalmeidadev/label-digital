import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client for PUBLIC server-side reads (categories, products, catalog).
 *
 * Uses the anon key (respecting RLS) and does NOT rely on cookies/sessions.
 * This avoids PGRST301 ("Expected 3 parts in JWT; got 1") errors that occur when
 * @supabase/ssr's createServerClient is used without an authenticated session,
 * because it sends an empty/malformed cookie-based JWT to PostgREST.
 *
 * For authenticated admin flows, continue using createSupabaseServerClient() from server.ts.
 */
export function createSupabasePublicServerClient() {
  const supabaseUrl =
    process.env.SUPABASE_SERVER_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const anonKey =
    process.env.SUPABASE_SERVER_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL (ou SUPABASE_SERVER_URL) não configurada."
    );
  }

  if (!anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY não configurada."
    );
  }

  return createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
