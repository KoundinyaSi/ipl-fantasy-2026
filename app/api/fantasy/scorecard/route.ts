import { createServiceClient } from "@/lib/supabase/server";
import { fetchMatchScorecard } from "@/lib/cricapi";
import { calculatePlayerScores, applyMultipliers } from "@/lib/fantasy-scoring";
import { NextResponse } from "next/server";

// POST /api/fantasy/scorecard?match_id=xxx
// Fetches scorecard, calculates fantasy points for all picks, updates DB
// Called automatically by sync route and manually by admin
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get("match_id");
  if (!matchId)
    return NextResponse.json({ error: "match_id required" }, { status: 400 });

  // Auth: only service role or admin
  const authHeader = request.headers.get("authorization");
  const isService = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  if (!isService && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Fetch scorecard from CricAPI
  const scorecard = await fetchMatchScorecard(matchId);
  if (!scorecard) {
    return NextResponse.json({ message: "Scorecard not available yet" });
  }

  // Calculate per-player fantasy scores
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerScores = calculatePlayerScores(scorecard.innings as any);

  // Get all fantasy picks for this match
  const { data: picks } = await supabase
    .from("fantasy_picks")
    .select("*, fantasy_pick_players(*)")
    .eq("match_id", matchId);

  if (!picks?.length) {
    return NextResponse.json({ message: "No picks found for this match" });
  }

  let processed = 0;
  for (const pick of picks) {
    let pickTotal = 0;

    for (const pp of pick.fantasy_pick_players) {
      const score = playerScores.get(pp.player_id);
      const basePoints = score?.totalPoints ?? 0;
      const finalPoints = applyMultipliers(
        basePoints,
        pp.is_captain,
        pp.is_vice_captain,
      );

      await supabase
        .from("fantasy_pick_players")
        .update({ points_earned: finalPoints })
        .eq("id", pp.id);

      pickTotal += finalPoints;
    }

    await supabase
      .from("fantasy_picks")
      .update({
        total_fantasy_points: pickTotal,
        updated_at: new Date().toISOString(),
      })
      .eq("id", pick.id);

    processed++;
  }

  return NextResponse.json({
    success: true,
    processed,
    playerScoresCount: playerScores.size,
  });
}
