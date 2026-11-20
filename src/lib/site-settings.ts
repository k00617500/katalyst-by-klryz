import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type ChristmasMode = "auto" | "on" | "off";
const CHRISTMAS_KEY = "christmas_mode";

export function parseChristmasMode(value: unknown): ChristmasMode {
  return value === "on" || value === "off" ? value : "auto";
}

/** "auto" (Dec 1 - Jan 6) when nothing is stored, or when the table does not exist yet. */
export async function getChristmasMode(): Promise<ChristmasMode> {
  try {
    const { data, error } = await createAdminClient().from("site_settings").select("value").eq("key", CHRISTMAS_KEY).maybeSingle();
    if (error) return "auto";
    return parseChristmasMode(data?.value);
  } catch {
    return "auto";
  }
}

export async function setChristmasMode(mode: ChristmasMode): Promise<{ error?: string }> {
  const { error } = await createAdminClient()
    .from("site_settings")
    .upsert({ key: CHRISTMAS_KEY, value: mode, updated_at: new Date().toISOString() });
  return error ? { error: error.message } : {};
}
