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

    let synced = 0;
    let resultsProcessed = 0;

    for (const match of matches) {
      const { error: matchError } = await supabase.from("matches").upsert(
        {
          id: match.id,
          name: match.name,
          team1: match.team1,
          team2: match.team2,
          venue: match.venue,
          match_date: match.match_date,
          status: match.status,
          winner: match.winner,
          match_started: match.match_started,
          match_ended: match.match_ended,
          raw_data: match.raw_data,
          last_synced: new Date().toISOString(),
        },
        { onConflict: "id" },
      );

      if (matchError) {
        console.error(`Error upserting match ${match.id}:`, matchError);
        continue;
      }

      synced++;

      if (match.match_ended && match.winner) {
        await resolveMatchPredictions(
          supabase,
          match.id,
          match.winner,
          match.match_date,
        );
        resultsProcessed++;

        // Also calculate fantasy points for this match
        // Only runs if there are unresolved fantasy picks (points_earned still 0)
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
  const { data: predictions, error } = await supabase
    .from("predictions")
    .select("id, user_id, predicted_team")
    .eq("match_id", matchId)
    .is("is_correct", null);

  if (error || !predictions?.length) return;

  const matchDay = matchDate.slice(0, 10);

  for (const prediction of predictions) {
    const isCorrect = prediction.predicted_team === winner;

    if (isCorrect) {
      // Fetch current streak BEFORE updating — this determines points awarded
      const { data: profile } = await supabase
        .from("profiles")
        .select("voting_streak, last_correct_vote_date")
        .eq("id", prediction.user_id)
        .single();

      const currentStreak = profile?.voting_streak ?? 0;

      // Streak rule:
      //   streak 0–2 correct in a row → still building → +1 pt
      //   streak 3+ (i.e. 4th correct prediction onwards) → +2 pts
      const points = currentStreak >= 3 ? 2 : 1;

      // Resolve prediction with correct points
      await supabase
        .from("predictions")
        .update({
          is_correct: true,
          points,
          updated_at: new Date().toISOString(),
        })
        .eq("id", prediction.id);

      // Update voting streak
      await supabase.rpc("update_voting_streak", {
        p_user_id: prediction.user_id,
        match_day: matchDay,
      });
    } else {
      // Wrong prediction — 0 points, streak resets
      await supabase
        .from("predictions")
        .update({
          is_correct: false,
          points: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", prediction.id);

      // Reset voting streak unconditionally on a wrong prediction
      // (streak = consecutive correct DAYS — one wrong ends it)
      const { data: profile } = await supabase
        .from("profiles")
        .select("last_correct_vote_date")
        .eq("id", prediction.user_id)
        .single();

      if (profile && profile.last_correct_vote_date !== matchDay) {
        await supabase
          .from("profiles")
          .update({ voting_streak: 0, updated_at: new Date().toISOString() })
          .eq("id", prediction.user_id);
      }
    }
  }
}
