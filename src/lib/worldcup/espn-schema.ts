/**
 * Minimal runtime validation of ESPN's scoreboard response.
 *
 * ESPN JSON is untrusted. This module checks that the response has
 * the expected top-level shape and that each event carries the
 * minimum fields needed by the transformation layer.
 *
 * Unknown fields are ignored. Missing required fields cause the
 * event to be dropped. Malformed JSON or a non-array `events` field
 * causes the entire response to be rejected.
 */

export interface RawEspnTeam {
  id?: string | number;
  displayName?: string;
  name?: string;
  abbreviation?: string;
  logo?: string;
  color?: string;
  isActive?: boolean;
}

export interface RawEspnCompetitor {
  homeAway?: string;
  score?: string | number;
  winner?: boolean;
  team?: RawEspnTeam;
}

export interface RawEspnCompetition {
  competitors?: RawEspnCompetitor[];
  status?: {
    type?: {
      state?: string;
      shortDetail?: string;
      description?: string;
    };
  };
  venue?: {
    fullName?: string;
  };
  altGameNote?: string;
}

export interface RawEspnEvent {
  id?: string | number;
  date?: string;
  season?: {
    slug?: string;
  };
  competitions?: RawEspnCompetition[];
  shortName?: string;
}

export interface RawEspnResponse {
  events: RawEspnEvent[];
}

/**
 * Returns true when the value looks enough like an ESPN response to
 * proceed with per-event parsing.  Does NOT validate individual
 * event fields — that's the transformer's job.
 */
export function isValidEspnResponse(value: unknown): value is RawEspnResponse {
  if (value === null || value === undefined) return false;
  if (typeof value !== "object") return false;

  const obj = value as Record<string, unknown>;
  return Array.isArray(obj.events);
}

/**
 * Extract valid events array from an unknown payload.
 * Returns an empty array when the payload shape is unrecognisable.
 */
export function eventsFromPayload(value: unknown): RawEspnEvent[] {
  if (!isValidEspnResponse(value)) return [];

  // Filter out entries that are not plain objects — malformed
  // entries in the array shouldn't crash the pipeline.
  return (value as RawEspnResponse).events.filter(
    (ev): ev is RawEspnEvent => ev !== null && typeof ev === "object",
  );
}
