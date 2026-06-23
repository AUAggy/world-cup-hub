import type { GroupTable } from "@/lib/worldcup-types";
import { TeamBadge } from "./TeamBadge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const COLS: {
  key: keyof Pick<
    import("@/lib/worldcup-types").StandingRow,
    "mp" | "w" | "d" | "l" | "gf" | "ga" | "gd" | "pts"
  >;
  label: string;
  help: string;
}[] = [
  { key: "mp", label: "MP", help: "Matches played" },
  { key: "w", label: "W", help: "Wins" },
  { key: "d", label: "D", help: "Draws" },
  { key: "l", label: "L", help: "Losses" },
  { key: "gf", label: "GF", help: "Goals for — total goals scored" },
  { key: "ga", label: "GA", help: "Goals against — total goals conceded" },
  { key: "gd", label: "GD", help: "Goal difference (GF − GA)" },
  { key: "pts", label: "PTS", help: "Points — 3 for a win, 1 for a draw, 0 for a loss" },
];

function StatHeader() {
  return (
    <div className="grid grid-cols-[1.4rem_1fr_repeat(8,2rem)] items-center gap-x-1 text-[11px] uppercase tracking-wider text-ink-soft px-3 py-2 border-b border-border">
      <span />
      <span />
      {COLS.map((c) => (
        <Tooltip key={c.key}>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="text-center tabular-nums underline decoration-dotted decoration-ink-soft/40 underline-offset-4 hover:decoration-ink-soft"
              aria-label={c.help}
            >
              {c.label}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <strong>{c.label}</strong> — {c.help}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

function TeamTooltipCell({ row }: { row: GroupTable["rows"][number] }) {
  const label = row.team.placeholder ?? row.team.name;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="min-w-0 w-full rounded-sm bg-transparent p-0 text-left text-inherit cursor-help focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={label}
          title={label}
        >
          <TeamBadge team={row.team} size="sm" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs sm:hidden">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function Row({ row, rank }: { row: GroupTable["rows"][number]; rank: number }) {
  const teamLabel = row.team.placeholder ?? row.team.name;
  const automaticQualifier = rank <= 2;
  const thirdPlaceCandidate = rank === 3;
  return (
    <div
      className={cn(
        "grid grid-cols-[1.4rem_1fr_repeat(8,2rem)] items-center gap-x-1 px-3 py-2 text-sm border-b border-border/60 last:border-b-0",
        automaticQualifier && "bg-paper-deep/40",
        thirdPlaceCandidate && "bg-paper-deep/20",
      )}
      aria-label={
        automaticQualifier
          ? `${teamLabel} is in an automatic qualifying position`
          : thirdPlaceCandidate
            ? `${teamLabel} is in the third-place ranking pool`
            : undefined
      }
    >
      <span
        className={cn(
          "font-mono text-xs tabular-nums",
          automaticQualifier && "text-pitch font-semibold",
          thirdPlaceCandidate && "text-ink font-semibold",
          !automaticQualifier && !thirdPlaceCandidate && "text-ink-soft",
        )}
      >
        {rank}
      </span>
      <TeamTooltipCell row={row} />
      {COLS.map((c) => (
        <span
          key={c.key}
          className={cn(
            "text-center tabular-nums",
            c.key === "pts" && "font-semibold",
            c.key === "gd" && row.gd > 0 && "text-pitch",
            c.key === "gd" && row.gd < 0 && "text-terracotta",
          )}
        >
          {c.key === "gd" && row.gd > 0 ? `+${row.gd}` : row[c.key]}
        </span>
      ))}
    </div>
  );
}

export function GroupsView({ groups }: { groups: GroupTable[] }) {
  if (groups.length === 0) {
    return <p className="text-ink-soft italic">Group data not available yet.</p>;
  }
  return (
    <TooltipProvider delayDuration={120}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((g) => (
          <section
            key={g.group}
            className="rounded-xl border border-border bg-card overflow-hidden"
          >
            <header className="flex flex-col gap-0.5 px-3 py-2.5 border-b border-border bg-paper-deep/30 sm:flex-row sm:items-baseline sm:justify-between">
              <h3 className="font-display text-lg font-semibold">Group {g.group}</h3>
              <span className="max-w-56 text-[11px] uppercase leading-snug tracking-wider text-ink-soft sm:text-right">
                Top 2 qualify; best 8 third-place teams advance
              </span>
            </header>
            <StatHeader />
            <div>
              {g.rows.map((r, i) => (
                <Row key={r.team.id} row={r} rank={i + 1} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </TooltipProvider>
  );
}
