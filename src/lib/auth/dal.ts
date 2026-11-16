import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/types/database";

/**
 * Secure session + authorization check. The proxy (src/proxy.ts) only does an
 * optimistic cookie check; this is the real check, close to the data, per
 * https://nextjs.org/docs/app/guides/authentication#creating-a-data-access-layer-dal
 */
export const verifyAdminSession = cache(async () => {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/admin/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/admin/login");
  }

  return { user: userData.user, profile: profile as ProfileRow };
});
