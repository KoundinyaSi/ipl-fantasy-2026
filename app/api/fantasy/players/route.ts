import { createClient, createServiceClient } from "@/lib/supabase/server";
import { fetchMatchSquad } from "@/lib/cricapi";
import { NextResponse } from "next/server";

// GET /api/fantasy/players?match_id=xxx
// Returns squad for a match. Fetches from CricAPI and caches on first call.
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

  // Return from cache if exists
  const { data: cached } = await supabase
    .from("match_players")
    .select("*, players(*)")
    .eq("match_id", matchId);

  if (cached && cached.length > 0) {
    return NextResponse.json({ players: cached });
  }

  // Fetch from CricAPI and cache
  const serviceSupabase = createServiceClient();

  try {
    const squads = await fetchMatchSquad(matchId);
    if (!squads.length) return NextResponse.json({ players: [] });

    const playerRows: object[] = [];
    const matchPlayerRows: object[] = [];

    for (const team of squads) {
      for (const p of team.players) {
        playerRows.push({
          id: p.id,
          name: p.name,
          role: p.role || "Batsman",
          country: p.country ?? null,
          player_img: p.playerImg ?? null,
        });
        matchPlayerRows.push({
          match_id: matchId,
          player_id: p.id,
          team: team.teamName,
          is_playing_11: false,
        });
      }
    }

    await serviceSupabase
      .from("players")
      .upsert(playerRows, { onConflict: "id", ignoreDuplicates: false });
    await serviceSupabase
      .from("match_players")
      .upsert(matchPlayerRows, {
        onConflict: "match_id,player_id",
        ignoreDuplicates: true,
      });

    const { data: fresh } = await serviceSupabase
      .from("match_players")
      .select("*, players(*)")
      .eq("match_id", matchId);

    return NextResponse.json({ players: fresh ?? [] });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
