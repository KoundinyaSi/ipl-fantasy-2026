import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST /api/fantasy/admin/playing11
// Body: { match_id, player_ids: string[] } — admin sets which players are in playing 11
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Admin check
  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", user.id)
    .single();

  const adminEmail =
    process.env.ADMIN_EMAIL ?? process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  if (
    !profile?.email ||
    profile.email.toLowerCase() !== adminEmail?.toLowerCase().trim()
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { match_id, player_ids } = await request.json();
  if (!match_id || !player_ids?.length) {
    return NextResponse.json(
      { error: "match_id and player_ids required" },
      { status: 400 },
    );
  }

  const serviceSupabase = createServiceClient();
  const now = new Date().toISOString();

  // Reset all to false first
  await serviceSupabase
    .from("match_players")
    .update({ is_playing_11: false, playing_11_confirmed_at: null })
    .eq("match_id", match_id);

  // Set selected players to true
  const { error } = await serviceSupabase
    .from("match_players")
    .update({ is_playing_11: true, playing_11_confirmed_at: now })
    .eq("match_id", match_id)
    .in("player_id", player_ids);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, confirmed_at: now });
}

// GET /api/fantasy/admin/playing11?match_id=xxx
// Returns current playing 11 status for a match
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get("match_id");
  if (!matchId)
    return NextResponse.json({ error: "match_id required" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("match_players")
    .select("*, players(*)")
    .eq("match_id", matchId)
    .order("team");

  return NextResponse.json({ players: data ?? [] });
}
