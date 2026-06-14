/**
 * Transform raw ESPN event data into typed internal tournament models.
 *
 * Every function in this module is pure: no network I/O, no side effects.
 * Input types are the raw validated ESPN shapes from espn-schema.ts.
 * Output types are the internal DTOs from ../worldcup-types.ts.
 */

import type { Match, MatchSide, RoundSlug, TeamLite } from "../worldcup-types";
import type { RawEspnCompetitor, RawEspnEvent, RawEspnTeam } from "./espn-schema";

// ---------------------------------------------------------------------------
// Team
// ---------------------------------------------------------------------------

export function toTeam(c: RawEspnCompetitor): TeamLite {
  const t: RawEspnTeam = c.team ?? {};
  const isPlaceholder = !t.isActive || !t.logo;

  return {
    id: String(t.id ?? "?"),
    name: t.displayName ?? t.name ?? "TBD",
    abbreviation: t.abbreviation ?? "TBD",
    logo: t.logo ?? "",
    color: t.color ? `#${t.color}` : "#1a1a1a",
    placeholder: isPlaceholder ? (t.displayName ?? "TBD") : undefined,
  };
}

// ---------------------------------------------------------------------------
// Match
// ---------------------------------------------------------------------------

const VALID_ROUNDS: ReadonlySet<string> = new Set<RoundSlug>([
  "group-stage",
  "round-of-32",
  "round-of-16",
  "quarterfinals",
  "semifinals",
  "3rd-place-match",
  "final",
]);

function normalizeRound(slug: string | undefined): RoundSlug {
  const candidate = slug ?? "group-stage";
  return VALID_ROUNDS.has(candidate) ? (candidate as RoundSlug) : "group-stage";
}

function normalizeStatus(state: string | undefined): "pre" | "in" | "post" {
  if (state === "in" || state === "post") return state;
  return "pre";
}

function toSide(c: RawEspnCompetitor): MatchSide {
  return {
    team: toTeam(c),
    score: c.score != null && c.score !== "" ? Number(c.score) : null,
    winner: Boolean(c.winner),
  };
}

export function parseGroupFromNote(note: string | undefined): string | null {
  if (!note) return null;
  const m = note.match(/Group\s+([A-L])/i);
  return m ? m[1].toUpperCase() : null;
}

/**
 * Convert one raw ESPN event to a Match, or null when the event lacks
 * required competitors.
 */
export function toMatch(ev: RawEspnEvent): Match | null {
  const comp = ev.competitions?.[0];
  if (!comp) return null;

  const competitors: RawEspnCompetitor[] = comp.competitors ?? [];
  const home = competitors.find((c) => c.homeAway === "home") ?? competitors[0];
  const away = competitors.find((c) => c.homeAway === "away") ?? competitors[1];

  if (!home || !away) return null;

  const round = normalizeRound(ev.season?.slug);
  const status = normalizeStatus(comp.status?.type?.state);
  const statusDetail = comp.status?.type?.shortDetail ?? comp.status?.type?.description ?? "";

  return {
    id: String(ev.id ?? "?"),
    date: ev.date ?? new Date().toISOString(),
    round,
    group: parseGroupFromNote(comp.altGameNote),
    status,
    statusDetail,
    venue: comp.venue?.fullName ?? null,
    home: toSide(home),
    away: toSide(away),
    shortName: ev.shortName ?? "",
  };
}

/**
 * Convert an array of raw ESPN events to deduplicated, date-sorted Matches.
 */
export function toMatches(events: RawEspnEvent[]): Match[] {
  const seen = new Map<string, Match>();

  for (const ev of events) {
    const m = toMatch(ev);
    if (m) seen.set(m.id, m);
  }

  return [...seen.values()].sort((a, b) => a.date.localeCompare(b.date));
}
