import { NextResponse } from "next/server";
import { getChristmasMode } from "@/lib/site-settings";

// Public, read-only: which seasonal switches the admin has set. Cached briefly so a change shows up within ~a minute.
export async function GET() {
  const christmas = await getChristmasMode();
  return NextResponse.json({ christmas }, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } });
}
