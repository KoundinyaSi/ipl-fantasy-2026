import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Default redirect — overwritten on success
  const response = NextResponse.redirect(`${origin}/?error=auth_failed`);

  if (code) {
    console.log(
      "Auth callback received code------------------------------>",
      code
    );

    // Must build client inline here — threads cookies through request → response
    // directly. The shared createClient() uses next/headers which doesn't give
    // writable cookie access in Route Handlers, breaking PKCE verification.
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: any) {
            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }: {
                name: string;
                value: string;
                options: any;
              }) => response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      console.log(
        "User authenticated successfully------------------------------>",
        data.user
      );
      const user = data.user;
      const meta = user.user_metadata;

      // Upsert profile — on first login this creates the row
      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          name:
            meta?.full_name ||
            meta?.name ||
            user.email?.split("@")[0] ||
            "Unknown",
          email: user.email!,
          avatar_url: meta?.avatar_url || meta?.picture || null,
        },
        {
          onConflict: "id",
          ignoreDuplicates: false,
        }
      );

      if (profileError) {
        console.error("Profile upsert error:", profileError);
      }

      // Update login streak via DB function
      await supabase.rpc("update_login_streak", { p_user_id: user.id });

      // Check if user is approved to decide where to send them
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_approved")
        .eq("id", user.id)
        .single();

      const isApproved = profile?.is_approved === true;
      const redirectTo = isApproved ? "/home" : "/invite";

      console.log(
        "Redirecting user to------------------------------>",
        redirectTo
      );
      console.log(
        "Is user approved?------------------------------>",
        isApproved
      );

      // Redirect using the same response object so session cookies are preserved
      response.headers.set("Location", `${origin}${redirectTo}`);
      return new NextResponse(null, {
        status: 302,
        headers: response.headers,
      });
    } else {
      console.error(
        "Auth exchange error---------------------------------------->",
        error
      );
    }
  }

  return response;
}
