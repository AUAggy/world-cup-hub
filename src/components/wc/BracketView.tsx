import type { RoundSlug, WorldCupSnapshot } from "@/lib/worldcup-types";
import { MatchCard } from "./MatchCard";

const COLUMNS: { round: RoundSlug; label: string; sub: string }[] = [
  { round: "round-of-32", label: "Round of 32", sub: "16 matches" },
  { round: "round-of-16", label: "Round of 16", sub: "8 matches" },
  { round: "quarterfinals", label: "Quarter-finals", sub: "4 matches" },
  { round: "semifinals", label: "Semi-finals", sub: "2 matches" },
  { round: "final", label: "Final", sub: "Jul 19" },
];

export function BracketView({ snapshot }: { snapshot: WorldCupSnapshot }) {
  const third = snapshot.rounds["3rd-place-match"][0];

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto -mx-4 px-4 pb-3">
        <div className="flex gap-4 min-w-max">
          {COLUMNS.map((col) => {
            const matches = snapshot.rounds[col.round];
            return (
              <div key={col.round} className="w-[280px] shrink-0">
                <header className="mb-3 pb-2 border-b border-border">
                  <h3 className="font-display text-base font-semibold">{col.label}</h3>
                  <p className="text-xs text-ink-soft">{col.sub}</p>
                </header>
                <div
                  className="flex flex-col"
                  style={{
                    gap:
                      col.round === "final"
                        ? 0
                        : col.round === "semifinals"
                          ? "10rem"
                          : col.round === "quarterfinals"
                            ? "4.5rem"
                            : col.round === "round-of-16"
                              ? "1.75rem"
                              : "0.75rem",
                    paddingTop:
                      col.round === "semifinals"
                        ? "5rem"
                        : col.round === "quarterfinals"
                          ? "2rem"
                          : col.round === "round-of-16"
                            ? "0.75rem"
                            : 0,
                  }}
                >
                  {matches.length === 0 && (
                    <p className="text-sm text-ink-soft italic">No fixtures yet.</p>
                  )}
                  {matches.map((m) => (
                    <MatchCard key={m.id} match={m} compact />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {third && (
        <section className="rounded-xl border border-dashed border-border bg-paper-deep/40 p-4 max-w-md">
          <h3 className="font-display text-sm font-semibold mb-2 flex items-center gap-2">
            <span className="size-2 rounded-full bg-terracotta" /> Third-place play-off
          </h3>
          <MatchCard match={third} compact />
        </section>
      )}
    </div>
  );
}
