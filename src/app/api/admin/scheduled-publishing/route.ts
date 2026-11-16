import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
// Route Handlers can't use updateTag (Server Actions only), so this uses
// revalidateTag with an immediate-expiry profile instead.
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Publishes any post whose `scheduled_at` has arrived. Not reliant on a
 * browser being open — call this from Vercel Cron (see vercel.json) or any
 * external scheduler, authenticated with CRON_SECRET as a bearer token.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: due } = await supabase
    .from("posts")
    .select("id")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString());

  if (!due?.length) {
    return NextResponse.json({ published: 0 });
  }

  const { error } = await supabase.rpc("publish_scheduled_posts");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/journal");
  revalidateTag("journal-posts", { expire: 0 });

  return NextResponse.json({ published: due.length });
}
