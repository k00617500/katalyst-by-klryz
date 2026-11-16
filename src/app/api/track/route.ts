import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_EVENTS = new Set([
  "page_view",
  "project_view",
  "project_demo_click",
  "project_source_click",
  "article_view",
  "article_share",
  "resume_download",
  "contact_click",
  "email_click",
  "social_link_click",
  "navigation_click",
]);

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.eventName || !ALLOWED_EVENTS.has(body.eventName) || !body.sessionId) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("analytics_events").insert({
    event_name: body.eventName,
    path: typeof body.path === "string" ? body.path.slice(0, 500) : null,
    referrer: typeof body.referrer === "string" ? body.referrer.slice(0, 500) : null,
    device_category: ["desktop", "mobile", "tablet"].includes(body.deviceCategory) ? body.deviceCategory : null,
    session_id: String(body.sessionId).slice(0, 100),
    metadata: typeof body.metadata === "object" && body.metadata ? body.metadata : {},
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
