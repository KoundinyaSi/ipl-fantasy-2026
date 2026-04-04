// ============================================================
// Fantasy scoring engine
// Takes parsed scorecard data and returns points per player
// ============================================================

export interface BattingEntry {
  batsman: { id: string; name: string };
  dismissal?: string;
  "dismissal-text": string;
  r: number;
  b: number;
  "4s": number;
  "6s": number;
  sr: number;
}

export interface BowlingEntry {
  bowler: { id: string; name: string };
  o: number;
  m: number;
  r: number;
  w: number;
  eco: number;
}

export interface CatchingEntry {
  catcher?: { id: string; name: string };
  catch: number;
  stumped: number;
  runout: number;
}

export interface PlayerFantasyScore {
  playerId: string;
  playerName: string;
  battingPoints: number;
  bowlingPoints: number;
  fieldingPoints: number;
  totalPoints: number;
  breakdown: string[];
}

export function calculatePlayerScores(
  innings: Array<{
    batting: BattingEntry[];
    bowling: BowlingEntry[];
    catching: CatchingEntry[];
  }>,
): Map<string, PlayerFantasyScore> {
  const scores = new Map<string, PlayerFantasyScore>();

  function getOrCreate(id: string, name: string): PlayerFantasyScore {
    if (!scores.has(id)) {
      scores.set(id, {
        playerId: id,
        playerName: name,
        battingPoints: 0,
        bowlingPoints: 0,
        fieldingPoints: 0,
        totalPoints: 0,
        breakdown: [],
      });
    }
    return scores.get(id)!;
  }

  for (const inning of innings) {
    // --- BATTING ---
    for (const b of inning.batting ?? []) {
      const s = getOrCreate(b.batsman.id, b.batsman.name);
      let pts = 0;
      const lines: string[] = [];

      pts += b.r;
      if (b.r > 0) lines.push(`${b.r} runs (+${b.r})`);

      const fours = b["4s"] ?? 0;
      const sixes = b["6s"] ?? 0;
      if (fours > 0) {
        pts += fours;
        lines.push(`${fours}x4 (+${fours})`);
      }
      if (sixes > 0) {
        pts += sixes * 2;
        lines.push(`${sixes}x6 (+${sixes * 2})`);
      }

      if (b.r >= 100) {
        pts += 16;
        lines.push("century (+16)");
      } else if (b.r >= 50) {
        pts += 8;
        lines.push("fifty (+8)");
      }

      // Duck: dismissed for 0
      if (b.r === 0 && b.dismissal && b.dismissal !== "not out") {
        pts -= 2;
        lines.push("duck (-2)");
      }

      s.battingPoints += pts;
      s.breakdown.push(...lines);
      s.totalPoints += pts;
    }

    // --- BOWLING ---
    for (const b of inning.bowling ?? []) {
      const s = getOrCreate(b.bowler.id, b.bowler.name);
      let pts = 0;
      const lines: string[] = [];

      const wickets = b.w ?? 0;
      if (wickets > 0) {
        pts += wickets * 20;
        lines.push(
          `${wickets} wkt${wickets > 1 ? "s" : ""} (+${wickets * 20})`,
        );
      }
      if (wickets >= 5) {
        pts += 8;
        lines.push("5-wkt haul (+8)");
      } else if (wickets >= 3) {
        pts += 4;
        lines.push("3-wkt haul (+4)");
      }

      const maidens = b.m ?? 0;
      if (maidens > 0) {
        pts += maidens * 4;
        lines.push(`${maidens} maiden (+${maidens * 4})`);
      }

      s.bowlingPoints += pts;
      s.breakdown.push(...lines);
      s.totalPoints += pts;
    }

    // --- FIELDING ---
    for (const c of inning.catching ?? []) {
      if (!c.catcher) continue;
      const s = getOrCreate(c.catcher.id, c.catcher.name);
      let pts = 0;
      const lines: string[] = [];

      if (c.catch > 0) {
        pts += c.catch * 6;
        lines.push(`${c.catch} catch (+${c.catch * 6})`);
      }
      if (c.stumped > 0) {
        pts += c.stumped * 8;
        lines.push(`${c.stumped} stumping (+${c.stumped * 8})`);
      }
      if (c.runout > 0) {
        pts += c.runout * 4;
        lines.push(`${c.runout} run-out (+${c.runout * 4})`);
      }

      s.fieldingPoints += pts;
      s.breakdown.push(...lines);
      s.totalPoints += pts;
    }
  }

  return scores;
}

/** Apply captain (2x) and vice captain (1.5x) multipliers */
export function applyMultipliers(
  basePoints: number,
  isCaptain: boolean,
  isViceCaptain: boolean,
): number {
  if (isCaptain) return Math.round(basePoints * 2);
  if (isViceCaptain) return Math.round(basePoints * 1.5);
  return basePoints;
}
