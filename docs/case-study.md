# World Cup Hub: a build retrospective

How an unofficial 2026 FIFA World Cup dashboard was designed, shipped mid-tournament with an agentic workflow, and then deliberately frozen into a permanent archive. Written for whoever wants to know how the thing actually works, including the parts that went wrong.

**Live archive:** [nawewe.xyz](https://nawewe.xyz) · **Stack:** TanStack Start, React 19, TypeScript, Tailwind CSS 4, Bun, Cloudflare Workers

## The itch

I wanted one page to open every morning of the tournament: the bracket first, every match with its consequence, and a quiet side-channel showing what the crowd expected. Nothing on the internet was quite that page, so I built it over the course of the tournament and used it daily. It tracked 104 matches across 12 groups and six knockout rounds, ending with Spain 1–0 Argentina, after extra time, at MetLife Stadium.

The second goal was professional: prove that an agentic coding workflow, held to strict conventions, can produce a frontend people enjoy looking at and an architecture an engineer can audit. This document is the audit.

## Architecture: two pipelines, one rule

The app is two copies of the same small pipeline, plus a rule that they never mix.

```text
ESPN scoreboard feed      -> validate -> transform -> match snapshot     -> bracket, matches, groups UI
Polymarket public markets -> validate -> transform -> forecast snapshot  -> Crowd Forecast UI
```

Each pipeline does four things in order: fetch, validate at the boundary, transform into a plain data object, assemble a snapshot the UI renders directly. The rule is that official football data and market data stay separate in the model, the network layer, and the visual design. The Crowd Forecast tab loads lazily, only when opened, and carries its own typography and disclaimers.

The payoff of keeping the pipelines identical in shape is that every operational idea applies twice for the price of once: validation, caching, failure handling, and eventually the archive freeze.

## Untrusted input is a design input

ESPN and Polymarket are treated as hostile. Not because they are malicious, but because their payloads can change shape, arrive empty, or lie by omission on the day you can least afford it.

Three rules enforce this:

1. **Validate before use.** Raw payloads pass through `isValidEspnResponse` and `parsePolymarketEvent` before anything reads a field. Anything unparseable is dropped per record, so one malformed match cannot blank the bracket.
2. **Failed refreshes never overwrite good data.** If an ESPN refresh fails validation, the worker keeps serving the previous snapshot. If Polymarket fails, the forecast layer falls back to a last-confirmed payload held for 24 hours, labeled `cached` in the UI.
3. **Emptiness is not success.** An upstream response that validates but contains no matches is still a failure for archival purposes. The freeze tooling treats it as fatal rather than freezing a hollow shell.

These rules were written before the first deploy. They mattered most on the last day, when the tournament data stopped changing and the feeds started to decay.

## Degradation is part of the interface

Every data state has a designed rendering, and the UI says which state it is in. The forecast snapshot carries an explicit status per source: `live`, `cached`, or `unavailable`, each with fan-facing copy ("Match markets are delayed; showing last confirmed data."). A degraded forecast expires in 10 seconds so the app retries quickly; a healthy one lives for two minutes.

The world cup snapshot marks itself `source: "espn"` or `source: "fallback"`. The distinction became the backbone of the archive: only an honest `espn` snapshot was allowed into the freeze.

## Security and operations

There are no secrets in the client bundle because the app needs none: both feeds are public. Security headers and cache rules are injected into the built worker by `scripts/inject-headers.mjs`, so they cannot drift from the app code between deploys.

The deploy pipeline refuses to run on a broken tree. `scripts/deploy.sh` runs the full gate, typecheck, lint, 79 tests across 11 files, and a production build, before Wrangler sees anything. Dependency risk is pinned with a lockfile plus an explicit override where a transitive package needed one.

## The agentic workflow

The repo is built to be worked on by an agent without supervision theater. `AGENTS.md` states the conventions: UX rules, data rules, key files, verification commands. The tests are the harness: they define what the data shapes mean, so an agent can refactor boldly and still be wrong loudly instead of silently.

Two working principles were added during the archive phase, and they govern everything since: pick the simplest design that solves the actual problem, and reason from what is true, the data shapes, the failure modes, the user need, rather than from habit. Complexity has to argue for its existence in a commit message. Simplicity does not.

The honest ledger includes the mistakes. During one edit, a refactor corrupted a function body with garbage output; the type checker and tests caught it within minutes, and the fix was a clean rewrite of one function. The harness works precisely because it assumes the author, human or model, will eventually write nonsense.

## What the data said

The archive's centerpiece is the Forecast vs. Reality tab, and it nearly did not exist.

The first freeze captured the Polymarket tournament market exactly as it was on July 20: Spain at 100%, every other team at 0%, and no match markets at all. Perfectly valid data, perfectly useless for analysis, because the market had already resolved. The lesson cost an afternoon to accept: a snapshot of a prediction market taken after the event is not a prediction.

The rescue was price history. While the upstream API was still alive, a capture script pulled the daily price curve of the tournament-winner market for all 48 teams, June 1 through July 20. That curve is what the crowd actually believed over time, and it told a story nobody scripted:

- **The crowd backed France for the entire knockout phase.** France was the favorite on the eve of the Round of 32 (22%), Round of 16 (34%), quarterfinals (33%), and semifinals (39%). France lost the semifinal 0–2 to Spain. The single biggest one-day move of the tournament was France losing 39 points of crowd confidence overnight.
- **Spain was never the favorite until it almost didn't matter.** The eventual champions never ranked above second in the crowd read before any round, and only became the favorite on the eve of the final itself, at 59% against Argentina's 41%.
- **Argentina at 9% was the run nobody priced.** On June 1 the crowd gave the finalists less than a one-in-eleven chance.

One data subtlety is documented in the footer of the tab: daily prices are midnight-UTC snapshots, so a result lands in the crowd read the day after it is played. Every top swing is annotated with the match that caused it, joined on that rule. Without the join, the ten biggest moves all appeared to have no cause at all.

## Finishing on purpose

Live dashboards die quietly when their feeds die. The alternative chosen here was to end the project deliberately:

1. **Freeze.** Capture scripts run the exact production pipeline and write final snapshots into the repo as validated JSON. The failure rules are explicit: empty ESPN data is fatal, an unreachable Polymarket is frozen as honestly `unavailable`, and no number is ever fabricated.
2. **Serve the freeze.** A build-time flag bakes archive mode into the artifact. Both server functions return frozen data before any fetch, so the deployed worker makes zero upstream calls. The footer says when the data was frozen.
3. **Prove the freeze.** Boundary tests assert the frozen files are structurally sound: 104 complete matches, every round populated, probabilities within range, the displayed freeze date matching the envelope.
4. **Record the experience.** A Playwright script (`bun run record:demo`) tours the archive in a headless browser and produces the demo video and stills in `docs/media/`, so the record of the live UI cannot rot.

The result is a page that will render the 2026 World Cup correctly in ten years, a retrospective only this project can tell because it saved the crowd's memory before the market forgot, and a codebase whose last commit was a decision rather than an accident.

## Where to look

| Artifact | Path |
| --- | --- |
| Live archive | [nawewe.xyz](https://nawewe.xyz) |
| Data pipelines | `src/lib/worldcup/`, `src/lib/forecast/` |
| Freeze tooling | `scripts/capture-snapshots.ts`, `scripts/capture-forecast-history.ts` |
| Retrospective builder | `src/lib/retrospective.ts` |
| Frozen data | `src/data/frozen/` |
| Boundary tests | `tests/frozen/` |
| Archive decision log | `docs/archive-assessment.md`, `docs/archive-implementation-guide.md` |

Unofficial fan project. Not affiliated with FIFA, ESPN, or Polymarket. Forecast content is educational context, not betting, trading, financial, or investment advice.
