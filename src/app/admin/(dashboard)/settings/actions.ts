"use server";

import { revalidatePath } from "next/cache";
import { verifyAdminSession } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { parseChristmasMode, setChristmasMode } from "@/lib/site-settings";

export interface SettingsFormState {
  error?: string;
  success?: boolean;
}

export async function updateProfileAction(_state: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const { profile } = await verifyAdminSession();
  const displayName = formData.get("displayName")?.toString().trim();
  if (!displayName) return { error: "Display name is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ display_name: displayName }).eq("id", profile.id);
  if (error) return { error: error.message };

  revalidatePath("/admin", "layout");
  return { success: true };
}

export async function setChristmasModeAction(mode: string): Promise<{ error?: string }> {
  try {
    await verifyAdminSession();
    const result = await setChristmasMode(parseChristmasMode(mode));
    if (result.error) return { error: result.error };
    revalidatePath("/", "layout");
    return {};
  } catch (error) {
    // verifyAdminSession redirects (a thrown signal Next handles) when the session is gone; let that through.
    if (error instanceof Error && /NEXT_REDIRECT|NEXT_NOT_FOUND/.test(error.message + String((error as { digest?: string }).digest))) throw error;
    return { error: "Could not save the setting. Reload the page and try again." };
  }
}
