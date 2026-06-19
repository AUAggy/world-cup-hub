import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { formatSnapshotDateTime } from "@/lib/date-format";
import { getForecast } from "@/lib/forecast.functions";
import { getWorldCup } from "@/lib/worldcup.functions";
import type { Match } from "@/lib/worldcup-types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BracketView } from "@/components/wc/BracketView";
import { CrowdForecastView } from "@/components/wc/CrowdForecastView";
import { GroupsView } from "@/components/wc/GroupsView";
import { MatchesView } from "@/components/wc/MatchesView";
import { MatchCard } from "@/components/wc/MatchCard";

const CLIENT_REFRESH_MS = 30 * 60 * 1000;
const FORECAST_REFRESH_MS = 5 * 60 * 1000;

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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "World Cup Hub - Bracket, Matches & Crowd Forecast" },
      {
        name: "description",
        content:
          "Unofficial 2026 FIFA World Cup dashboard with bracket, groups, matches, live status, and an optional Crowd Forecast layer for public market expectations.",
      },
      { property: "og:title", content: "World Cup Hub - Bracket, Matches & Crowd Forecast" },
      {
        property: "og:description",
        content:
          "Track the 2026 World Cup bracket, groups, fixtures, live match status, and public market expectations in one lightweight fan dashboard.",
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

function pickFeatured(
  matches: Match[],
  now: number,
): {
  live: Match[];
  next: Match | null;
  recent: Match | null;
} {
  const live = matches.filter((m) => m.status === "in");
  const upcoming = matches
    .filter((m) => m.status === "pre" && new Date(m.date).getTime() > now)
    .sort((a, b) => a.date.localeCompare(b.date));
  const completed = matches
    .filter((m) => m.status === "post")
    .sort((a, b) => b.date.localeCompare(a.date));
  return { live, next: upcoming[0] ?? null, recent: completed[0] ?? null };
}

function Dashboard() {
  const { data } = useSuspenseQuery(worldCupQuery);
  const [tab, setTab] = useState<"bracket" | "groups" | "matches" | "forecast">("bracket");
  const forecastQuery = useQuery({
    ...forecastQueryOptions,
    enabled: tab === "forecast",
    refetchInterval: tab === "forecast" ? FORECAST_REFRESH_MS : false,
  });

  const fetchedAt = new Date(data.fetchedAt).getTime();
  const featured = useMemo(() => pickFeatured(data.matches, fetchedAt), [data.matches, fetchedAt]);

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
              An unofficial fan dashboard — bracket first, then groups, then every match. No
              betting, no noise.
            </p>
          </div>
          <dl className="flex items-end gap-6 text-right">
            <Stat label="Played" value={totals.played} />
            <Stat label="Remaining" value={totals.remaining} />
            <Stat label="Total" value={totals.total} />
          </dl>
        </header>

        {/* Live / Next strip */}
        {(featured.live.length > 0 || featured.next || featured.recent) && (
          <section className="mt-6 grid gap-3 md:grid-cols-3">
            {featured.live[0] ? (
              <FeaturedSlot label="Live now" match={featured.live[0]} accent />
            ) : featured.recent ? (
              <FeaturedSlot label="Latest result" match={featured.recent} />
            ) : (
              <FeaturedPlaceholder label="Latest result" text="No matches finished yet." />
            )}
            {featured.next ? (
              <FeaturedSlot label="Next match" match={featured.next} />
            ) : (
              <FeaturedPlaceholder label="Next match" text="No upcoming matches." />
            )}
            <div className="rounded-xl border border-dashed border-border bg-paper-deep/40 p-3.5 flex flex-col justify-between">
              <p className="text-[11px] uppercase tracking-wider text-ink-soft font-semibold">
                Data
              </p>
              <div className="text-sm">
                <p className="font-medium">Scores: ESPN public feed</p>
                <p className="text-ink-soft text-xs mt-0.5">
                  Snapshot {formatSnapshotDateTime(data.fetchedAt)} · refreshes every 30 min
                </p>
                <p className="text-ink-soft text-xs mt-0.5">
                  Forecast markets load on demand · refresh every 5 min
                </p>
              </div>
            </div>
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
              <TabsTrigger
                value="groups"
                className="rounded-full px-5 data-[state=active]:bg-ink data-[state=active]:text-paper"
              >
                Groups · A–L
              </TabsTrigger>
              <TabsTrigger
                value="matches"
                className="rounded-full px-5 data-[state=active]:bg-ink data-[state=active]:text-paper"
              >
                All matches
              </TabsTrigger>
              <TabsTrigger
                value="forecast"
                className="rounded-full px-5 data-[state=active]:bg-ink data-[state=active]:text-paper"
              >
                Crowd Forecast
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="bracket" className="mt-6">
            <BracketView snapshot={data} />
          </TabsContent>
          <TabsContent value="groups" className="mt-6">
            <GroupsView groups={data.groups} />
          </TabsContent>
          <TabsContent value="matches" className="mt-6">
            <MatchesView matches={data.matches} autoScrollToCurrent={tab === "matches"} />
          </TabsContent>
          <TabsContent value="forecast" className="mt-6">
            <CrowdForecastView query={forecastQuery} />
          </TabsContent>
        </Tabs>

        <footer className="mt-12 pt-6 border-t border-border text-xs text-ink-soft flex flex-wrap justify-between gap-2">
          <p>
            Unofficial World Cup fan dashboard. Not affiliated with FIFA, ESPN, Polymarket, or
            Kalshi.
          </p>
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
