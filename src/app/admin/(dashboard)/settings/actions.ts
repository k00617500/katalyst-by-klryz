"use server";

import { revalidatePath } from "next/cache";
import { verifyAdminSession } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

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
