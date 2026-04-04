import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST /api/fantasy/sub
// Body: { match_id, remove_player_id, add_player_id }
// Allowed only within 1 hour of playing 11 confirmation
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { match_id, remove_player_id, add_player_id } = await request.json();

  if (!match_id || !remove_player_id || !add_player_id) {
    return NextResponse.json(
      { error: "match_id, remove_player_id, add_player_id required" },
      { status: 400 },
    );
  }

  // Check the match and playing 11 confirmation time
  const { data: match } = await supabase
    .from("matches")
    .select("match_date, match_ended, match_started")
    .eq("id", match_id)
    .single();

  if (!match)
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  if (match.match_started || match.match_ended) {
    return NextResponse.json(
      { error: "Match has already started" },
      { status: 400 },
    );
  }

  // Check that playing 11 was confirmed and sub window is open (1 hour)
  const { data: anyPlayer } = await supabase
    .from("match_players")
    .select("playing_11_confirmed_at")
    .eq("match_id", match_id)
    .eq("is_playing_11", true)
    .limit(1)
    .single();

  if (!anyPlayer?.playing_11_confirmed_at) {
    return NextResponse.json(
      { error: "Playing 11 not confirmed yet" },
      { status: 400 },
    );
  }

  const confirmedAt = new Date(anyPlayer.playing_11_confirmed_at).getTime();
  const windowMs = 60 * 60 * 1000; // 1 hour
  if (Date.now() - confirmedAt > windowMs) {
    return NextResponse.json(
      { error: "Substitution window has closed (1 hour)" },
      { status: 400 },
    );
  }

  // Check the player being removed is NOT in playing 11
  const { data: removedPlayer } = await supabase
    .from("match_players")
    .select("is_playing_11")
    .eq("match_id", match_id)
    .eq("player_id", remove_player_id)
    .single();

  if (removedPlayer?.is_playing_11) {
    return NextResponse.json(
      { error: "Can only sub out a player not in playing 11" },
      { status: 400 },
    );
  }

  // Check the player being added IS in playing 11
  const { data: addedPlayer } = await supabase
    .from("match_players")
    .select("is_playing_11")
    .eq("match_id", match_id)
    .eq("player_id", add_player_id)
    .single();

  if (!addedPlayer?.is_playing_11) {
    return NextResponse.json(
      { error: "Can only sub in a player from playing 11" },
      { status: 400 },
    );
  }

  // Get user's pick for this match
  const { data: pick } = await supabase
    .from("fantasy_picks")
    .select("id, sub_used, captain_id, vice_captain_id")
    .eq("user_id", user.id)
    .eq("match_id", match_id)
    .single();

  if (!pick)
    return NextResponse.json(
      { error: "No fantasy pick found" },
      { status: 404 },
    );
  if (pick.sub_used)
    return NextResponse.json(
      { error: "Substitution already used" },
      { status: 400 },
    );

  const serviceSupabase = createServiceClient();

  // Make sure remove_player_id is in their pick
  const { data: removeRow } = await serviceSupabase
    .from("fantasy_pick_players")
    .select("id, is_captain, is_vice_captain")
    .eq("fantasy_pick_id", pick.id)
    .eq("player_id", remove_player_id)
    .single();

  if (!removeRow)
    return NextResponse.json(
      { error: "Player not in your team" },
      { status: 400 },
    );

  // If captain/vc is being removed, transfer role to added player
  const newCaptainId = removeRow.is_captain ? add_player_id : pick.captain_id;
  const newVcId = removeRow.is_vice_captain
    ? add_player_id
    : pick.vice_captain_id;

  // Delete old pick player row
  await serviceSupabase
    .from("fantasy_pick_players")
    .delete()
    .eq("id", removeRow.id);

  // Insert new pick player row
  await serviceSupabase.from("fantasy_pick_players").insert({
    fantasy_pick_id: pick.id,
    player_id: add_player_id,
    is_captain: removeRow.is_captain,
    is_vice_captain: removeRow.is_vice_captain,
    is_substitute: true,
    points_earned: 0,
  });

  // Update pick: mark sub used, update captain/vc if changed
  await serviceSupabase
    .from("fantasy_picks")
    .update({
      sub_used: true,
      captain_id: newCaptainId,
      vice_captain_id: newVcId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", pick.id);

  return NextResponse.json({ success: true });
}
