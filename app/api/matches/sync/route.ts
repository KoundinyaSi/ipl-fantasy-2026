import { createServiceClient } from "@/lib/supabase/server";
import { fetchIPLMatches } from "@/lib/cricapi";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";
  const hasSecret = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isVercelCron && !hasSecret && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceClient();

  try {
    const matches = await fetchIPLMatches();

    if (!matches.length) {
      return NextResponse.json({
        message: "No IPL matches found from API",
        synced: 0,
      });
    }

    // Sort matches chronologically before processing — critical for double headers.
    // Streak resets from match 1 must be written to DB before match 2 reads them.
    const sortedMatches = [...matches].sort(
      (a, b) =>
        new Date(a.match_date).getTime() - new Date(b.match_date).getTime(),
    );

    let synced = 0;
    let resultsProcessed = 0;

    for (const match of sortedMatches) {
      const team1 = [match.team1, match.team2].sort()[0];
      const team2 = [match.team1, match.team2].sort()[1];
      const matchDay = new Date(match.match_date).toISOString().slice(0, 10);

      const { error: matchError } = await supabase.from("matches").upsert(
        {
          id: match.id,
          name: match.name,
          team1: team1,
          team2: team2,
          venue: match.venue,
          match_date:
            new Date(match.match_date).getHours() === 0
              ? undefined
              : match.match_date,
          match_day: matchDay,
          status: match.status,
          winner: match.winner,
          match_started: match.match_started,
          match_ended: match.match_ended,
          raw_data: match.raw_data,
          last_synced: new Date().toISOString(),
        },
        { onConflict: "team1,team2,match_day" },
      );

      if (matchError) {
        console.error(`Error upserting match ${match.id}:`, matchError);
        continue;
      }

      synced++;

      if (match.match_ended && match.winner) {
        // Process predictions fully and wait for all DB writes to complete
        // before moving to the next match. This ensures streak state is
        // accurate for subsequent matches — especially critical on double headers
        // where match 2's streak calculation must see match 1's reset.
        await resolveMatchPredictions(
          supabase,
          match.id,
          match.winner,
          match.match_date,
        );
        resultsProcessed++;

        // Fantasy points
        const { data: unresolved } = await supabase
          .from("fantasy_pick_players")
          .select("id")
          .eq("points_earned", 0)
          .limit(1)
          .returns<{ id: string }[]>();

        if (unresolved && unresolved.length > 0) {
          const appUrl =
            process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
          await fetch(`${appUrl}/api/fantasy/scorecard?match_id=${match.id}`, {
            method: "POST",
            headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
          }).catch((e) => console.error("Fantasy scorecard error:", e));
        }
      }
    }

    return NextResponse.json({
      message: "Sync complete",
      synced,
      resultsProcessed,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Sync error:", err);
    return NextResponse.json(
      { error: "Sync failed", details: String(err) },
      { status: 500 },
    );
  }
}

async function resolveMatchPredictions(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  matchId: string,
  winner: string,
  matchDate: string,
) {
  const matchDay = matchDate.slice(0, 10);

  // ─── CORRECT PREDICTIONS ─────────────────────────────────────────────────
  // Atomic UPDATE...RETURNING — claims all correct unresolved predictions in
  // one DB operation. Second sync finds 0 rows (already claimed) and skips.
  const { data: claimedCorrect } = await supabase
    .from("predictions")
    .update({ is_correct: true, updated_at: new Date().toISOString() })
    .eq("match_id", matchId)
    .eq("predicted_team", winner)
    .is("is_correct", null)
    .select("id, user_id");

  // Process each correct prediction sequentially — not Promise.all —
  // so streak reads always see the latest written state
  for (const prediction of claimedCorrect ?? []) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("voting_streak")
      .eq("id", prediction.user_id)
      .single();

    const currentStreak = profile?.voting_streak ?? 0;
    const points = currentStreak >= 3 ? 2 : 1;

    await supabase
      .from("predictions")
      .update({ points, updated_at: new Date().toISOString() })
      .eq("id", prediction.id);

    await supabase.rpc("update_voting_streak", {
      p_user_id: prediction.user_id,
      match_day: matchDay,
    });
  }

  // ─── WRONG PREDICTIONS ───────────────────────────────────────────────────
  const { data: claimedWrong } = await supabase
    .from("predictions")
    .update({
      is_correct: false,
      points: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("match_id", matchId)
    .neq("predicted_team", winner)
    .is("is_correct", null)
    .select("id, user_id");

  // Reset streaks sequentially for the same reason
  for (const prediction of claimedWrong ?? []) {
    await supabase
      .from("profiles")
      .update({ voting_streak: 0, updated_at: new Date().toISOString() })
      .eq("id", prediction.user_id);
  }
}
