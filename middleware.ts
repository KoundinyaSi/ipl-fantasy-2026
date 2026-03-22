import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Exit BEFORE touching auth for these routes — must come first.
  // /api/auth    — PKCE callback needs untouched cookies
  // /api/invite  — must be reachable by unapproved users (it's what approves them)
  // /api/matches — cron job, handles its own auth
  if (
    path.startsWith("/api/auth") ||
    path.startsWith("/api/invite") ||
    path.startsWith("/api/matches/sync") ||
    path.startsWith("/_next") ||
    path.startsWith("/favicon")
  ) {
    return NextResponse.next({ request });
  }

  // For all other routes, create the Supabase client and check session
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not logged in → only allow root
  if (!user) {
    if (path !== "/") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return supabaseResponse;
  }

  // Logged in — check profile approval
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_approved")
    .eq("id", user.id)
    .single();

  const isApproved = profile?.is_approved === true;

  if (path === "/") {
    return NextResponse.redirect(
      new URL(isApproved ? "/home" : "/invite", request.url)
    );
  }

  if (path === "/invite") {
    if (isApproved) {
      return NextResponse.redirect(new URL("/home", request.url));
    }
    return supabaseResponse;
  }

  // All other protected routes need approval
  if (!isApproved) {
    return NextResponse.redirect(new URL("/invite", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
