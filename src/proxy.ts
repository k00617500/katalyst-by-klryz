import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Refreshes the Supabase session cookie on every admin request and redirects
 * unauthenticated visitors away from /admin before any page or layout runs.
 * This is an optimistic check only (cookie presence, not a DB role lookup) —
 * the real authorization check lives in src/lib/auth/dal.ts, run again in
 * every admin page/server action per the Next.js auth guide.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const noAuthRequired = ["/admin/login", "/admin/auth/confirm", "/admin/reset-password"];
  const isPublicAdminRoute = noAuthRequired.some((route) => path.startsWith(route));
  const isLoginRoute = path === "/admin/login";

  if (!data.user && !isPublicAdminRoute) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", path);
    return NextResponse.redirect(loginUrl);
  }

  if (data.user && isLoginRoute) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
