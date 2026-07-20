# World Cup Hub — Archive Implementation Guide

> Handoff document. A fresh session should be able to pick this up and
> execute top to bottom without prior context.
>
> Companion document (the "why"): `docs/archive-assessment.md`.
> Project conventions: `AGENTS.md`.

## Working Principles (Feynman Lenses)

Every step below is executed under the three lenses defined in
`AGENTS.md` → "Working Principles": **KISS** (simplest design that solves
the actual problem; delete before adding), **first principles** (reason
from data shapes, failure modes, and user needs — not ceremony), and
**clarity over ambiguity** (plain names, loud failures, decisions written
down). When a step offers two working designs, pick the one a new session
can understand in five minutes. Complexity must be justified by a stated
need; simplicity is the default.

## Goal

Convert the now-finished World Cup 2026 dashboard from a live-feed app into
a **permanent, self-explanatory archive** that serves as a portfolio piece:

1. Freeze final ESPN + Polymarket data into the repo; serve it statically.
2. Add a "Forecast vs. Reality" retrospective computed from the frozen data.
3. Record the experience (video + screenshots).
4. Write the architecture case study; revamp the README.
5. Settle the permanent URL; tag and archive the repo.

## Current state (verified facts)

- Stack: TanStack Start, React 19, Vite 8, TypeScript, Tailwind CSS 4, Bun,
  Cloudflare Workers. Package manager: `bun@1.2.x`.
- Official data path: `src/lib/worldcup/espn-fetch.ts` →
  `espn-schema.ts` (validation) → `transform.ts` → `snapshot.ts`
  (`assembleSnapshot`) → server function `getWorldCup` in
  `src/lib/worldcup/server-fn.ts`. DTO: `WorldCupSnapshot` in
  `src/lib/worldcup-types.ts` (contains `matches`, `groups`, `rounds`,
  `fetchedAt`, `source`, `ttlSeconds`). ESPN date ranges are hardcoded in
  `server-fn.ts` (`20260611-20260628`, `20260628-20260720`).
- Forecast data path: `src/lib/forecast/polymarket-fetch.ts` → `schema.ts` →
  `transform.ts` (`assembleForecastSnapshot`) → server function
  `getForecast` in `src/lib/forecast/server-fn.ts`. DTO: `ForecastSnapshot`
  in `src/lib/forecast-types.ts` (includes `TeamTournamentSignal`,
  `TeamMatchSignal`, `MarketMover`, source statuses).
- Caching is module-memory + Cloudflare durable cache (`cache.ts` in both
  lib dirs). Safe to ignore for the archive — frozen data bypasses it.
- Single route: `src/routes/index.tsx` (phase-aware tabs: Bracket, Matches,
  Group Stage Archive, Crowd Forecast).
- Verify: `bun run verify` (typecheck + lint + tests + build).
- Deploy: `./scripts/deploy.sh production` (verify → build →
  `scripts/inject-headers.mjs` → `wrangler deploy --env production`).
- `wrangler.jsonc`: custom domains `nawewe.xyz` + `www.nawewe.xyz`;
  `workers_dev: true` in the production env
  (`world-cup-hub.hello-cloudflare-432.workers.dev`).
- Risk: ESPN and/or Polymarket feeds may already be dead or degraded.
  Step 1 handles both cases.

---

## Step 1 — Freeze the data (the time capsule)

**Outcome:** committed JSON snapshots + a build mode that serves them with
zero upstream network calls.

### 1a. Capture final snapshots

Create `scripts/capture-snapshots.ts` (run via `bunx tsx
scripts/capture-snapshots.ts`). It should:

1. Import the existing pipeline pieces directly — `fetchEspnRange`,
   `eventsFromPayload`, `isValidEspnResponse`, `toMatches`,
   `assembleSnapshot` from `src/lib/worldcup/*`, and the Polymarket
   equivalents from `src/lib/forecast/*`. These modules are pure/fetch-only
   and do not depend on TanStack runtime, so they run fine under `tsx`.
   Avoid importing `server-fn.ts` (it pulls in `@tanstack/react-start`).
2. Write two files:
   - `src/data/frozen/worldcup-snapshot.json` — a `WorldCupSnapshot`
   - `src/data/frozen/forecast-snapshot.json` — a `ForecastSnapshot`
3. Wrap each in an envelope:
   `{ "capturedAt": "<ISO>", "note": "Final archive snapshot", "snapshot": ... }`
4. Failure rule (decided, do not re-litigate without cause):
   - ESPN snapshot comes back as `source: "fallback"` → **fatal**: do not
     write the worldcup file, exit 1. A frozen empty shell is worthless.
   - Both Polymarket fetches fail → **non-fatal**: still write the
     forecast file with `unavailable` statuses (an honest archive state),
     print a loud warning, exit 0. Never fabricate probabilities.

**If the feeds are already dead:** the final football results are historical
fact. Hand-author `worldcup-snapshot.json` (or patch a partial capture)
using a trusted record of the actual results, keep `source` honest
(e.g. `"manual-archive"` — add the literal to the type if needed), and let
the existing validators/tests confirm shape. For the forecast snapshot, if
Polymarket is unreachable, mark statuses `unavailable` and note in the UI
that the crowd read was not preserved; do **not** fabricate probabilities.

### 1b. Serve frozen data

Implemented design (decided, see commit history):

- `src/lib/archive-mode.ts` — client-safe module exporting `ARCHIVE_MODE`
  (baked at build time from `VITE_ARCHIVE_MODE`) and `ARCHIVE_CAPTURED_AT`
  for the footer note. No JSON imported here.
- `src/lib/frozen.ts` — server-only module importing both frozen envelopes
  and casting snapshots to the DTOs. The casts are backed by
  `tests/frozen/frozen-snapshots.test.ts` (the boundary check).
- Both server functions (`src/lib/worldcup/server-fn.ts`,
  `src/lib/forecast/server-fn.ts`) return the frozen snapshot before any
  fetch when `ARCHIVE_MODE` is on.
- `package.json`: `build:archive` = `VITE_ARCHIVE_MODE=1 vite build`.
  The deployed artifact IS the archive — no runtime config needed.
- Footer in `src/routes/index.tsx` shows a quiet "Final archive — data
  frozen as of …" note in archive mode only.
- `tests/frozen/frozen-snapshots.test.ts` asserts both frozen files are
  structurally sound (real ESPN source, 104 complete matches, all rounds
  populated, valid forecast statuses, probabilities in [0,1]) and that
  `ARCHIVE_CAPTURED_AT` matches the envelope.

### 1c. Deploy the archive

`ARCHIVE_MODE=1 ./scripts/deploy.sh production` — extend `deploy.sh` to pass
the flag through to the build step. Confirm the deployed site renders fully
with devtools network tab showing **no** ESPN/Polymarket requests.

---

## Step 2 — Forecast vs. Reality retrospective

**Outcome:** a static, computed retrospective artifact + a UI section
telling the story "what the crowd believed vs. what happened."

> **Implemented — text below records the final design.** The original plan
> (per-match crowd favorites, calibration buckets) was revised after a
> data audit: the 1a freeze held only *resolved* prices (Spain = 1.0, all
> others = 0.0) and zero match signals — vacuous for analysis. Price
> *history* was the rescue. Calibration was cut: not well-defined from
> winner-market daily prices, and we don't fake precision.

### 2a. Capture forecast price history

`scripts/capture-forecast-history.ts` (`bun run capture:forecast-history`):

1. Fetches the Polymarket tournament event for CLOB token IDs (the app
   schema drops them; the script parses the raw payload itself).
2. Fetches daily price history per team (`interval=max&fidelity=1440` —
   the CLOB rejects long explicit startTs/endTs ranges), filtered to the
   tournament window (2026-06-01 onward).
3. Freezes `src/data/frozen/forecast-history.json` (48/48 teams).
4. Failure rule: zero teams -> nothing written, exit 1. Partial coverage
   -> freeze + loud warning. Never fabricate.

### 2b. Build the retrospective offline

`src/lib/retrospective.ts` (pure logic) + `scripts/build-retrospective.ts`
(`bun run build:retrospective`) produce `src/data/frozen/retrospective.json`:

- **The champion's arc** — Spain's daily crowd read, match days annotated.
- **The read before each round** — crowd favorite vs. the champion's
  actual standing on the eve of every knockout round.
- **The Final** — eve-of-final read (Spain 59%, Argentina 41%) vs.
  Spain 1–0 Argentina (AET).
- **What changed** — biggest single-day swings, each joined to the result
  that caused it. Key data insight: daily prices are midnight-UTC
  snapshots, so a result lands in the read the day AFTER it is played;
  swings join to day-before matches.
- Footnote: the resolution movers from the 1a freeze.

Honest headline the data produced: the crowd backed France through the
entire knockout phase; France lost the semifinal.

### 2c. Render it

- `src/components/wc/RetrospectiveView.tsx` + a dedicated "Forecast vs.
  Reality" tab in `src/routes/index.tsx`. Static render of
  `retrospective.json` only — no runtime fetch, no recomputation.
- No chart library: bars/dots are divs + Tailwind. A dependency for one
  page fails the complexity test.
- Fan-facing language per `AGENTS.md`; educational-context disclaimer.
- Tests: `tests/retrospective/` (builder, synthetic) and
  `tests/frozen/frozen-retrospective.test.ts` (boundary checks on both
  frozen artifacts). Deployed with `ARCHIVE_MODE=1`.

---

## Step 4 — Record the experience

Do this **after** the archive deploy so the recording matches what visitors
will see permanently.

- Shot list (60–90s total): full bracket scroll, a knockout match card with
  consequence copy, `FULL TIME` states, Group Stage Archive tables +
  third-place pool, Crowd Forecast tab loading, Forecast vs. Reality tab.
- Tools (macOS): `Cmd-Shift-5` or Kap for capture; `ffmpeg` to trim and to
  make an optimized looping GIF (~10–15s, ≤ ~3MB) for the README.
- Store in `docs/media/` (`demo.mp4`, `demo.gif`, 3–4 PNG screenshots).
  Keep total media weight modest; the repo is the portfolio.

---

## Step 3 — Write the case study

**Outcome:** `docs/case-study.md` + a README that sells the work in 30
seconds.

### 3a. `docs/case-study.md` outline

1. The itch: a daily-use tool for the tournament, built agentically.
2. Architecture: fetch → validate → transform → snapshot → UI, twice over
   (ESPN, Polymarket), with the two streams kept technically and visually
   separate.
3. Untrusted-input discipline: boundary validation, dropping malformed
   records, never replacing known-good data with failed refreshes.
4. Degradation design: fallback shells, cached/last-confirmed states,
   lazy-loaded forecast layer.
5. Security/ops: no secrets in `VITE_*`, header injection
   (`scripts/inject-headers.mjs`), verify-before-deploy pipeline.
6. The agentic workflow: how the harness, tests (`bun run verify`), and
   conventions (`AGENTS.md`) made delivery fast without slop.
7. The retrospective findings (link the Forecast vs. Reality tab).
8. The archive decision itself — finishing a project on purpose (link
   `docs/archive-assessment.md`).

### 3b. README revamp

Hero screenshot, demo GIF, one-paragraph pitch, live archive URL, feature
list, architecture diagram (simple ASCII or PNG), links to the case study,
tech stack, and the "unofficial / not betting advice" disclaimers.

---

## Step 8 — Permanent URL, tag, archive

- **URL decision:** `wrangler.jsonc` already maps `nawewe.xyz` +
  `www.nawewe.xyz` to this worker. Decide and commit:
  - *Option A (default):* keep `nawewe.xyz` as the permanent archive home —
    this repo is the site. No config change.
  - *Option B:* move the archive to `worldcup.nawewe.xyz` and reclaim the
    apex for something else later. Update `wrangler.jsonc` routes and
    redeploy.
- Either way, keep `workers_dev: true` so
  `world-cup-hub.hello-cloudflare-432.workers.dev` stays live as a free
  fallback URL. Record the canonical URLs in the README.
- Final deploy: `ARCHIVE_MODE=1 ./scripts/deploy.sh production`.
- `git tag v1.0-final-tournament && git push --tags`.
- Archive the GitHub repo (Settings → Archive) once the README is final.
  Read-only, beautiful, done on purpose.

---

## TODO

- [x] **1a.** Write `scripts/capture-snapshots.ts`; capture final ESPN +
      Polymarket snapshots into `src/data/frozen/` (hand-author results if
      feeds are dead; never fabricate forecast data).
- [x] **1b.** Archive mode: `ARCHIVE_MODE=1` short-circuit in both
      server functions, `build:archive` script, frozen-data validation test.
- [x] **1b.** "Final archive — data frozen as of …" note in
      `src/routes/index.tsx` (archive mode only, quiet styling).
- [x] **1c.** Extend `scripts/deploy.sh` for `ARCHIVE_MODE`; deploy;
      verify zero upstream requests in devtools. *(Deployed
      2026-07-20, version c65dc778. SSR HTML confirmed: footer note +
      frozen match data live at nawewe.xyz. Server functions
      short-circuit before any fetch by construction; a manual devtools
      network-tab pass is still worth one minute of eyeballs.)*
- [x] **2a.** Write `scripts/build-retrospective.ts` →
      `src/data/frozen/retrospective.json` (+ types). *(Revised: became
      `capture-forecast-history.ts` + builder after the data audit.)*
- [x] **2b.** "Forecast vs. Reality" tab/section, fan-facing language,
      static render only.
- [x] **2c.** `bun run verify` green; redeploy archive. *(85 tests green,
      deployed f91c9318.)*
- [x] **4.** Record `demo.mp4` + optimized `demo.gif` + 3–4 screenshots
      into `docs/media/`. *(Automated: `scripts/record-demo.ts` +
      ffmpeg. 59s tour, 12s GIF at 2.6MB, five stills. Guide:
      `docs/recording-guide.md`.)*
- [x] **3.** Write `docs/case-study.md` per outline; revamp `README.md`
      (screenshot, GIF, URLs, disclaimers). *(clear-ink editorial pass;
      docs force-added to git so README links resolve on GitHub.)*
- [ ] **8.** Commit to URL decision (Option A or B); update `wrangler.jsonc`
      if B; final production deploy.
- [ ] **8.** `git tag v1.0-final-tournament`; push; archive the GitHub repo.
- [ ] Optional later: generic tournament-engine extraction
      (assessment option 5) — out of scope for this plan.
