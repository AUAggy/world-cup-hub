/**
 * Forecast vs. Reality — the retrospective tab (Step 2, Phase 3).
 *
 * Renders the precomputed retrospective artifact statically. No queries,
 * no fetches: the analysis was built offline from the frozen archives and
 * is validated by tests/frozen/frozen-retrospective.test.ts.
 *
 * Chart philosophy (Feynman lens): a picture must answer a question
 * plainly. Every axis is labeled; no decorative geometry.
 */

import type { Retrospective } from "@/lib/retrospective-types";
import retrospectiveJson from "@/data/frozen/retrospective.json";
import { cn } from "@/lib/utils";

// Cast backed by tests/frozen/frozen-retrospective.test.ts.
const retro = retrospectiveJson as Retrospective;

// Theme colors as CSS vars (Tailwind v4 exposes theme colors this way).
const TERRACOTTA = "var(--color-terracotta)";
const INK_SOFT = "var(--color-ink-soft)";
const BORDER = "var(--color-border)";

// Muted, distinguishable hues for the seven non-champion lines. Spain keeps
// terracotta; these stay quiet so the champion still dominates the chart.
const TEAM_PALETTE = [
  "#7c8db0", // slate blue
  "#a08c5b", // khaki
  "#6d9e8a", // sage
  "#9b7fa6", // muted purple
  "#b0786f", // dusty rose
  "#5f8fa8", // steel blue
  "#8a8f6a", // moss
];

function pct(p: number | null): string {
  return p === null ? "–" : `${Math.round(p * 100)}%`;
}

function signedPct(delta: number): string {
  const points = Math.round(delta * 100);
  return points > 0 ? `+${points} pts` : `${points} pts`;
}

function formatDate(date: string): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function RetrospectiveView() {
  return (
    <div className="space-y-7">
      <header className="border-b border-border pb-4">
        <p className="text-xs uppercase tracking-[0.2em] text-terracotta font-semibold">
          Forecast vs. Reality
        </p>
        <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight mt-1">
          What the crowd believed, and what happened
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          The daily crowd read on who would win the Cup, set against the official results.
          Educational context, not betting advice.
        </p>
      </header>

      <RaceChart />
      <RoundReads />
      <CrowdReads />
      <FinalReadCard />
      <Swings />

      <footer className="text-xs text-ink-soft space-y-1">
        <p>
          Crowd read: Polymarket tournament-winner market, daily, Jun 1 – Jul 20 · Results: ESPN.
          Daily prices are midnight-UTC snapshots, so a result lands in the read the day after it is
          played.
        </p>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The race for the Cup: every quarterfinalist's crowd read, labeled.  */
/* ------------------------------------------------------------------ */

const W = 960;
const H = 360;
const MARGIN = { left: 48, right: 96, top: 30, bottom: 30 };
const PLOT_W = W - MARGIN.left - MARGIN.right;
const PLOT_H = H - MARGIN.top - MARGIN.bottom;
const Y_TICKS = [0, 0.25, 0.5, 0.75, 1];
const SHORT_MARKER: Record<string, string> = {
  "Round of 32": "R32",
  "Round of 16": "R16",
  Quarterfinals: "QF",
  Semifinals: "SF",
  Final: "Final",
};

function ms(date: string): number {
  return Date.parse(`${date}T00:00:00.000Z`);
}

/** Line-end labels, spread vertically so none overlap (min gap, plot-bounded). */
function endLabels(
  teams: Retrospective["race"]["teams"],
  colors: Map<string, string>,
  x: (date: string) => number,
  y: (p: number) => number,
) {
  const MIN_GAP = 13;
  const labels = teams
    .map((team) => {
      const last = team.points[team.points.length - 1];
      return {
        team: team.team,
        isChampion: team.isChampion,
        color: colors.get(team.team) ?? INK_SOFT,
        endX: x(last.date),
        endY: y(last.probability),
        labelY: y(last.probability),
      };
    })
    .sort((a, b) => a.endY - b.endY);

  for (let i = 1; i < labels.length; i++) {
    if (labels[i].labelY - labels[i - 1].labelY < MIN_GAP) {
      labels[i].labelY = labels[i - 1].labelY + MIN_GAP;
    }
  }
  const bottom = MARGIN.top + PLOT_H;
  if (labels.length > 0 && labels[labels.length - 1].labelY > bottom) {
    labels[labels.length - 1].labelY = bottom;
    for (let i = labels.length - 2; i >= 0; i--) {
      if (labels[i + 1].labelY - labels[i].labelY < MIN_GAP) {
        labels[i].labelY = labels[i + 1].labelY - MIN_GAP;
      }
    }
  }
  return labels;
}

function RaceChart() {
  const allPoints = retro.race.teams.flatMap((t) => t.points);
  const start = allPoints.reduce((a, p) => (p.date < a ? p.date : a), allPoints[0].date);
  const end = allPoints.reduce((a, p) => (p.date > a ? p.date : a), allPoints[0].date);

  const x = (date: string) =>
    MARGIN.left + ((ms(date) - ms(start)) / (ms(end) - ms(start))) * PLOT_W;
  const y = (p: number) => MARGIN.top + (1 - p) * PLOT_H;

  const championMatchDays = new Set(retro.championArc.filter((p) => p.match).map((p) => p.date));
  const colors = new Map(
    retro.race.teams.map((team, i) => [
      team.team,
      team.isChampion ? TERRACOTTA : TEAM_PALETTE[i % TEAM_PALETTE.length],
    ]),
  );

  return (
    <section className="rounded-xl border border-border bg-card px-4 py-5">
      <p className="text-[11px] uppercase tracking-wider text-terracotta font-semibold">
        The race for the Cup
      </p>
      <h3 className="mt-1 font-display text-xl font-semibold">
        Eight contenders, one survivor — each line ends when the crowd wrote that team off
      </h3>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-4 h-auto w-full"
        role="img"
        aria-label={`Daily crowd probability for the eight quarterfinalists. ${retro.champion} rises to 100 percent; the other seven lines drop to zero as each team is eliminated.`}
      >
        {/* Y gridlines + labels */}
        {Y_TICKS.map((tick) => (
          <g key={tick}>
            <line
              x1={MARGIN.left}
              x2={W - MARGIN.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke={BORDER}
              strokeWidth={tick === 0 ? 1.5 : 1}
            />
            <text
              x={MARGIN.left - 8}
              y={y(tick) + 4}
              textAnchor="end"
              fontSize={11}
              fill={INK_SOFT}
            >
              {Math.round(tick * 100)}%
            </text>
          </g>
        ))}

        {/* Round markers */}
        {retro.race.roundMarkers.map((marker) => (
          <g key={marker.date}>
            <line
              x1={x(marker.date)}
              x2={x(marker.date)}
              y1={MARGIN.top}
              y2={MARGIN.top + PLOT_H}
              stroke={INK_SOFT}
              strokeWidth={1}
              strokeDasharray="3 4"
              opacity={0.5}
            />
            <text
              x={x(marker.date)}
              y={MARGIN.top - 8}
              textAnchor="middle"
              fontSize={10}
              fill={INK_SOFT}
            >
              {SHORT_MARKER[marker.label] ?? marker.label}
            </text>
          </g>
        ))}

        {/* Team lines */}
        {retro.race.teams.map((team) => {
          const d = team.points
            .map(
              (p, i) =>
                `${i === 0 ? "M" : "L"}${x(p.date).toFixed(1)},${y(p.probability).toFixed(1)}`,
            )
            .join(" ");
          return (
            <g key={team.team}>
              <path
                d={d}
                fill="none"
                stroke={colors.get(team.team)}
                strokeWidth={team.isChampion ? 2.5 : 1.25}
                opacity={team.isChampion ? 1 : 0.65}
              />
              {/* match-day dots on the champion's line */}
              {team.isChampion &&
                team.points
                  .filter((p) => championMatchDays.has(p.date))
                  .map((p) => (
                    <circle
                      key={p.date}
                      cx={x(p.date)}
                      cy={y(p.probability)}
                      r={3.5}
                      fill={TERRACOTTA}
                    >
                      <title>{`${formatDate(p.date)} · ${pct(p.probability)}`}</title>
                    </circle>
                  ))}
            </g>
          );
        })}

        {/* End labels: de-collided vertically, leader tick when displaced */}
        {endLabels(retro.race.teams, colors, x, y).map((label) => (
          <g key={label.team}>
            {Math.abs(label.labelY - label.endY) > 3 && (
              <line
                x1={label.endX + 3}
                x2={label.endX + 3}
                y1={label.endY}
                y2={label.labelY + 3}
                stroke={INK_SOFT}
                strokeWidth={1}
                opacity={0.6}
              />
            )}
            <text
              x={label.endX + 7}
              y={label.labelY + 4}
              fontSize={11}
              fontWeight={label.isChampion ? 700 : 400}
              fill={label.color}
            >
              {label.team}
            </text>
          </g>
        ))}

        {/* X-axis endpoints */}
        <text x={MARGIN.left} y={H - 8} fontSize={11} fill={INK_SOFT}>
          {formatDate(start)}
        </text>
        <text x={W - MARGIN.right} y={H - 8} textAnchor="end" fontSize={11} fill={INK_SOFT}>
          {formatDate(end)}
        </text>
      </svg>

      <p className="mt-2 text-[11px] text-ink-soft">
        R32 = Round of 32 · R16 = Round of 16 · QF = Quarterfinals · SF = Semifinals ·{" "}
        <span className="text-terracotta">●</span> {retro.champion} match days · Y: crowd
        probability of winning the Cup.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function RoundReads() {
  return (
    <section className="rounded-xl border border-border bg-card px-4 py-5">
      <p className="text-[11px] uppercase tracking-wider text-terracotta font-semibold">
        The read before each round
      </p>
      <h3 className="mt-1 font-display text-xl font-semibold">
        Who the crowd backed — and where {retro.champion} really stood
      </h3>
      <ul className="mt-4 divide-y divide-border">
        {retro.roundEveReads.map((read) => {
          const crowdHadChampion = read.favorite?.team === retro.champion;
          return (
            <li
              key={read.round}
              className="grid gap-2 py-3 text-sm sm:grid-cols-[8rem_1fr_auto] sm:items-center"
            >
              <div>
                <p className="font-medium">{read.label}</p>
                <p className="text-xs text-ink-soft">
                  eve · {formatDate(read.eveDate)} · {read.aliveCount} alive
                </p>
              </div>
              <p className="text-ink-soft">
                {read.top.map((t, i) => (
                  <span key={t.team}>
                    {i > 0 && <span className="text-ink-soft/60"> · </span>}
                    <span className={cn(i === 0 && "font-medium text-ink")}>
                      {i + 1}. {t.team} {pct(t.probability)}
                    </span>
                  </span>
                ))}
              </p>
              <div className="flex items-center gap-2 sm:justify-end">
                <span className="text-sm">
                  {retro.champion}{" "}
                  <span className="font-medium">
                    {read.championRank !== null ? `#${read.championRank}` : "–"} ·{" "}
                    {pct(read.championProbability)}
                  </span>
                </span>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                    crowdHadChampion
                      ? "bg-terracotta/15 text-terracotta"
                      : "bg-paper-deep text-ink-soft",
                  )}
                >
                  {crowdHadChampion ? "crowd had it" : "crowd looked elsewhere"}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function CrowdReads() {
  return (
    <section>
      <p className="text-[11px] uppercase tracking-wider text-terracotta font-semibold">
        Where the crowd got it wrong
      </p>
      <h3 className="mt-1 font-display text-xl font-semibold">
        The Jun 1 read, judged by what actually happened
      </h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card px-4 py-5">
          <h4 className="text-sm font-semibold">Early favorites, early exits</h4>
          <p className="mt-1 text-xs text-ink-soft">
            The crowd&apos;s top five before a ball was kicked.
          </p>
          <ul className="mt-3 divide-y divide-border text-sm">
            {retro.crowdReads.earlyFavorites.map((entry) => (
              <li key={entry.team} className="flex items-center justify-between gap-2 py-2.5">
                <span className="font-medium">{entry.team}</span>
                <span className="text-xs text-ink-soft">{pct(entry.probability)} on Jun 1</span>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                    entry.fate === "won the Cup"
                      ? "bg-terracotta/15 text-terracotta"
                      : "bg-paper-deep text-ink-soft",
                  )}
                >
                  {entry.fate}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-5">
          <h4 className="text-sm font-semibold">The runs nobody priced</h4>
          <p className="mt-1 text-xs text-ink-soft">
            The cheapest semifinalists in the Jun 1 read.
          </p>
          <ul className="mt-3 divide-y divide-border text-sm">
            {retro.crowdReads.unpricedRuns.map((entry) => (
              <li key={entry.team} className="flex items-center justify-between gap-2 py-2.5">
                <span className="font-medium">{entry.team}</span>
                <span className="text-xs text-ink-soft">{pct(entry.probability)} on Jun 1</span>
                <span className="rounded-full bg-paper-deep px-2.5 py-0.5 text-[11px] font-semibold text-ink-soft">
                  {entry.fate}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-soft">
            {retro.champion} was never the crowd&apos;s top pick until the eve of the final itself.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function FinalReadCard() {
  const { home, away, result, kickoffDate } = retro.finalRead;
  const rows = [home, away].sort((a, b) => (b.probability ?? 0) - (a.probability ?? 0));
  return (
    <section className="rounded-xl border border-border bg-card px-4 py-5">
      <p className="text-[11px] uppercase tracking-wider text-terracotta font-semibold">
        The Final · {formatDate(kickoffDate)}
      </p>
      <h3 className="mt-1 font-display text-xl font-semibold">{result}</h3>
      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <div key={row.team}>
            <div className="flex justify-between text-sm">
              <span className="font-medium">{row.team}</span>
              <span className="text-ink-soft">{pct(row.probability)}</span>
            </div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-paper-deep">
              <div
                className={cn(
                  "h-full rounded-full",
                  row.team === retro.champion ? "bg-terracotta" : "bg-ink/30",
                )}
                style={{ width: `${(row.probability ?? 0) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-ink-soft">Crowd read on the eve of the final.</p>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function Swings() {
  return (
    <section className="rounded-xl border border-border bg-card px-4 py-5">
      <p className="text-[11px] uppercase tracking-wider text-terracotta font-semibold">
        What changed
      </p>
      <h3 className="mt-1 font-display text-xl font-semibold">
        The biggest single-day moves, and the results behind them
      </h3>
      <ul className="mt-4 divide-y divide-border">
        {retro.biggestSwings.slice(0, 8).map((swing) => (
          <li
            key={`${swing.team}-${swing.date}`}
            className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
          >
            <div>
              <p className="font-medium">{swing.team}</p>
              <p className="text-xs text-ink-soft">
                {formatDate(swing.date)}
                {swing.match
                  ? ` · ${swing.match.result} ${swing.match.score} vs ${swing.match.opponent}`
                  : ""}
              </p>
            </div>
            <p className="text-xs text-ink-soft">
              {pct(swing.from)} → {pct(swing.to)}
            </p>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                swing.delta > 0
                  ? "bg-terracotta/15 text-terracotta"
                  : "bg-paper-deep text-ink-soft",
              )}
            >
              {signedPct(swing.delta)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
