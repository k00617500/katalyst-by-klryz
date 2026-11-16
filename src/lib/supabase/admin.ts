import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client. Bypasses RLS — never import this outside server-only
 * code (Route Handlers, scripts), and never send it to the browser.
 * Used only where RLS genuinely can't do the job: minting the admin auth
 * user, and the scheduled-publishing cron (which has no user session).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase service role is not configured (SUPABASE_SERVICE_ROLE_KEY missing).");
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
