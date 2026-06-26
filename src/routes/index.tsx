import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { formatSnapshotDateTime } from "@/lib/date-format";
import { getForecast } from "@/lib/forecast.functions";
import { getWorldCup } from "@/lib/worldcup.functions";
import type { ForecastSnapshot } from "@/lib/forecast-types";
import type { Match, RoundSlug, WorldCupSnapshot } from "@/lib/worldcup-types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BracketView } from "@/components/wc/BracketView";
import { CrowdForecastView } from "@/components/wc/CrowdForecastView";
import { GroupsView } from "@/components/wc/GroupsView";
import { MatchesView } from "@/components/wc/MatchesView";
import { MatchCard } from "@/components/wc/MatchCard";

const CLIENT_REFRESH_MS = 30 * 60 * 1000;
const FORECAST_REFRESH_MS = 5 * 60 * 1000;
const FORECAST_WARMUP_REFRESH_MS = 15 * 1000;

const worldCupQuery = queryOptions({
  queryKey: ["worldcup"],
  queryFn: () => getWorldCup(),
  staleTime: CLIENT_REFRESH_MS,
  refetchInterval: CLIENT_REFRESH_MS,
});

const forecastQueryOptions = queryOptions({
  queryKey: ["forecast"],
  queryFn: () => getForecast(),
  staleTime: FORECAST_REFRESH_MS,
});

const KNOCKOUT_ROUNDS: RoundSlug[] = [
  "round-of-32",
  "round-of-16",
  "quarterfinals",
  "semifinals",
  "final",
];

const ROUND_LABELS: Record<RoundSlug, string> = {
  "group-stage": "Group stage",
  "round-of-32": "Round of 32",
  "round-of-16": "Round of 16",
  quarterfinals: "Quarter-finals",
  semifinals: "Semi-finals",
  "3rd-place-match": "Third-place play-off",
  final: "Final",
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "World Cup Hub - 2026 Bracket, Fixtures & Crowd Forecast" },
      {
        name: "description",
        content:
          "Unofficial 2026 FIFA World Cup dashboard for the live bracket, fixtures, results, group-stage archive, and a separate Crowd Forecast from public market data.",
      },
      { property: "og:title", content: "World Cup Hub - 2026 Bracket, Fixtures & Crowd Forecast" },
      {
        property: "og:description",
        content:
          "Follow the 2026 World Cup bracket, match results, group-stage archive, and a separate Crowd Forecast in one lightweight fan dashboard.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(worldCupQuery),
  component: Dashboard,
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl">Couldn't load tournament data</h1>
        <p className="mt-2 text-sm text-ink-soft">{error.message}</p>
      </div>
    </div>
  ),
});

type FeaturedMatches = {
  live: Match[];
  next: Match | null;
  recent: Match[];
};

function pickFeatured(matches: Match[], now: number): FeaturedMatches {
  const live = matches.filter((m) => m.status === "in");
  const upcoming = matches
    .filter((m) => m.status === "pre" && new Date(m.date).getTime() > now)
    .sort((a, b) => a.date.localeCompare(b.date));
  const completed = matches
    .filter((m) => m.status === "post")
    .sort((a, b) => b.date.localeCompare(a.date));
  const latestCompletedDate = completed[0]?.date;
  const recent = latestCompletedDate
    ? completed.filter((match) => match.date === latestCompletedDate)
    : [];
  return { live, next: upcoming[0] ?? null, recent };
}

function isKnockoutRound(round: RoundSlug): boolean {
  return round !== "group-stage";
}

function isKnockoutPhase(snapshot: WorldCupSnapshot, now: number): boolean {
  const groupMatches = snapshot.matches.filter((match) => match.round === "group-stage");
  const knockoutMatches = snapshot.matches.filter((match) => isKnockoutRound(match.round));

  if (knockoutMatches.some((match) => match.status === "in" || match.status === "post")) {
    return true;
  }

  if (groupMatches.length > 0 && groupMatches.every((match) => match.status === "post")) {
    return true;
  }

  const next = snapshot.matches
    .filter((match) => match.status === "pre" && new Date(match.date).getTime() > now)
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  return next ? isKnockoutRound(next.round) : false;
}

function pickCurrentKnockoutRound(
  snapshot: WorldCupSnapshot,
  now: number,
): { round: RoundSlug; matches: Match[] } | null {
  const liveRound = KNOCKOUT_ROUNDS.find((round) =>
    snapshot.rounds[round].some((match) => match.status === "in"),
  );
  if (liveRound) return { round: liveRound, matches: snapshot.rounds[liveRound] };

  const next = KNOCKOUT_ROUNDS.flatMap((round) => snapshot.rounds[round])
    .filter((match) => match.status === "pre" && new Date(match.date).getTime() > now)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  if (next) return { round: next.round, matches: snapshot.rounds[next.round] };

  const latest = KNOCKOUT_ROUNDS.flatMap((round) => snapshot.rounds[round])
    .filter((match) => match.status === "post")
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  if (latest) return { round: latest.round, matches: snapshot.rounds[latest.round] };

  const firstRoundWithFixtures = KNOCKOUT_ROUNDS.find((round) => snapshot.rounds[round].length > 0);
  return firstRoundWithFixtures
    ? { round: firstRoundWithFixtures, matches: snapshot.rounds[firstRoundWithFixtures] }
    : null;
}

function Dashboard() {
  const { data } = useSuspenseQuery(worldCupQuery);
  const [tab, setTab] = useState<"bracket" | "groups" | "matches" | "forecast">("bracket");
  const forecastQuery = useQuery({
    ...forecastQueryOptions,
    enabled: tab === "forecast",
    refetchInterval: (query) => {
      if (tab !== "forecast") return false;
      const forecast = query.state.data as ForecastSnapshot | undefined;
      return forecast?.sourceStatus.matchMarkets.status === "live"
        ? FORECAST_REFRESH_MS
        : FORECAST_WARMUP_REFRESH_MS;
    },
  });

  const fetchedAt = new Date(data.fetchedAt).getTime();
  const featured = useMemo(() => pickFeatured(data.matches, fetchedAt), [data.matches, fetchedAt]);
  const knockoutPhase = useMemo(() => isKnockoutPhase(data, fetchedAt), [data, fetchedAt]);

  const totals = useMemo(() => {
    const played = data.matches.filter((m) => m.status === "post").length;
    const remaining = data.matches.length - played;
    return { played, remaining, total: data.matches.length };
  }, [data.matches]);

  return (
    <div className="relative min-h-screen">
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-terracotta font-semibold">
              United States · Canada · Mexico
            </p>
            <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight mt-1">
              FIFA World Cup <span className="text-terracotta">2026</span>
            </h1>
            <p className="mt-2 text-sm text-ink-soft max-w-xl">
              {knockoutPhase
                ? "The groups set the field. Every match now redraws the road to the final."
                : "Scores first. Forecasts separate. A clear match-day view for World Cup fans."}
            </p>
          </div>
          <dl className="flex items-end gap-6 text-right">
            <Stat label="Played" value={totals.played} />
            <Stat label="Remaining" value={totals.remaining} />
            <Stat label="Total" value={totals.total} />
          </dl>
        </header>

        {/* Live / Next strip */}
        {!knockoutPhase &&
          (featured.live.length > 0 || featured.next || featured.recent.length > 0) && (
            <section className="mt-6 grid gap-3 md:grid-cols-3">
              {featured.live.map((match) => (
                <FeaturedSlot key={match.id} label="Live now" match={match} accent />
              ))}
              {featured.live.length === 0 &&
                (featured.recent.length > 0 ? (
                  featured.recent.map((match) => (
                    <FeaturedSlot key={match.id} label="Latest result" match={match} />
                  ))
                ) : (
                  <FeaturedPlaceholder label="Latest result" text="No matches finished yet." />
                ))}
              {(featured.live.length > 0 ? featured.live.length < 2 : featured.recent.length < 2) &&
                (featured.next ? (
                  <FeaturedSlot label="Next up" match={featured.next} />
                ) : (
                  <FeaturedPlaceholder label="Next match" text="No upcoming matches." />
                ))}
            </section>
          )}

        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mt-8">
          <div className="-mx-4 overflow-x-auto px-4 pb-1">
            <TabsList className="bg-paper-deep/60 p-1 rounded-full">
              <TabsTrigger
                value="bracket"
                className="rounded-full px-5 data-[state=active]:bg-ink data-[state=active]:text-paper"
              >
                Bracket
              </TabsTrigger>
              {!knockoutPhase && (
                <TabsTrigger
                  value="groups"
                  className="rounded-full px-5 data-[state=active]:bg-ink data-[state=active]:text-paper"
                >
                  Groups · A–L
                </TabsTrigger>
              )}
              <TabsTrigger
                value="matches"
                className="rounded-full px-5 data-[state=active]:bg-ink data-[state=active]:text-paper"
              >
                Matches
              </TabsTrigger>
              <TabsTrigger
                value="forecast"
                className="rounded-full px-5 data-[state=active]:bg-ink data-[state=active]:text-paper"
              >
                Crowd Forecast
              </TabsTrigger>
              {knockoutPhase && (
                <TabsTrigger
                  value="groups"
                  className="rounded-full px-5 data-[state=active]:bg-ink data-[state=active]:text-paper"
                >
                  Group Stage
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <TabsContent value="bracket" className="mt-6">
            {knockoutPhase ? (
              <KnockoutDashboard
                snapshot={data}
                fetchedAt={fetchedAt}
                featured={featured}
                onOpenForecast={() => setTab("forecast")}
              />
            ) : (
              <BracketView snapshot={data} />
            )}
          </TabsContent>
          <TabsContent value="groups" className="mt-6">
            <GroupsView groups={data.groups} />
          </TabsContent>
          <TabsContent value="matches" className="mt-6">
            <MatchesView
              matches={data.matches}
              autoScrollToCurrent={tab === "matches"}
              defaultFilter={knockoutPhase ? "knockout" : "all"}
              collapseGroupStage={knockoutPhase}
            />
          </TabsContent>
          <TabsContent value="forecast" className="mt-6">
            <CrowdForecastView query={forecastQuery} />
          </TabsContent>
        </Tabs>

        <DataSourcesDetails fetchedAt={data.fetchedAt} />

        <footer className="mt-6 pt-6 border-t border-border text-xs text-ink-soft flex flex-wrap justify-between gap-2">
          <p>Unofficial World Cup fan dashboard. Not affiliated with FIFA, ESPN, or Polymarket.</p>
          <p>
            Made by{" "}
            <a
              href="https://miaggy.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-ink underline decoration-dotted underline-offset-4 hover:text-terracotta"
            >
              miaggy.com
            </a>
            .
          </p>
        </footer>
      </div>
    </div>
  );
}

function KnockoutDashboard({
  snapshot,
  fetchedAt,
  featured,
  onOpenForecast,
}: {
  snapshot: WorldCupSnapshot;
  fetchedAt: number;
  featured: FeaturedMatches;
  onOpenForecast: () => void;
}) {
  const currentRound = pickCurrentKnockoutRound(snapshot, fetchedAt);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <article className="overflow-hidden rounded-2xl border border-border bg-card">
          <header className="border-b border-border bg-paper-deep/30 px-4 py-4 sm:px-5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-terracotta font-semibold">
              Road to the final
            </p>
            <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-semibold tracking-tight">
                  The bracket carries the story now
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-ink-soft">
                  Official fixtures and results anchor the page. Crowd Forecast stays separate.
                </p>
              </div>
              {currentRound && (
                <RoundPill round={currentRound.round} count={currentRound.matches.length} />
              )}
            </div>
          </header>
          <div className="px-4 py-4 sm:px-5">
            <BracketView snapshot={snapshot} />
          </div>
        </article>

        <aside
          className="space-y-3 lg:sticky lg:top-6 lg:self-start"
          aria-label="Today at a glance"
        >
          <TodayRail featured={featured} />
          <ForecastSidecar onOpenForecast={onOpenForecast} />
        </aside>
      </section>

      {currentRound && <RoundFocus round={currentRound.round} matches={currentRound.matches} />}
    </div>
  );
}

function RoundPill({ round, count }: { round: RoundSlug; count: number }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-terracotta/25 bg-terracotta-soft/20 px-3 py-1 text-xs font-medium text-terracotta">
      <span className="size-1.5 rounded-full bg-terracotta" aria-hidden />
      {ROUND_LABELS[round]} · {count} matches
    </span>
  );
}

function TodayRail({ featured }: { featured: FeaturedMatches }) {
  const showRecent = featured.live.length === 0;
  const primaryMatches = showRecent ? featured.recent.slice(0, 2) : featured.live.slice(0, 2);
  const primaryLabel = showRecent ? "Latest result" : "Live now";

  return (
    <div className="rounded-2xl border border-border bg-card p-3.5">
      <header className="mb-3 flex items-baseline justify-between gap-3 border-b border-border pb-2">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-terracotta font-semibold">
            Match-day desk
          </p>
          <h3 className="font-display text-lg font-semibold">Live, next, latest</h3>
        </div>
      </header>
      <div className="space-y-3">
        {primaryMatches.length > 0 ? (
          primaryMatches.map((match) => (
            <FeaturedSlot key={match.id} label={primaryLabel} match={match} accent={!showRecent} />
          ))
        ) : (
          <FeaturedPlaceholder label="Latest result" text="No matches finished yet." />
        )}
        {featured.next ? (
          <FeaturedSlot label="Next up" match={featured.next} />
        ) : (
          <FeaturedPlaceholder label="Next up" text="No upcoming matches." />
        )}
        <p className="border-t border-border pt-2 text-[11px] text-ink-soft">
          Scores refresh every 30 min. Forecasts load only when opened.
        </p>
      </div>
    </div>
  );
}

function ForecastSidecar({ onOpenForecast }: { onOpenForecast: () => void }) {
  return (
    <section className="rounded-2xl border border-dashed border-terracotta/30 bg-terracotta-soft/10 p-4">
      <p className="text-[11px] uppercase tracking-wider text-terracotta font-semibold">
        Crowd Forecast
      </p>
      <h3 className="mt-1 font-display text-lg font-semibold">Crowd context, not official data</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Public market expectations stay outside the bracket. Use them as a crowd read on toss-ups,
        Cup chances, and movement.
      </p>
      <button
        type="button"
        onClick={onOpenForecast}
        className="mt-3 rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-ink/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        View Crowd Forecast
      </button>
    </section>
  );
}

function RoundFocus({ round, matches }: { round: RoundSlug; matches: Match[] }) {
  if (matches.length === 0) return null;

  return (
    <section>
      <header className="mb-3 flex flex-wrap items-end justify-between gap-2 border-b border-border pb-2">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-terracotta font-semibold">
            Current round
          </p>
          <h2 className="font-display text-xl font-semibold">{ROUND_LABELS[round]}</h2>
        </div>
        <p className="max-w-md text-xs text-ink-soft sm:text-right">
          A quick scan of the round in focus. The full path stays in the bracket above.
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {matches.map((match) => (
          <MatchCard key={match.id} match={match} />
        ))}
      </div>
    </section>
  );
}

function DataSourcesDetails({ fetchedAt }: { fetchedAt: string }) {
  return (
    <details className="mt-10 rounded-xl border border-dashed border-border bg-paper-deep/30 px-4 py-3 text-xs text-ink-soft">
      <summary className="cursor-pointer list-none font-medium text-ink marker:hidden">
        Data sources
      </summary>
      <p className="mt-2 leading-relaxed">
        Scores come from ESPN public feeds. Snapshot {formatSnapshotDateTime(fetchedAt)}. Crowd
        Forecast uses public Polymarket markets, loads only when opened, and is context only.
      </p>
    </details>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dd className="font-display text-2xl font-semibold tabular-nums">{value}</dd>
      <dt className="text-[11px] uppercase tracking-wider text-ink-soft">{label}</dt>
    </div>
  );
}

function FeaturedSlot({
  label,
  match,
  accent = false,
}: {
  label: string;
  match: Match;
  accent?: boolean;
}) {
  return (
    <div className="space-y-2">
      <p
        className={`text-[11px] uppercase tracking-wider font-semibold ${accent ? "text-terracotta" : "text-ink-soft"}`}
      >
        {label}
      </p>
      <MatchCard match={match} compact />
    </div>
  );
}

function FeaturedPlaceholder({ label, text }: { label: string; text: string }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] uppercase tracking-wider font-semibold text-ink-soft">{label}</p>
      <div className="rounded-xl border border-dashed border-border bg-paper-deep/30 px-4 py-6 text-sm text-ink-soft italic">
        {text}
      </div>
    </div>
  );
}
