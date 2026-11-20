import "server-only";
import { createClient as createPublicClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createSessionClient } from "@/lib/supabase/server";

export type ChristmasMode = "auto" | "on" | "off";
const CHRISTMAS_KEY = "christmas_mode";

export function parseChristmasMode(value: unknown): ChristmasMode {
  return value === "on" || value === "off" ? value : "auto";
}

/**
 * Reads the Christmas mode without needing any secret: with the service key when the server has one, otherwise as the
 * public (anon) role, which migration 0012 allows to read this table. "auto" (Dec 1 - Jan 6) when nothing is stored,
 * or when the table, the policy or the database is unavailable.
 */
export async function getChristmasMode(): Promise<ChristmasMode> {
  try {
    const client = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient()
      : createPublicClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.from("site_settings").select("value").eq("key", CHRISTMAS_KEY).maybeSingle();
    if (error) return "auto";
    return parseChristmasMode(data?.value);
  } catch {
    return "auto";
  }
}

function friendly(message: string) {
  if (/row-level security|permission denied|policy/i.test(message)) {
    return "Saving needs one small database change (migration 0012_site_settings_policies.sql). Run it once in Supabase, then try again.";
  }
  if (/site_settings/.test(message) && /(does not exist|schema cache|relation)/i.test(message)) {
    return "The site_settings table does not exist yet. Run migration 0011 first.";
  }
  return message;
}

/** Never throws: any problem comes back as a readable message instead of a crash. */
export async function setChristmasMode(mode: ChristmasMode): Promise<{ error?: string }> {
  try {
    // With the service key the server writes directly; without it, the signed-in admin writes under the table's policies.
    const client = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createSessionClient();
    const { error } = await client.from("site_settings").upsert({ key: CHRISTMAS_KEY, value: mode, updated_at: new Date().toISOString() });
    return error ? { error: friendly(error.message) } : {};
  } catch (error) {
    return { error: friendly(error instanceof Error ? error.message : "Could not save the setting.") };
  }
}
