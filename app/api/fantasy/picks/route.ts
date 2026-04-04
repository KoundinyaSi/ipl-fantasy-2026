import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isVotingLocked } from "@/lib/utils";
import { NextResponse } from "next/server";

// GET /api/fantasy/picks?match_id=xxx
// Returns all picks for a match (only after lock) or user's own pick
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get("match_id");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const query = supabase.from("fantasy_picks").select(`
      *,
      profiles(id, name, avatar_url),
      fantasy_pick_players(*, players(*))
    `);

  if (matchId) query.eq("match_id", matchId);
  else query.eq("user_id", user.id);

  const { data, error } = await query;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ picks: data });
}

// POST /api/fantasy/picks
// Body: { match_id, player_ids: string[], captain_id, vice_captain_id }
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { match_id, player_ids, captain_id, vice_captain_id } = body;

  if (!match_id || !player_ids || !captain_id || !vice_captain_id) {
    return NextResponse.json(
      { error: "match_id, player_ids, captain_id, vice_captain_id required" },
      { status: 400 },
    );
  }

  if (player_ids.length !== 11) {
    return NextResponse.json(
      { error: "Must select exactly 11 players" },
      { status: 400 },
    );
  }

  if (
    !player_ids.includes(captain_id) ||
    !player_ids.includes(vice_captain_id)
  ) {
    return NextResponse.json(
      { error: "Captain and vice captain must be in your 11" },
      { status: 400 },
    );
  }

  if (captain_id === vice_captain_id) {
    return NextResponse.json(
      { error: "Captain and vice captain must be different" },
      { status: 400 },
    );
  }

  // Check match exists and voting isn't locked
  const { data: match } = await supabase
    .from("matches")
    .select("match_date, match_ended, team1, team2")
    .eq("id", match_id)
    .single();

  if (!match)
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  if (match.match_ended)
    return NextResponse.json({ error: "Match has ended" }, { status: 400 });
  if (isVotingLocked(match.match_date))
    return NextResponse.json({ error: "Picks are locked" }, { status: 400 });

  // Validate team constraint — min 3, max 8 from one team
  const { data: matchPlayers } = await supabase
    .from("match_players")
    .select("player_id, team")
    .eq("match_id", match_id)
    .in("player_id", player_ids);

  if (!matchPlayers || matchPlayers.length !== 11) {
    return NextResponse.json(
      { error: "Some selected players are not in this match" },
      { status: 400 },
    );
  }

  const teamCounts: Record<string, number> = {};
  for (const mp of matchPlayers) {
    teamCounts[mp.team] = (teamCounts[mp.team] || 0) + 1;
  }
  const maxFromOneTeam = Math.max(...Object.values(teamCounts));
  const minFromOneTeam = Math.min(...Object.values(teamCounts));
  if (maxFromOneTeam > 8)
    return NextResponse.json(
      { error: "Maximum 8 players from one team" },
      { status: 400 },
    );
  if (minFromOneTeam < 3)
    return NextResponse.json(
      { error: "Minimum 3 players from each team" },
      { status: 400 },
    );

  const serviceSupabase = createServiceClient();

  // Upsert the fantasy pick
  const { data: pick, error: pickError } = await serviceSupabase
    .from("fantasy_picks")
    .upsert(
      {
        user_id: user.id,
        match_id,
        captain_id,
        vice_captain_id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,match_id" },
    )
    .select()
    .single();

  if (pickError || !pick) {
    return NextResponse.json(
      { error: pickError?.message ?? "Failed to save pick" },
      { status: 500 },
    );
  }

  // Delete existing pick players and re-insert
  await serviceSupabase
    .from("fantasy_pick_players")
    .delete()
    .eq("fantasy_pick_id", pick.id);

  const pickPlayerRows = player_ids.map((pid: string) => ({
    fantasy_pick_id: pick.id,
    player_id: pid,
    is_captain: pid === captain_id,
    is_vice_captain: pid === vice_captain_id,
    is_substitute: false,
    points_earned: 0,
  }));

  const { error: ppError } = await serviceSupabase
    .from("fantasy_pick_players")
    .insert(pickPlayerRows);
  if (ppError)
    return NextResponse.json({ error: ppError.message }, { status: 500 });

  return NextResponse.json({ pick });
}
