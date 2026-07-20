/**
 * Forecast vs. Reality — the retrospective tab (Step 2, Phase 3).
 *
 * Renders the precomputed retrospective artifact statically. No queries,
 * no fetches: the analysis was built offline from the frozen archives and
 * is validated by tests/frozen/frozen-retrospective.test.ts.
 */

import type { Retrospective } from "@/lib/retrospective-types";
import retrospectiveJson from "@/data/frozen/retrospective.json";
import { cn } from "@/lib/utils";

// Cast backed by tests/frozen/frozen-retrospective.test.ts.
const retro = retrospectiveJson as Retrospective;

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

      <ChampionArc />
      <RoundReads />
      <FinalReadCard />
      <Swings />

      <footer className="text-xs text-ink-soft space-y-1">
        <p>
          Crowd read: Polymarket tournament-winner market, daily, {formatDate("2026-06-01")} –{" "}
          {formatDate("2026-07-20")} · Results: ESPN. Daily prices are midnight-UTC snapshots, so a
          result lands in the read the day after it is played.
        </p>
      </footer>
    </div>
  );
}

function ChampionArc() {
  const points = retro.championArc;
  return (
    <section className="rounded-xl border border-border bg-card px-4 py-5">
      <p className="text-[11px] uppercase tracking-wider text-terracotta font-semibold">
        The champion&apos;s arc
      </p>
      <h3 className="mt-1 font-display text-xl font-semibold">
        {retro.champion}, day by day — dots are match days
      </h3>
      <div
        className="mt-4 flex h-28 items-end gap-px"
        role="img"
        aria-label={`Daily crowd probability for ${retro.champion}, rising to champion`}
      >
        {points.map((p) => (
          <div
            key={p.date}
            title={`${formatDate(p.date)} · ${pct(p.probability)}${
              p.match ? ` · ${p.match.result} ${p.match.score} vs ${p.match.opponent}` : ""
            }`}
            className="relative flex-1 rounded-t-sm bg-ink/20"
            style={{ height: `${Math.max(2, p.probability * 100)}%` }}
          >
            {p.match && (
              <span
                className={cn(
                  "absolute -top-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full",
                  p.match.result === "W" ? "bg-terracotta" : "bg-ink",
                )}
              />
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-ink-soft">
        <span>
          {formatDate(points[0].date)} · {pct(points[0].probability)}
        </span>
        <span>
          {formatDate(points[points.length - 1].date)} ·{" "}
          {pct(points[points.length - 1].probability)}
        </span>
      </div>
    </section>
  );
}

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
              className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
            >
              <div className="min-w-32">
                <p className="font-medium">{read.label}</p>
                <p className="text-xs text-ink-soft">eve · {formatDate(read.eveDate)}</p>
              </div>
              <p className="flex-1">
                Crowd:{" "}
                <span className="font-medium">
                  {read.favorite ? `${read.favorite.team} ${pct(read.favorite.probability)}` : "–"}
                </span>
              </p>
              <p>
                {retro.champion}:{" "}
                <span className="font-medium">{pct(read.championProbability)}</span>
              </p>
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
            </li>
          );
        })}
      </ul>
    </section>
  );
}

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
        {retro.biggestSwings.slice(0, 6).map((swing) => (
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
