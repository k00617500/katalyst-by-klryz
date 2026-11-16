import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Supabase client for Server Components, Server Actions, and Route Handlers.
 * Runs as whoever's session cookie is attached — RLS enforces what they can do.
 *
 * Untyped (no generated Database schema wired up yet — see src/types/database.ts),
 * so CMS data-access functions annotate their own return types by hand.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component render — the proxy below refreshes
            // the session on the way in, so a failed write here is a no-op.
          }
        },
      },
    },
  );
}
