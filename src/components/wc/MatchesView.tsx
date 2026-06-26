import { useEffect, useMemo, useState } from "react";
import { formatMatchDay, utcDateKey } from "@/lib/date-format";
import type { Match } from "@/lib/worldcup-types";
import { cn } from "@/lib/utils";
import { MatchCard } from "./MatchCard";

export type MatchFilter = "all" | "live" | "upcoming" | "results" | "knockout" | "group-stage";

interface Props {
  matches: Match[];
  autoScrollToCurrent?: boolean;
  defaultFilter?: MatchFilter;
  collapseGroupStage?: boolean;
}

const FILTERS: { value: MatchFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "live", label: "Live" },
  { value: "upcoming", label: "Upcoming" },
  { value: "results", label: "Results" },
  { value: "knockout", label: "Knockout" },
  { value: "group-stage", label: "Group Stage" },
];

export function MatchesView({
  matches,
  autoScrollToCurrent = false,
  defaultFilter = "all",
  collapseGroupStage = false,
}: Props) {
  const [filter, setFilter] = useState<MatchFilter>(defaultFilter);
  const filteredMatches = useMemo(() => filterMatches(matches, filter), [matches, filter]);
  const targetMatch = useMemo(() => pickCurrentMatch(filteredMatches), [filteredMatches]);
  const groupMatches = useMemo(
    () => (filter === "all" && collapseGroupStage ? filteredMatches.filter(isGroupStage) : []),
    [collapseGroupStage, filter, filteredMatches],
  );
  const primaryMatches =
    filter === "all" && collapseGroupStage
      ? filteredMatches.filter((match) => !isGroupStage(match))
      : filteredMatches;

  useEffect(() => {
    if (!autoScrollToCurrent || !targetMatch) return;
    if (!window.matchMedia("(max-width: 640px)").matches) return;

    const frame = window.requestAnimationFrame(() => {
      document
        .getElementById(matchAnchorId(targetMatch.id))
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [autoScrollToCurrent, targetMatch]);

  if (matches.length === 0) {
    return <p className="text-ink-soft italic">No matches available.</p>;
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-terracotta font-semibold">
            Match ledger
          </p>
          <h2 className="font-display text-2xl font-semibold">Every fixture, easier to scan</h2>
        </div>
        <nav className="flex gap-1.5 overflow-x-auto" aria-label="Filter matches">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                filter === item.value
                  ? "border-ink bg-ink text-paper"
                  : "border-border bg-card hover:border-ink/25",
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      {primaryMatches.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-paper-deep/30 px-4 py-5 text-sm text-ink-soft italic">
          No matches in this view.
        </p>
      ) : (
        <MatchDays matches={primaryMatches} />
      )}

      {groupMatches.length > 0 && (
        <details className="rounded-xl border border-border bg-card">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:hidden">
            <span>
              <span className="block text-[11px] uppercase tracking-wider text-ink-soft font-semibold">
                Archive
              </span>
              <span className="font-display text-lg font-semibold">
                Group stage results, {groupMatches.length} matches
              </span>
            </span>
            <span className="text-xs text-ink-soft">Open</span>
          </summary>
          <div className="border-t border-border px-4 py-4">
            <MatchDays matches={groupMatches} />
          </div>
        </details>
      )}
    </div>
  );
}

function MatchDays({ matches }: { matches: Match[] }) {
  const days = groupMatchesByDay(matches);

  return (
    <div className="space-y-8">
      {days.map(({ dateKey, matches }) => (
        <section key={dateKey}>
          <header className="sticky top-0 z-10 bg-paper/95 backdrop-blur-sm py-2 mb-3 border-b border-border">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-ink-soft">
              {formatMatchDay(dateKey)}
            </h3>
          </header>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {matches.map((match) => (
              <div key={match.id} id={matchAnchorId(match.id)} className="scroll-mt-20">
                <MatchCard match={match} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function filterMatches(matches: Match[], filter: MatchFilter): Match[] {
  switch (filter) {
    case "live":
      return matches.filter((match) => match.status === "in");
    case "upcoming":
      return matches.filter((match) => match.status === "pre");
    case "results":
      return matches.filter((match) => match.status === "post");
    case "knockout":
      return matches.filter((match) => !isGroupStage(match));
    case "group-stage":
      return matches.filter(isGroupStage);
    case "all":
    default:
      return matches;
  }
}

function groupMatchesByDay(matches: Match[]): { dateKey: string; matches: Match[] }[] {
  const days: { dateKey: string; matches: Match[] }[] = [];
  for (const match of matches) {
    const dateKey = utcDateKey(match.date);
    const last = days[days.length - 1];
    if (last?.dateKey === dateKey) last.matches.push(match);
    else days.push({ dateKey, matches: [match] });
  }
  return days;
}

function isGroupStage(match: Match): boolean {
  return match.round === "group-stage";
}

function pickCurrentMatch(matches: Match[]): Match | null {
  const live = matches
    .filter((match) => match.status === "in")
    .sort((a, b) => a.date.localeCompare(b.date));
  if (live[0]) return live[0];

  const completed = matches
    .filter((match) => match.status === "post")
    .sort((a, b) => b.date.localeCompare(a.date));
  if (completed[0]) return completed[0];

  const upcoming = matches
    .filter((match) => match.status === "pre")
    .sort((a, b) => a.date.localeCompare(b.date));
  return upcoming[0] ?? matches[0] ?? null;
}

function matchAnchorId(id: string): string {
  return `match-${id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}
