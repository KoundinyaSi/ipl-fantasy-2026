"use client";

import SeasonPredictionBanner from "@/components/SeasonPredictionBanner";
import FloatingNav from "@/components/FloatingNav";
import Leaderboard from "@/components/Leaderboard";
import MatchCard from "@/components/MatchCard";
import ProfileMenu from "@/components/ProfileMenu";
import ResultCard from "@/components/ResultCard";
import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Tab = "matches" | "results" | "leaderboard";

interface Profile {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  voting_streak: number;
  login_streak: number;
}

interface Match {
  id: string;
  team1: string;
  team2: string;
  venue: string;
  match_date: string;
  status: string;
  winner: string | null;
  match_started: boolean;
  match_ended: boolean;
}

interface Prediction {
  match_id: string;
  user_id: string;
  predicted_team: string;
  is_correct: boolean | null;
  profiles: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
}

interface LeaderboardEntry {
  id: string;
  name: string;
  avatar_url: string | null;
  total_points: number;
  correct_predictions: number;
  total_predictions: number;
  voting_streak: number;
}

export default function HomePage() {
  const [tab, setTab] = useState<Tab>("matches");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const supabase = createClient();
  const router = useRouter();
  const hasFetched = useRef(false);

  // Fetch everything on mount
  const loadData = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }

      const [profileRes, matchesRes, predsRes, lbRes] =
        await Promise.all([
          supabase.from("profiles").select("*").eq("id", user.id).single(),
          supabase
            .from("matches")
            .select("*")
            .order("match_date", { ascending: true }),
          supabase
            .from("predictions")
            .select(
              "match_id, user_id, predicted_team, is_correct, points, profiles(id, name, avatar_url)",
            ),
          fetch("/api/leaderboard").then((r) => r.json()),
        ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (matchesRes.data) setMatches(matchesRes.data);
      if (predsRes.data)
        setPredictions(predsRes.data as unknown as Prediction[]);
      if (lbRes.leaderboard) setLeaderboard(lbRes.leaderboard);
    } catch (e) {
      setError("Failed to load data. Please refresh.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      loadData();
    }
  }, [loadData]);

  // Option 4 — auto-sync on page load if a match has started but not ended
  // and enough time has passed that it should be over (3.5h window)
  useEffect(() => {
    if (matches.length === 0) return;

    const now = Date.now();
    const shouldSync = matches.some((m) => {
      if (!m.match_started || m.match_ended) return false;
      const startedMsAgo = now - new Date(m.match_date).getTime();
      // Match started but DB still says not ended — trigger sync if it's been 30min+ since start
      return startedMsAgo > 30 * 60 * 1000;
    });

    if (!shouldSync) return;

    console.log("Auto-sync triggered: match in progress or recently finished");
    fetch("/api/matches/sync", {
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET ?? ""}`,
      },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.resultsProcessed > 0) {
          // Results were resolved — reload everything so UI reflects new scores
          loadData();
        }
      })
      .catch(() => {
        /* silently ignore — this is a best-effort background sync */
      });
  }, [matches, loadData]);

  // Real-time predictions updates
  useEffect(() => {
    const channel = supabase
      .channel("predictions-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "predictions" },
        () => {
          // Refetch predictions on any change
          supabase
            .from("predictions")
            .select(
              "match_id, user_id, predicted_team, is_correct, profiles(id, name, avatar_url)",
            )
            .then(({ data }) => {
              if (data) setPredictions(data as unknown as Prediction[]);
            });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  async function handleVote(matchId: string, team: string) {
    const res = await fetch("/api/predictions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ match_id: matchId, predicted_team: team }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Vote failed");
    }

    // Optimistic update — real-time subscription will sync the rest
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !profile) return;

    setPredictions((prev) => {
      const filtered = prev.filter(
        (p) => !(p.match_id === matchId && p.user_id === user.id),
      );
      return [
        ...filtered,
        {
          match_id: matchId,
          user_id: user.id,
          predicted_team: team,
          is_correct: null,
          profiles: {
            id: user.id,
            name: profile.name,
            avatar_url: profile.avatar_url,
          },
        },
      ];
    });
  }

  async function handleUnvote(matchId: string) {
    const res = await fetch(`/api/predictions?match_id=${matchId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Unvote failed");
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setPredictions((prev) =>
      prev.filter((p) => !(p.match_id === matchId && p.user_id === user.id)),
    );
  }

  const upcomingMatches = matches.filter((m) => !m.match_ended);
  const completedMatches = matches.filter((m) => m.match_ended).reverse(); // most recent first

  const myCorrectPredictions = predictions.filter(
    (p) => p.user_id === profile?.id && p.is_correct === true,
  ).length;
  const myTotalPredictions = predictions.filter(
    (p) => p.user_id === profile?.id && p.is_correct !== null,
  ).length;
  const myTotalPoints = predictions
    .filter((p) => p.user_id === profile?.id)
    .reduce((sum, p) => sum + ((p as any).points ?? 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 border-2 border-brand-orange border-t-transparent rounded-full animate-spin"
            style={{ borderColor: "#FF6B2B33", borderTopColor: "#FF6B2B" }}
          />
          <p className="text-brand-muted text-sm">Loading your league…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="px-6 py-3 rounded-xl text-sm font-body font-medium text-white"
            style={{ background: "#FF6B2B" }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Background glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none opacity-10"
        style={{
          background:
            "radial-gradient(ellipse at top, #FF6B2B, transparent 70%)",
          zIndex: 0,
        }}
      />

      {/* Top bar */}
      <header
        className="sticky top-0 z-40 px-4 py-3 flex items-center justify-between"
        style={{
          background: "rgba(10,10,15,0.85)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">🏏</span>
          <span className="font-display font-bold text-white text-lg">
            IPL Predictor 2026
          </span>
        </div>

        {profile && (
          <ProfileMenu
            user={{
              ...profile,
              total_points: myTotalPoints,
              correct_predictions: myCorrectPredictions,
              total_predictions: myTotalPredictions,
            }}
          />
        )}
      </header>

      {/* Content */}
      <main className="relative z-10 px-4 pt-4 pb-36 max-w-lg mx-auto">
        {/* Season summary strip */}
        {matches.length > 0 && (
          <div
            className="glass rounded-2xl px-5 py-3 mb-5 flex items-center justify-between"
            style={{ border: "1px solid rgba(255,255,255,0.05)" }}
          >
            <div className="text-center">
              <div className="font-display font-bold text-white text-xl">
                {upcomingMatches.length}
              </div>
              <div className="text-xs text-brand-muted">Upcoming</div>
            </div>
            <div className="w-px h-8 bg-brand-border" />
            <div className="text-center">
              <div className="font-display font-bold text-white text-xl">
                {completedMatches.length}
              </div>
              <div className="text-xs text-brand-muted">Played</div>
            </div>
            <div className="w-px h-8 bg-brand-border" />
            <div className="text-center">
              <div
                className="font-display font-bold text-xl"
                style={{ color: "#FFD700" }}
              >
                {myTotalPoints}
              </div>
              <div className="text-xs text-brand-muted">Your pts</div>
            </div>
          </div>
        )}

        {/* Tab content */}
        {tab === "matches" && (
          <div className="space-y-3 animate-in">
            <SeasonPredictionBanner />
            {upcomingMatches.length === 0 ? (
              <EmptyState
                icon="📅"
                title="No upcoming matches"
                subtitle="Check back when the next IPL match is scheduled."
              />
            ) : (
              upcomingMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  currentUserId={profile?.id || ""}
                  userPrediction={
                    predictions.find(
                      (p) =>
                        p.match_id === match.id && p.user_id === profile?.id,
                    )?.predicted_team || null
                  }
                  allPredictions={predictions.filter(
                    (p) => p.match_id === match.id,
                  )}
                  onVote={handleVote}
                  onUnvote={handleUnvote}
                />
              ))
            )}
          </div>
        )}

        {tab === "results" && (
          <div className="space-y-3 animate-in">
            {completedMatches.length === 0 ? (
              <EmptyState
                icon="🏏"
                title="No results yet"
                subtitle="Completed matches will appear here with the full vote breakdown."
              />
            ) : (
              completedMatches.map((match) => (
                <ResultCard
                  key={match.id}
                  match={match}
                  currentUserId={profile?.id || ""}
                  allPredictions={predictions.filter(
                    (p) => p.match_id === match.id,
                  )}
                />
              ))
            )}
          </div>
        )}

        {tab === "leaderboard" && (
          <div className="animate-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-white text-lg">
                Standings
              </h2>
              <span className="text-xs text-brand-muted">
                {leaderboard.length} players
              </span>
            </div>
            <Leaderboard
              entries={leaderboard}
              currentUserId={profile?.id || ""}
            />
          </div>
        )}
      </main>

      {/* Floating nav */}
      <FloatingNav activeTab={tab} onTabChange={setTab} />
    </div>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="font-display font-semibold text-white mb-2">{title}</h3>
      <p className="text-brand-muted text-sm max-w-xs">{subtitle}</p>
    </div>
  );
}
