import type { GroupTable, StandingRow } from "@/lib/worldcup-types";
import { TeamBadge } from "./TeamBadge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const COLS: {
  key: keyof Pick<StandingRow, "mp" | "w" | "d" | "l" | "gf" | "ga" | "gd" | "pts">;
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

type GroupEntry = {
  group: string;
  rank: number;
  row: GroupTable["rows"][number];
};

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

  const automaticQualifiers = groups.flatMap((group) =>
    group.rows.slice(0, 2).map((row, index) => ({ group: group.group, rank: index + 1, row })),
  );
  const thirdPlaceRows = rankThirdPlaceTeams(groups);

  return (
    <TooltipProvider delayDuration={120}>
      <div className="space-y-6">
        <header className="border-b border-border pb-4">
          <p className="text-xs uppercase tracking-[0.2em] text-terracotta font-semibold">
            Group Stage Archive
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight mt-1">
            How the knockout field was set
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">
            Groups are now context: final tables, automatic qualifiers, and the third-place pool.
          </p>
        </header>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <QualifiedSummary entries={automaticQualifiers} />
          <ThirdPlaceRanking entries={thirdPlaceRows} />
        </section>

        <section>
          <header className="mb-3 flex flex-wrap items-end justify-between gap-2 border-b border-border pb-2">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-terracotta font-semibold">
                Final tables
              </p>
              <h3 className="font-display text-xl font-semibold">Groups A-L</h3>
            </div>
            <p className="max-w-md text-xs text-ink-soft sm:text-right">
              Top 2 qualify automatically; best 8 third-place teams advance.
            </p>
          </header>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {groups.map((g) => (
              <GroupTableCard key={g.group} group={g} />
            ))}
          </div>
        </section>
      </div>
    </TooltipProvider>
  );
}

function QualifiedSummary({ entries }: { entries: GroupEntry[] }) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <header className="border-b border-border bg-paper-deep/30 px-3 py-2.5">
        <p className="text-[11px] uppercase tracking-wider text-terracotta font-semibold">
          Qualified from groups
        </p>
        <h3 className="font-display text-lg font-semibold">Automatic places</h3>
      </header>
      <div className="grid gap-0 divide-y divide-border/60 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-3">
        {chunkByGroup(entries).map((pair) => (
          <div key={pair[0]?.group} className="px-3 py-2.5">
            <p className="mb-2 text-[11px] uppercase tracking-wider text-ink-soft font-semibold">
              Group {pair[0]?.group}
            </p>
            <div className="space-y-2">
              {pair.map((entry) => (
                <SummaryTeam key={`${entry.group}-${entry.row.team.id}`} entry={entry} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ThirdPlaceRanking({ entries }: { entries: GroupEntry[] }) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <header className="border-b border-border bg-paper-deep/30 px-3 py-2.5">
        <p className="text-[11px] uppercase tracking-wider text-terracotta font-semibold">
          Best third-place teams
        </p>
        <h3 className="font-display text-lg font-semibold">Third-place pool</h3>
      </header>
      <div className="divide-y divide-border/60">
        {entries.map((entry, index) => (
          <div
            key={`${entry.group}-${entry.row.team.id}`}
            className={cn(
              "grid grid-cols-[1.5rem_minmax(0,1fr)_4.75rem] items-center gap-2 px-3 py-2.5 text-sm sm:grid-cols-[1.5rem_minmax(0,1fr)_6rem]",
              index < 8 && "bg-paper-deep/30",
            )}
          >
            <span
              className={cn(
                "font-mono text-sm tabular-nums",
                index < 8 ? "text-pitch font-semibold" : "text-ink-soft",
              )}
            >
              {index + 1}
            </span>
            <div className="min-w-0">
              <TeamBadge team={entry.row.team} size="sm" />
              <p className="mt-0.5 truncate pl-9 text-[11px] text-ink-soft">
                Group {entry.group} · 3rd
              </p>
            </div>
            <div className="shrink-0 text-right tabular-nums">
              <p className="text-base font-semibold leading-tight">{entry.row.pts} pts</p>
              <p className="text-xs text-ink-soft">
                GD {entry.row.gd > 0 ? `+${entry.row.gd}` : entry.row.gd}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SummaryTeam({ entry }: { entry: GroupEntry }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <div className="min-w-0">
        <TeamBadge team={entry.row.team} size="sm" />
      </div>
      <span className="shrink-0 rounded-full bg-paper-deep px-2 py-0.5 text-[11px] text-ink-soft">
        {entry.rank === 1 ? "1st" : "2nd"}
      </span>
    </div>
  );
}

function GroupTableCard({ group }: { group: GroupTable }) {
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <header className="flex flex-col gap-0.5 px-3 py-2.5 border-b border-border bg-paper-deep/30 sm:flex-row sm:items-baseline sm:justify-between">
        <h3 className="font-display text-lg font-semibold">Group {group.group}</h3>
        <span className="max-w-56 text-[11px] uppercase leading-snug tracking-wider text-ink-soft sm:text-right">
          Top 2 plus third-place pool
        </span>
      </header>
      <StatHeader />
      <div>
        {group.rows.map((r, i) => (
          <Row key={r.team.id} row={r} rank={i + 1} />
        ))}
      </div>
    </section>
  );
}

function rankThirdPlaceTeams(groups: GroupTable[]): GroupEntry[] {
  return groups
    .flatMap((group) => {
      const row = group.rows[2];
      return row ? [{ group: group.group, rank: 3, row }] : [];
    })
    .sort(compareGroupEntries);
}

function compareGroupEntries(a: GroupEntry, b: GroupEntry): number {
  return (
    b.row.pts - a.row.pts ||
    b.row.gd - a.row.gd ||
    b.row.gf - a.row.gf ||
    a.row.team.name.localeCompare(b.row.team.name)
  );
}

function chunkByGroup(entries: GroupEntry[]): GroupEntry[][] {
  const chunks: GroupEntry[][] = [];
  for (let index = 0; index < entries.length; index += 2) {
    chunks.push(entries.slice(index, index + 2));
  }
  return chunks;
}
