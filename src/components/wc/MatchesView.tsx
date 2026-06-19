import { useEffect, useMemo } from "react";
import { formatMatchDay, utcDateKey } from "@/lib/date-format";
import type { Match } from "@/lib/worldcup-types";
import { MatchCard } from "./MatchCard";

interface Props {
  matches: Match[];
  autoScrollToCurrent?: boolean;
}

export function MatchesView({ matches, autoScrollToCurrent = false }: Props) {
  const targetMatch = useMemo(() => pickCurrentMatch(matches), [matches]);

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

  const days: { dateKey: string; matches: Match[] }[] = [];
  for (const match of matches) {
    const dateKey = utcDateKey(match.date);
    const last = days[days.length - 1];
    if (last?.dateKey === dateKey) last.matches.push(match);
    else days.push({ dateKey, matches: [match] });
  }

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
            {matches.map((m) => (
              <div key={m.id} id={matchAnchorId(m.id)} className="scroll-mt-20">
                <MatchCard match={m} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
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
