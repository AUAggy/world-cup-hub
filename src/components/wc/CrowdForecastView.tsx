import { useMemo, useState } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import type { ForecastSnapshot, TeamForecast, TeamMatchSignal } from "@/lib/forecast-types";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  query: UseQueryResult<ForecastSnapshot, Error>;
}

export function CrowdForecastView({ query }: Props) {
  if (query.isPending) return <ForecastLoading />;

  if (query.isError && !query.data) {
    return (
      <section className="rounded-xl border border-border bg-card px-4 py-5">
        <p className="text-[11px] uppercase tracking-wider text-terracotta font-semibold">
          Crowd Forecast
        </p>
        <h2 className="mt-1 font-display text-xl font-semibold">Forecast unavailable</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Public market sources did not respond. Bracket, groups, and matches are unaffected.
        </p>
        <button
          type="button"
          onClick={() => query.refetch()}
          className="mt-4 rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-ink/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Try again
        </button>
      </section>
    );
  }

  const data = query.data;
  if (!data) return <ForecastLoading />;

  return (
    <TooltipProvider delayDuration={120}>
      <div className="space-y-7">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-terracotta font-semibold">
              Crowd Forecast
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight mt-1">
              What public markets expect
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-ink-soft">
              A quick read, separate from official results.
            </p>
          </div>
          <button
            type="button"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
            className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:border-ink/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {query.isFetching ? "Checking..." : "Refresh"}
          </button>
        </header>

        <JumpNav />
        <ReadingGuide />

        <TodaysSimplestRead snapshot={data} />
        <UncertainMatches forecasts={data.teamForecasts} id="forecast-close" />

        <section id="forecast-pulse">
          <SectionHeader
            kicker="Tournament Pulse"
            title="Who the market thinks can win it all"
            note={`Top ${data.topTournamentSignals.length} Polymarket tournament chances`}
          />
          <TournamentPulse teams={data.topTournamentSignals} />
        </section>

        <section>
          <SectionHeader
            kicker="Movement"
            title="24h movement"
            note="Quiet list of teams that moved more than 0.5 percentage points"
          />
          <Movers teams={data.movers} />
        </section>

        <section id="forecast-groups">
          <SectionHeader
            kicker="Group Forecast"
            title="All groups, without replacing standings"
            note="Groups tab = official results. Forecast tab = public market expectation."
          />
          <p className="mt-4 text-xs text-ink-soft">
            <span
              className="inline-block size-2 rounded-full bg-[oklch(0.5_0.12_250)] mr-1.5 align-middle"
              aria-hidden
            />
            Blue = chance to win the Cup
            <span className="mx-2 text-border" aria-hidden>
              ·
            </span>
            <span
              className="inline-block size-2 rounded-full bg-pitch mr-1.5 align-middle"
              aria-hidden
            />
            Green = chance in listed group matches{" "}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline underline decoration-dotted decoration-ink-soft/40 underline-offset-4 hover:decoration-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label="Why can blue and green bars differ?"
                >
                  Why different?
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-56 text-xs">
                A team can be favored in one match and still have a low chance to win the Cup.
              </TooltipContent>
            </Tooltip>
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.groupForecasts.map((group) => (
              <GroupForecastCard key={group.group} group={group.group} teams={group.teams} />
            ))}
          </div>
        </section>

        <p className="rounded-xl border border-dashed border-border bg-paper-deep/40 px-4 py-3 text-xs leading-relaxed text-ink-soft">
          For education and curiosity only. This is not betting, trading, financial, or investment
          advice. Unofficial fan site. Not affiliated with FIFA, ESPN, Polymarket, or Kalshi.
        </p>
      </div>
    </TooltipProvider>
  );
}

function ForecastLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {[0, 1, 2].map((id) => (
        <div key={id} className="rounded-xl border border-border bg-card p-4">
          <div className="h-3 w-24 rounded-full bg-paper-deep" />
          <div className="mt-4 h-7 w-32 rounded-full bg-paper-deep" />
          <div className="mt-3 h-3 w-full rounded-full bg-paper-deep/70" />
          <div className="mt-2 h-3 w-3/4 rounded-full bg-paper-deep/70" />
        </div>
      ))}
    </div>
  );
}

function ReadingGuide() {
  return (
    <details className="group rounded-xl border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[11px] uppercase tracking-wider text-terracotta font-semibold marker:hidden">
        <span>How to read this dashboard</span>
        <span className="text-ink-soft normal-case tracking-normal group-open:hidden">
          Open guide
        </span>
        <span className="hidden text-ink-soft normal-case tracking-normal group-open:inline">
          Hide guide
        </span>
      </summary>
      <div className="grid gap-0 divide-y divide-border/60 border-t border-border text-sm sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        <GuideItem
          label="Tournament"
          swatch="bg-[oklch(0.5_0.12_250)]"
          text="Polymarket chance of winning the whole World Cup."
        />
        <GuideItem
          label="Match"
          swatch="bg-pitch"
          text="Kalshi chance across listed group-stage matches."
        />
        <GuideItem
          label="Pills"
          swatch="bg-paper-deep"
          text="Opponent chips. Percentages are this team's chance vs that opponent. Won, Lost, and Drew are settled."
        />
        <GuideItem
          label="No market"
          swatch="bg-border"
          text="No public market data is available from that source."
        />
      </div>
    </details>
  );
}

function GuideItem({ label, swatch, text }: { label: string; swatch: string; text: string }) {
  return (
    <div className="flex gap-3 px-4 py-3">
      <span className={cn("mt-1 size-2.5 shrink-0 rounded-full", swatch)} aria-hidden />
      <div>
        <p className="font-medium">{label}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{text}</p>
      </div>
    </div>
  );
}

function SectionHeader({ kicker, title, note }: { kicker: string; title: string; note: string }) {
  return (
    <header className="mb-3 flex flex-wrap items-end justify-between gap-2 border-b border-border pb-2">
      <div>
        <p className="text-[11px] uppercase tracking-wider text-terracotta font-semibold">
          {kicker}
        </p>
        <h3 className="font-display text-xl font-semibold">{title}</h3>
      </div>
      <p className="max-w-md text-xs text-ink-soft sm:text-right">{note}</p>
    </header>
  );
}

function TournamentPulse({ teams }: { teams: TeamForecast[] }) {
  if (teams.length === 0) return <EmptyForecast text="No tournament futures available yet." />;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="grid grid-cols-[2rem_1fr_4.5rem_4.5rem] items-center gap-2 border-b border-border bg-paper-deep/30 px-3 py-2 text-[11px] uppercase tracking-wider text-ink-soft sm:grid-cols-[2rem_1fr_5rem_5rem_5rem]">
        <span />
        <span>Team</span>
        <span className="text-right">Chance</span>
        <span className="text-right">Move</span>
        <span className="hidden text-right sm:block">24h vol</span>
      </div>
      {teams.map((team, index) => (
        <div
          key={team.team}
          className="grid grid-cols-[2rem_1fr_4.5rem_4.5rem] items-center gap-2 border-b border-border/60 px-3 py-2 text-sm last:border-b-0 sm:grid-cols-[2rem_1fr_5rem_5rem_5rem]"
        >
          <span className="font-mono text-xs text-ink-soft tabular-nums">{index + 1}</span>
          <div className="min-w-0 sm:grid sm:grid-cols-[minmax(8rem,auto)_1fr] sm:items-center sm:gap-4">
            <div className="min-w-0">
              <p className="truncate font-medium">{team.team}</p>
              <p className="text-xs text-ink-soft">Group {team.group}</p>
            </div>
            <div
              className="hidden h-1.5 overflow-hidden rounded-full bg-paper-deep sm:block"
              aria-hidden
            >
              {team.tournament.probability !== null && (
                <div
                  className="h-full rounded-full bg-[oklch(0.5_0.12_250)]"
                  style={{ width: fmtWidth(team.tournament.probability) }}
                />
              )}
            </div>
          </div>
          <span className="text-right font-display text-base tabular-nums">
            {fmtPct(team.tournament.probability)}
          </span>
          <span
            className={cn(
              "text-right text-xs tabular-nums",
              movementClass(team.tournament.movement24h),
            )}
          >
            {fmtMovement(team.tournament.movement24h)}
          </span>
          <span className="hidden text-right text-xs text-ink-soft tabular-nums sm:block">
            {fmtVolume(team.tournament.volume24h)}
          </span>
        </div>
      ))}
    </div>
  );
}

function Movers({ teams }: { teams: ForecastSnapshot["movers"] }) {
  const [showAll, setShowAll] = useState(false);

  if (teams.length === 0) return <EmptyForecast text="No major movement in the last 24 hours." />;

  const visible = showAll ? teams : teams.slice(0, 3);
  const hidden = teams.length - 3;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {visible.map((team) => (
        <div
          key={team.team}
          className="grid grid-cols-[1fr_5rem_5rem] items-center gap-2 border-b border-border/60 px-3 py-2 text-sm last:border-b-0"
        >
          <div className="min-w-0">
            <p className="truncate font-medium">{team.team}</p>
            <p className="text-xs text-ink-soft">Group {team.group}</p>
          </div>
          <span className="text-right text-xs text-ink-soft tabular-nums">
            {fmtPct(team.probability)}
          </span>
          <span className={cn("text-right text-xs tabular-nums", movementClass(team.movement24h))}>
            {fmtMovement(team.movement24h)}
          </span>
        </div>
      ))}
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="w-full px-3 py-2 text-center text-xs text-ink-soft hover:text-ink transition-colors"
        >
          {showAll ? "Show top 3" : `Show all ${teams.length}`}
        </button>
      )}
    </div>
  );
}

function GroupForecastCard({ group, teams }: { group: string; teams: TeamForecast[] }) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex items-baseline justify-between border-b border-border bg-paper-deep/30 px-3 py-2.5">
        <h3 className="font-display text-lg font-semibold">Group {group}</h3>
        <span className="text-[11px] uppercase tracking-wider text-ink-soft">Market chance</span>
      </header>
      <div className="divide-y divide-border/60">
        {teams.map((team) => (
          <TeamForecastRow key={team.team} team={team} />
        ))}
      </div>
    </section>
  );
}

function TeamForecastRow({ team }: { team: TeamForecast }) {
  return (
    <div className="px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{team.team}</p>
        </div>
        <span className={cn("text-xs tabular-nums", movementClass(team.tournament.movement24h))}>
          {fmtMovement(team.tournament.movement24h)}
        </span>
      </div>
      <div className="mt-2 space-y-1.5">
        <SignalBar
          label="Tournament"
          value={team.tournament.probability}
          colorClass="bg-[oklch(0.5_0.12_250)]"
          help="Polymarket tournament-winner chance."
        />
        <SignalBar
          label="Match"
          value={team.matchAverageProbability}
          colorClass="bg-pitch"
          help="Average Kalshi chance across listed group-stage match markets."
        />
      </div>
      {team.matchSignals.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {team.matchSignals.slice(0, 3).map((signal) => (
            <MatchSignalChip
              key={`${team.team}-${signal.date}-${signal.opponent}`}
              signal={signal}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SignalBar({
  label,
  value,
  colorClass,
  help,
}: {
  label: string;
  value: number | null;
  colorClass: string;
  help: string;
}) {
  return (
    <div className="grid grid-cols-[4.75rem_1fr_3.25rem] items-center gap-2">
      <MetricLabel label={label} help={help} />
      <div className="h-1.5 overflow-hidden rounded-full bg-paper-deep" aria-hidden>
        {value !== null && (
          <div
            className={cn("h-full rounded-full", colorClass)}
            style={{ width: fmtWidth(value) }}
          />
        )}
      </div>
      <span className="text-right text-[11px] tabular-nums text-ink-soft">{fmtPct(value)}</span>
    </div>
  );
}

function MetricLabel({ label, help }: { label: string; help: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="text-left text-[11px] text-ink-soft underline decoration-dotted decoration-ink-soft/40 underline-offset-4 hover:decoration-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={`${label}: ${help}`}
        >
          {label}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-56 text-xs">
        {help}
      </TooltipContent>
    </Tooltip>
  );
}

function MatchSignalChip({ signal }: { signal: TeamMatchSignal }) {
  const settled = signal.result !== null;
  const result = settledLabel(signal.result);
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]",
        !settled && "border-pitch/25 bg-pitch/10",
        signal.result === "win" && "border-pitch/30 bg-pitch/10 text-pitch",
        signal.result === "loss" && "border-terracotta/30 bg-terracotta-soft/35 text-terracotta",
        signal.result === "draw" && "border-ink-soft/25 bg-paper-deep text-ink-soft",
      )}
      title={
        settled
          ? `${result} vs ${signal.opponent}`
          : `Chance vs ${signal.opponent}: ${fmtPct(signal.winProbability)}`
      }
    >
      <span className="text-ink-soft">vs</span>
      <span className="truncate">{signal.opponent}</span>
      <span className="font-mono">{settled ? result : fmtPct(signal.winProbability)}</span>
    </span>
  );
}

function EmptyForecast({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-paper-deep/30 px-4 py-5 text-sm text-ink-soft italic">
      {text}
    </div>
  );
}

function TodaysSimplestRead({ snapshot }: { snapshot: ForecastSnapshot }) {
  const top = snapshot.topTournamentSignals[0];
  const mover = snapshot.movers[0];

  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="border-b border-border bg-paper-deep/30 px-4 py-2.5">
        <p className="text-[11px] uppercase tracking-wider text-terracotta font-semibold">
          Today's simplest read
        </p>
      </header>
      <div className="divide-y divide-border/60">
        {top && (
          <div className="flex items-baseline justify-between gap-3 px-4 py-2.5">
            <p className="text-sm text-ink-soft">Highest Cup chance</p>
            <p className="text-sm font-medium tabular-nums">
              {top.team}{" "}
              <span className="font-display text-base">{fmtPct(top.tournament.probability)}</span>
            </p>
          </div>
        )}
        {mover ? (
          <div className="flex items-baseline justify-between gap-3 px-4 py-2.5">
            <p className="text-sm text-ink-soft">Biggest 24h move</p>
            <p className="text-sm font-medium tabular-nums">
              {mover.team}{" "}
              <span className={cn("font-display text-base", movementClass(mover.movement24h))}>
                {fmtMovement(mover.movement24h)}
              </span>
            </p>
          </div>
        ) : (
          <div className="flex items-baseline justify-between gap-3 px-4 py-2.5">
            <p className="text-sm text-ink-soft">Biggest 24h move</p>
            <p className="text-sm text-ink-soft italic">No movement</p>
          </div>
        )}
      </div>
    </section>
  );
}

function UncertainMatches({ forecasts, id }: { forecasts: TeamForecast[]; id?: string }) {
  const matches = useMemo(() => findUncertainMatches(forecasts), [forecasts]);

  return (
    <section id={id}>
      <SectionHeader
        kicker="Close matches"
        title="Most uncertain matches"
        note="Match markets closest to 50% from available data."
      />
      {matches.length === 0 ? (
        <EmptyForecast text="No open match markets to compare." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {matches.map((m) => (
            <div
              key={`${m.teamA}-${m.teamB}-${m.date}`}
              className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/60 px-4 py-2.5 text-sm last:border-b-0"
            >
              <p>
                <span className="font-medium">{m.teamA}</span>
                <span className="text-ink-soft"> vs </span>
                <span className="font-medium">{m.teamB}</span>
              </p>
              <p className="text-xs tabular-nums">
                <span
                  className={cn(
                    "rounded-full border px-1.5 py-0.5 font-medium",
                    m.label === "Toss-up" && "border-pitch/25 bg-pitch/10 text-pitch",
                    m.label === "Lean" &&
                      "border-terracotta-soft/30 bg-terracotta-soft/15 text-terracotta",
                    m.label === "Strong lean" && "border-ink-soft/25 bg-paper-deep text-ink-soft",
                  )}
                >
                  {m.label}
                </span>{" "}
                {m.probA !== null && fmtPct(m.probA)}
                {m.probB !== null && ` / ${fmtPct(m.probB)}`}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function matchLeanWord(pct: number): string {
  const dist = Math.abs(pct - 0.5) * 100;
  if (dist <= 5) return "Toss-up";
  if (dist <= 15) return "Lean";
  return "Strong lean";
}

function findUncertainMatches(forecasts: TeamForecast[]) {
  type Signal = { team: string; opponent: string; date: string; prob: number };
  const open: Signal[] = [];
  for (const tf of forecasts) {
    for (const ms of tf.matchSignals) {
      if (ms.winProbability !== null && ms.result === null) {
        open.push({
          team: tf.team,
          opponent: ms.opponent,
          date: ms.date,
          prob: ms.winProbability,
        });
      }
    }
  }

  type Entry = { team: string; prob: number };
  const matchups = new Map<string, Entry[]>();
  for (const s of open) {
    const pair = [s.team, s.opponent].sort();
    const key = `${pair[0]}|${pair[1]}|${s.date}`;
    if (!matchups.has(key)) matchups.set(key, []);
    matchups.get(key)!.push({ team: s.team, prob: s.prob });
  }

  const scored = Array.from(matchups.entries()).map(([key, entries]) => {
    const [teamA, teamB, date] = key.split("|");
    const entryA = entries.find((e) => e.team === teamA);
    const entryB = entries.find((e) => e.team === teamB);
    const probA = entryA?.prob ?? null;
    const probB = entryB?.prob ?? null;

    const deviations: number[] = [];
    if (probA !== null) deviations.push(Math.abs(probA - 0.5));
    if (probB !== null) deviations.push(Math.abs(probB - 0.5));
    const score =
      deviations.length > 0 ? deviations.reduce((a, b) => a + b, 0) / deviations.length : 1;

    const avgProb =
      probA !== null && probB !== null ? (probA + probB) / 2 : (probA ?? probB ?? 0.5);

    return {
      teamA,
      teamB,
      date,
      probA,
      probB,
      label: matchLeanWord(avgProb),
      score,
    };
  });

  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, 5);
}

function JumpNav() {
  return (
    <nav className="flex gap-1.5 overflow-x-auto" aria-label="Jump to forecast section">
      <a
        href="#forecast-pulse"
        className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-paper-deep transition-colors"
      >
        Pulse
      </a>
      <a
        href="#forecast-close"
        className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-paper-deep transition-colors"
      >
        Close matches
      </a>
      <a
        href="#forecast-groups"
        className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-paper-deep transition-colors"
      >
        Groups
      </a>
    </nav>
  );
}

function settledLabel(result: "win" | "loss" | "draw" | null): string {
  if (result === "win") return "Won";
  if (result === "loss") return "Lost";
  if (result === "draw") return "Drew";
  return "";
}

function fmtPct(value: number | null): string {
  if (value === null) return "No market";
  return `${(value * 100).toFixed(1)}%`;
}

function fmtMovement(value: number | null): string {
  if (value === null) return "No market";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${(value * 100).toFixed(1)}ppt`;
}

function fmtVolume(value: number | null): string {
  if (value === null) return "No market";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
}

function fmtWidth(value: number): string {
  return `${Math.max(2, Math.min(100, value * 100))}%`;
}

function movementClass(value: number | null): string {
  if (value === null || value === 0) return "text-ink-soft";
  return value > 0 ? "text-pitch" : "text-terracotta";
}
