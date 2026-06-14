import { formatMatchDateTime } from "@/lib/date-format";
import type { Match } from "@/lib/worldcup-types";
import { TeamBadge } from "./TeamBadge";
import { cn } from "@/lib/utils";

interface Props {
  match: Match;
  compact?: boolean;
}

export function MatchCard({ match, compact = false }: Props) {
  const isPost = match.status === "post";
  const isLive = match.status === "in";

  const sideClasses = (winner: boolean, loser: boolean) =>
    cn("flex items-center justify-between gap-3 py-1.5", loser && "opacity-55");

  return (
    <article
      className={cn(
        "group relative rounded-xl border border-border bg-card px-3.5 py-2.5 shadow-[0_1px_0_oklch(0.86_0.02_80)]",
        "transition-colors hover:border-ink/20",
        isLive && "ring-1 ring-terracotta/60",
      )}
    >
      <header className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-wider text-ink-soft mb-1.5">
        <time dateTime={match.date} className="tabular-nums">
          {formatMatchDateTime(match.date)}
        </time>
        <span className="flex items-center gap-1.5">
          {isLive && (
            <span className="inline-flex items-center gap-1 text-terracotta font-semibold">
              <span className="size-1.5 rounded-full bg-terracotta animate-pulse" /> LIVE
            </span>
          )}
          {isPost && <span className="text-pitch font-semibold">FT</span>}
          {!isLive && !isPost && match.shortName && (
            <span className="font-mono">{match.shortName}</span>
          )}
        </span>
      </header>

      <div className="divide-y divide-border/60">
        <div
          className={sideClasses(
            match.home.winner,
            isPost && !match.home.winner && match.home.score !== match.away.score,
          )}
        >
          <TeamBadge team={match.home.team} size={compact ? "sm" : "md"} />
          <span className="font-display text-lg tabular-nums w-6 text-right">
            {match.home.score ?? ""}
          </span>
        </div>
        <div
          className={sideClasses(
            match.away.winner,
            isPost && !match.away.winner && match.home.score !== match.away.score,
          )}
        >
          <TeamBadge team={match.away.team} size={compact ? "sm" : "md"} />
          <span className="font-display text-lg tabular-nums w-6 text-right">
            {match.away.score ?? ""}
          </span>
        </div>
      </div>

      {match.venue && !compact && (
        <p className="mt-1.5 text-[11px] text-ink-soft truncate">{match.venue}</p>
      )}
    </article>
  );
}
