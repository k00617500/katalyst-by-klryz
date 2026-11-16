import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase redirects password-reset links here with a `?code=` param (PKCE
 * flow). Exchanging it for a session sets the auth cookies, then we hand off
 * to the actual reset-password form.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL("/admin/reset-password", request.url));
}
