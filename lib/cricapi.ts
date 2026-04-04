const CRICAPI_BASE = "https://api.cricapi.com/v1";
const API_KEY = process.env.CRICAPI_KEY!;
const IPL_SERIES_ID = process.env.IPL_SERIES_ID;

export interface CricAPIMatch {
  id: string;
  name: string;
  matchType: string;
  status: string;
  venue: string;
  date: string;
  dateTimeGMT: string;
  teams: string[];
  teamInfo?: Array<{ name: string; shortname: string; img: string }>;
  score?: Array<{ r: number; w: number; o: number; inning: string }>;
  series_id?: string;
  matchStarted: boolean;
  matchEnded: boolean;
}

export interface ProcessedMatch {
  id: string;
  name: string;
  team1: string;
  team2: string;
  venue: string;
  match_date: string;
  status: string;
  winner: string | null;
  match_started: boolean;
  match_ended: boolean;
  raw_data: CricAPIMatch;
}

/** Fetch current/upcoming IPL matches from CricAPI */
export async function fetchIPLMatches(): Promise<ProcessedMatch[]> {
  const params = new URLSearchParams({
    apikey: API_KEY,
    offset: "0",
  });

  // Use series endpoint if we have a series ID, otherwise currentMatches
  const endpoint = IPL_SERIES_ID
    ? `${CRICAPI_BASE}/series_info?apikey=${API_KEY}&id=${IPL_SERIES_ID}`
    : `${CRICAPI_BASE}/currentMatches?${params}`;

  const res = await fetch(endpoint, { next: { revalidate: 300 } });

  if (!res.ok) {
    throw new Error(`CricAPI error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  let matches: CricAPIMatch[] = [];

  if (IPL_SERIES_ID && data.data?.matchList) {
    matches = data.data.matchList;
  } else if (data.data) {
    matches = data.data;
  }

  // Filter to only IPL T20 matches
  const iplMatches = matches.filter((m) => {
    const isIPL =
      m.name?.toLowerCase().includes("ipl") ||
      m.name?.toLowerCase().includes("indian premier league") ||
      m.series_id === IPL_SERIES_ID;
    const isT20 = m.matchType === "t20";
    return isIPL && isT20;
  });

  return iplMatches.map(processMatch);
}

/** Parse a CricAPI match object into our internal format */
function processMatch(m: CricAPIMatch): ProcessedMatch {
  const teams = m.teams || [];
  const team1 = teams[0] || "TBD";
  const team2 = teams[1] || "TBD";
  const winner = extractWinner(m.status, teams);

  // CricAPI's matchEnded flag is unreliable — it often stays false even after a match
  // finishes. Fall back to parsing the status string for known completion phrases.
  const statusLower = (m.status || "").toLowerCase();
  const isFinishedByStatus =
    statusLower.includes("won") ||
    statusLower.includes("no result") ||
    statusLower.includes("match drawn") ||
    statusLower.includes("tied");
  const matchEnded = m.matchEnded || isFinishedByStatus;

  return {
    id: m.id,
    name: m.name,
    team1,
    team2,
    venue: m.venue || "",
    match_date: m.dateTimeGMT || m.date,
    status: m.status || "",
    winner,
    match_started: m.matchStarted || matchEnded, // if ended, it obviously started
    match_ended: matchEnded,
    raw_data: m,
  };
}

/**
 * Try to parse the winning team name from the status string.
 * CricAPI status looks like: "Mumbai Indians won by 5 wickets"
 */
function extractWinner(status: string, teams: string[]): string | null {
  if (!status || !teams.length) return null;

  const statusLower = status.toLowerCase();
  if (!statusLower.includes("won")) return null;

  // Try to find which team name appears before "won"
  for (const team of teams) {
    if (statusLower.includes(team.toLowerCase())) {
      return team;
    }
  }

  // Fallback: some statuses use short forms — try abbreviation matching
  return null;
}

/** Fetch a specific match's current state (for live score updates) */
export async function fetchMatchInfo(
  matchId: string,
): Promise<ProcessedMatch | null> {
  const res = await fetch(
    `${CRICAPI_BASE}/match_info?apikey=${API_KEY}&id=${matchId}`,
    { next: { revalidate: 60 } },
  );

  if (!res.ok) return null;

  const data = await res.json();
  if (!data.data) return null;

  return processMatch(data.data as CricAPIMatch);
}

/** Fetch combined squad for a match from CricAPI */
export async function fetchMatchSquad(matchId: string): Promise<
  Array<{
    teamName: string;
    players: Array<{
      id: string;
      name: string;
      role: string;
      country: string;
      playerImg: string;
    }>;
  }>
> {
  const res = await fetch(
    `${CRICAPI_BASE}/match_squad?apikey=${API_KEY}&id=${matchId}`,
    { next: { revalidate: 0 } },
  );
  if (!res.ok) throw new Error(`CricAPI squad error: ${res.status}`);
  const data = await res.json();
  if (!data.data) return [];
  return data.data;
}

/** Fetch scorecard for a completed match */
export async function fetchMatchScorecard(matchId: string): Promise<{
  innings: Array<{
    inning: string;
    batting: object[];
    bowling: object[];
    catching: object[];
  }>;
  matchWinner: string | null;
} | null> {
  const res = await fetch(
    `${CRICAPI_BASE}/match_scorecard?apikey=${API_KEY}&id=${matchId}`,
    { next: { revalidate: 0 } },
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.data?.scorecard) return null;

  const statusLower = (data.data.status || "").toLowerCase();
  const isFinished =
    data.data.matchEnded ||
    statusLower.includes("won") ||
    statusLower.includes("no result") ||
    statusLower.includes("tied");

  if (!isFinished) return null;

  return {
    innings: data.data.scorecard,
    matchWinner: data.data.matchWinner || null,
  };
}
