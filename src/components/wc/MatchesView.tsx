import { formatMatchDay, utcDateKey } from "@/lib/date-format";
import type { Match } from "@/lib/worldcup-types";
import { MatchCard } from "./MatchCard";

export function MatchesView({ matches }: { matches: Match[] }) {
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
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
