/**
 * Build the Forecast vs. Reality retrospective from the frozen archives.
 *
 * Pure logic, no I/O — scripts/build-retrospective.ts reads the frozen
 * files and writes the result; tests exercise this module directly.
 *
 * Every finding is something a fan can say out loud: when the crowd
 * believed, who it favored before each round, how sure it was before the
 * final, and which single days moved the read the most.
 */

import type { Match, WorldCupSnapshot } from "./worldcup-types";
import type { ForecastSnapshot } from "./forecast-types";
import type {
  ChampionArcPoint,
  CrowdReadEntry,
  DaySwing,
  FinalRead,
  ForecastHistory,
  MatchNote,
  RaceTeam,
  Retrospective,
  RoundEveRead,
  RoundMarker,
  TeamHistory,
} from "./retrospective-types";
import { utcDateKey } from "./date-format";

const KNOCKOUT_ROUND_LABELS: Record<string, string> = {
  "round-of-32": "Round of 32",
  "round-of-16": "Round of 16",
  quarterfinals: "Quarterfinals",
  semifinals: "Semifinals",
  final: "Final",
};

const TOP_SWINGS = 10;
const TOP_RESOLUTION_MOVERS = 5;
const TOP_EVE_READS = 3;
const EARLY_FAVORITES = 5;
const UNPRICED_RUNS = 2;

/** Latest crowd probability on or before `date` (YYYY-MM-DD), else null. */
export function probabilityOn(
  points: { date: string; probability: number }[],
  date: string,
): number | null {
  let found: number | null = null;
  for (const point of points) {
    if (point.date > date) break;
    found = point.probability;
  }
  return found;
}

function dayBefore(date: string): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function formatScore(match: Match): string {
  return `${match.home.score ?? "–"}\u2013${match.away.score ?? "–"}`;
}

/** The match `team` played on `date`, as a note from that team's side. */
function matchNoteFor(matches: Match[], team: string, date: string): MatchNote | null {
  const match = matches.find(
    (m) => utcDateKey(m.date) === date && (m.home.team.name === team || m.away.team.name === team),
  );
  if (!match) return null;

  const isHome = match.home.team.name === team;
  const side = isHome ? match.home : match.away;
  const opponent = isHome ? match.away.team.name : match.home.team.name;
  const drawn = match.home.score !== null && match.home.score === match.away.score;

  return {
    opponent,
    result: side.winner ? "W" : drawn ? "D" : "L",
    score: formatScore(match),
  };
}

function formatFinalResult(final: Match): string {
  const base = `${final.home.team.name} ${formatScore(final)} ${final.away.team.name}`;
  const detail = final.statusDetail.trim();
  return detail && detail !== "FT" ? `${base} (${detail})` : base;
}

function championArc(champion: string, history: TeamHistory | undefined, matches: Match[]) {
  const arc: ChampionArcPoint[] = [];
  if (!history) return arc;
  for (const point of history.points) {
    arc.push({
      date: point.date,
      probability: point.probability,
      match: matchNoteFor(matches, champion, point.date),
    });
  }
  return arc;
}

function roundEveReads(
  worldcup: WorldCupSnapshot,
  history: ForecastHistory,
  champion: string,
): RoundEveRead[] {
  const reads: RoundEveRead[] = [];

  for (const [round, label] of Object.entries(KNOCKOUT_ROUND_LABELS)) {
    const matches = worldcup.rounds[round as keyof typeof worldcup.rounds] ?? [];
    if (matches.length === 0) continue;

    const roundStart = matches.map((m) => utcDateKey(m.date)).sort()[0];
    const eve = dayBefore(roundStart);
    const aliveCount = new Set(matches.flatMap((m) => [m.home.team.name, m.away.team.name])).size;

    // Rank every team's eve read; keep the crowd's top 3.
    const ranked = history.teams.flatMap((team) => {
      const p = probabilityOn(team.points, eve);
      return p === null ? [] : [{ team: team.team, probability: p }];
    });
    ranked.sort((a, b) => b.probability - a.probability);

    const championIndex = ranked.findIndex((r) => r.team === champion);

    reads.push({
      round,
      label,
      eveDate: eve,
      aliveCount,
      top: ranked.slice(0, TOP_EVE_READS),
      favorite: ranked[0] ?? null,
      championProbability: championIndex >= 0 ? ranked[championIndex].probability : null,
      championRank: championIndex >= 0 ? championIndex + 1 : null,
    });
  }

  return reads;
}

function finalRead(final: Match, history: ForecastHistory): FinalRead {
  const eve = dayBefore(utcDateKey(final.date));
  const prob = (team: string) => {
    const series = history.teams.find((t) => t.team === team);
    return series ? probabilityOn(series.points, eve) : null;
  };

  return {
    kickoffDate: utcDateKey(final.date),
    home: { team: final.home.team.name, probability: prob(final.home.team.name) },
    away: { team: final.away.team.name, probability: prob(final.away.team.name) },
    result: formatFinalResult(final),
  };
}

/** Where a team's tournament ended, as a fan-facing phrase. */
export function fateOf(matches: Match[], team: string): string {
  const played = matches
    .filter((m) => m.home.team.name === team || m.away.team.name === team)
    .sort((a, b) => a.date.localeCompare(b.date));
  const last = played.at(-1);
  if (!last) return "\u2014";

  switch (last.round) {
    case "final": {
      const won = last.home.team.name === team ? last.home.winner : last.away.winner;
      return won ? "won the Cup" : "lost the final";
    }
    case "semifinals":
    case "3rd-place-match":
      return "out in the semifinals";
    case "quarterfinals":
      return "out in the quarterfinals";
    case "round-of-16":
      return "out in the Round of 16";
    case "round-of-32":
      return "out in the Round of 32";
    default:
      return "out in the group stage";
  }
}

/** The quarterfinalists' daily reads, ending as each market resolved. */
function race(worldcup: WorldCupSnapshot, history: ForecastHistory, champion: string) {
  const quarterfinalists = [
    ...new Set(
      worldcup.rounds["quarterfinals"].flatMap((m) => [m.home.team.name, m.away.team.name]),
    ),
  ];

  const teams: RaceTeam[] = quarterfinalists.flatMap((team) => {
    const series = history.teams.find((t) => t.team === team);
    return series ? [{ team, isChampion: team === champion, points: series.points }] : [];
  });

  const roundMarkers: RoundMarker[] = Object.entries(KNOCKOUT_ROUND_LABELS).flatMap(
    ([round, label]) => {
      const matches = worldcup.rounds[round as keyof typeof worldcup.rounds] ?? [];
      if (matches.length === 0) return [];
      return [{ date: matches.map((m) => utcDateKey(m.date)).sort()[0], label }];
    },
  );

  return { teams, roundMarkers };
}

/** Jun-1 reads vs. fates: who the crowd overpaid for, and who it missed. */
function crowdReads(
  worldcup: WorldCupSnapshot,
  history: ForecastHistory,
): Retrospective["crowdReads"] {
  const startDate = history.windowStart.slice(0, 10);
  const preReads = history.teams.flatMap((team) => {
    const p = probabilityOn(team.points, startDate);
    return p === null ? [] : [{ team: team.team, probability: p }];
  });
  preReads.sort((a, b) => b.probability - a.probability);

  const fate = (team: string) => fateOf(worldcup.matches, team);

  const earlyFavorites: CrowdReadEntry[] = preReads
    .slice(0, EARLY_FAVORITES)
    .map((r) => ({ ...r, fate: fate(r.team) }));

  const semifinalists = [
    ...new Set(worldcup.rounds["semifinals"].flatMap((m) => [m.home.team.name, m.away.team.name])),
  ];
  const unpricedRuns: CrowdReadEntry[] = semifinalists
    .flatMap((team) => {
      const pre = preReads.find((r) => r.team === team);
      return pre ? [{ ...pre, fate: fate(team) }] : [];
    })
    .sort((a, b) => a.probability - b.probability)
    .slice(0, UNPRICED_RUNS);

  return { earlyFavorites, unpricedRuns };
}

function biggestSwings(history: ForecastHistory, matches: Match[]): DaySwing[] {
  const swings: DaySwing[] = [];

  for (const team of history.teams) {
    for (let i = 1; i < team.points.length; i++) {
      const prev = team.points[i - 1];
      const curr = team.points[i];
      swings.push({
        team: team.team,
        date: curr.date,
        from: prev.probability,
        to: curr.probability,
        delta: curr.probability - prev.probability,
        // Daily points are midnight-UTC snapshots, so the move between two
        // points was caused by a match played the day BEFORE it registers.
        // Same-day is kept as a harmless fallback.
        match:
          matchNoteFor(matches, team.team, curr.date) ??
          matchNoteFor(matches, team.team, dayBefore(curr.date)),
      });
    }
  }

  return swings.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, TOP_SWINGS);
}

export function buildRetrospective(input: {
  worldcup: WorldCupSnapshot;
  forecast: ForecastSnapshot;
  history: ForecastHistory;
  historyCapturedAt: string;
}): Retrospective {
  const { worldcup, forecast, history } = input;

  const final = worldcup.rounds["final"][0];
  if (!final) throw new Error("No final match in the frozen worldcup snapshot");

  const champion = final.home.winner ? final.home.team.name : final.away.team.name;
  const championSeries = history.teams.find((t) => t.team === champion);

  return {
    champion,
    finalResult: formatFinalResult(final),
    championArc: championArc(champion, championSeries, worldcup.matches),
    race: race(worldcup, history, champion),
    roundEveReads: roundEveReads(worldcup, history, champion),
    crowdReads: crowdReads(worldcup, history),
    finalRead: finalRead(final, history),
    biggestSwings: biggestSwings(history, worldcup.matches),
    resolutionMovers: forecast.movers
      .slice(0, TOP_RESOLUTION_MOVERS)
      .map((m) => ({ team: m.team, movement24h: m.movement24h, probability: m.probability })),
    source: {
      historyCapturedAt: input.historyCapturedAt,
      teamsWithHistory: history.teams.length,
      matchesAnalyzed: worldcup.matches.length,
    },
  };
}
