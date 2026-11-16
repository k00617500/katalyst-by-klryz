import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLiveVisitorCount } from "@/lib/cms/analytics";

export async function GET() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("id").eq("id", userData.user.id).maybeSingle();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const count = await getLiveVisitorCount();
  return NextResponse.json({ count });
}
