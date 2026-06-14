/**
 * Compute group standings from a list of matches.
 *
 * Pure: no I/O, no side effects.  Input is the already-parsed Match array.
 * Only group-stage matches with a known group and confirmed scores are
 * counted.
 */

import type { Match, GroupTable, StandingRow } from "../worldcup-types";

/**
 * Tie-breaking order per FIFA regulations:
 *   1. Points (desc)
 *   2. Goal difference (desc)
 *   3. Goals for (desc)
 *   4. Team name (asc — deterministic tie-break)
 */
function sortRows(rows: StandingRow[]): StandingRow[] {
  return [...rows].sort(
    (a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.name.localeCompare(b.team.name),
  );
}

export function computeGroups(matches: Match[]): GroupTable[] {
  const groupMap = new Map<string, Map<string, StandingRow>>();

  for (const m of matches) {
    if (m.round !== "group-stage" || !m.group) continue;

    const g = groupMap.get(m.group) ?? new Map<string, StandingRow>();
    groupMap.set(m.group, g);

    // Ensure every team with a known ID is present in the standings,
    // even before they have played a match.
    for (const side of [m.home, m.away]) {
      if (!g.has(side.team.id) && side.team.id !== "?") {
        g.set(side.team.id, {
          team: side.team,
          mp: 0,
          w: 0,
          d: 0,
          l: 0,
          gf: 0,
          ga: 0,
          gd: 0,
          pts: 0,
        });
      }
    }

    // Only count completed matches with numeric scores.
    if (m.status !== "post" || m.home.score == null || m.away.score == null) continue;

    const hRow = g.get(m.home.team.id);
    const aRow = g.get(m.away.team.id);
    if (!hRow || !aRow) continue;

    hRow.mp += 1;
    aRow.mp += 1;
    hRow.gf += m.home.score;
    hRow.ga += m.away.score;
    aRow.gf += m.away.score;
    aRow.ga += m.home.score;

    if (m.home.score > m.away.score) {
      hRow.w += 1;
      hRow.pts += 3;
      aRow.l += 1;
    } else if (m.home.score < m.away.score) {
      aRow.w += 1;
      aRow.pts += 3;
      hRow.l += 1;
    } else {
      hRow.d += 1;
      aRow.d += 1;
      hRow.pts += 1;
      aRow.pts += 1;
    }

    hRow.gd = hRow.gf - hRow.ga;
    aRow.gd = aRow.gf - aRow.ga;
  }

  const groups: GroupTable[] = [];
  for (const [letter, rows] of groupMap) {
    groups.push({
      group: letter,
      rows: sortRows([...rows.values()]),
    });
  }

  groups.sort((a, b) => a.group.localeCompare(b.group));

  return groups;
}
