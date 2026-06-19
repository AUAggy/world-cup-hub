import type { UseQueryResult } from "@tanstack/react-query";
import { formatSnapshotDateTime } from "@/lib/date-format";
import type {
  ForecastSnapshot,
  ForecastSourceStatus,
  TeamForecast,
  TeamMatchSignal,
} from "@/lib/forecast-types";
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
              Public market signal, kept separate
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-ink-soft">
              Polymarket tournament futures and Kalshi group-stage match markets answer different
              questions. They are shown separately for education and curiosity only.
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

        <SourceStatusStrip snapshot={data} />
        <ReadingGuide />

        <section>
          <SectionHeader
            kicker="Tournament Pulse"
            title="Who the market thinks can win it all"
            note={`Top ${data.topTournamentSignals.length} Polymarket tournament signals`}
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

        <section>
          <SectionHeader
            kicker="Group Forecast"
            title="All groups, without replacing standings"
            note="Official tables stay in Groups. These are public market signals."
          />
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

function SourceStatusStrip({ snapshot }: { snapshot: ForecastSnapshot }) {
  return (
    <section className="grid gap-3 sm:grid-cols-3">
      <SourceStatusCard label="Polymarket" status={snapshot.sourceStatus.polymarket} />
      <SourceStatusCard label="Kalshi" status={snapshot.sourceStatus.kalshi} />
      <div className="rounded-xl border border-border bg-card px-4 py-3">
        <p className="text-[11px] uppercase tracking-wider text-ink-soft font-semibold">Snapshot</p>
        <p className="mt-2 text-sm font-medium">{formatSnapshotDateTime(snapshot.fetchedAt)}</p>
        <p className="mt-0.5 text-xs text-ink-soft">Market cache {snapshot.ttlSeconds}s</p>
      </div>
    </section>
  );
}

function SourceStatusCard({ label, status }: { label: string; status: ForecastSourceStatus }) {
  const live = status.status === "live";
  const cached = status.status === "cached";
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] uppercase tracking-wider text-ink-soft font-semibold">{label}</p>
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
            live && "border-pitch/30 bg-pitch/10 text-pitch",
            cached && "border-terracotta/30 bg-terracotta-soft/35 text-terracotta",
            !live && !cached && "border-border bg-paper-deep text-ink-soft",
          )}
        >
          {status.status}
        </span>
      </div>
      <p className="mt-2 text-sm font-medium">
        {status.updatedAt ? formatSnapshotDateTime(status.updatedAt) : "No confirmed data"}
      </p>
      {status.message && <p className="mt-0.5 text-xs text-ink-soft">{status.message}</p>}
    </div>
  );
}

function ReadingGuide() {
  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="border-b border-border bg-paper-deep/30 px-4 py-3">
        <p className="text-[11px] uppercase tracking-wider text-terracotta font-semibold">
          How to read this dashboard
        </p>
      </header>
      <div className="grid gap-0 divide-y divide-border/60 text-sm sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        <GuideItem
          label="Tournament"
          swatch="bg-[oklch(0.5_0.12_250)]"
          text="Polymarket signal for winning the whole World Cup."
        />
        <GuideItem
          label="Match"
          swatch="bg-pitch"
          text="Kalshi signal across listed group-stage matches."
        />
        <GuideItem
          label="Pills"
          swatch="bg-paper-deep"
          text="Opponent chips. Percentages are open markets. WIN, LOSS, and DRAW are settled."
        />
        <GuideItem
          label="N/A"
          swatch="bg-border"
          text="No public market signal is available from that source."
        />
      </div>
    </section>
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
        <span className="text-right">Signal</span>
        <span className="text-right">Move</span>
        <span className="hidden text-right sm:block">24h vol</span>
      </div>
      {teams.map((team, index) => (
        <div
          key={team.team}
          className="grid grid-cols-[2rem_1fr_4.5rem_4.5rem] items-center gap-2 border-b border-border/60 px-3 py-2 text-sm last:border-b-0 sm:grid-cols-[2rem_1fr_5rem_5rem_5rem]"
        >
          <span className="font-mono text-xs text-ink-soft tabular-nums">{index + 1}</span>
          <div className="min-w-0">
            <p className="truncate font-medium">{team.team}</p>
            <p className="text-xs text-ink-soft">Group {team.group}</p>
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
  if (teams.length === 0) return <EmptyForecast text="No major movement in the last 24 hours." />;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {teams.slice(0, 9).map((team) => (
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
    </div>
  );
}

function GroupForecastCard({ group, teams }: { group: string; teams: TeamForecast[] }) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex items-baseline justify-between border-b border-border bg-paper-deep/30 px-3 py-2.5">
        <h3 className="font-display text-lg font-semibold">Group {group}</h3>
        <span className="text-[11px] uppercase tracking-wider text-ink-soft">Market signal</span>
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
          help="Polymarket tournament-winner signal."
        />
        <SignalBar
          label="Match"
          value={team.matchAverageProbability}
          colorClass="bg-pitch"
          help="Average Kalshi signal across listed group-stage match markets."
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
  const result = signal.result?.toUpperCase();
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]",
        !settled && "border-pitch/25 bg-pitch/10",
        signal.result === "win" && "border-pitch/30 bg-pitch/10 text-pitch",
        signal.result === "loss" && "border-terracotta/30 bg-terracotta-soft/35 text-terracotta",
        signal.result === "draw" && "border-ink-soft/25 bg-paper-deep text-ink-soft",
      )}
      title={signal.opponent}
    >
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

function fmtPct(value: number | null): string {
  if (value === null) return "N/A";
  return `${(value * 100).toFixed(1)}%`;
}

function fmtMovement(value: number | null): string {
  if (value === null) return "N/A";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${(value * 100).toFixed(1)}ppt`;
}

function fmtVolume(value: number | null): string {
  if (value === null) return "N/A";
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
