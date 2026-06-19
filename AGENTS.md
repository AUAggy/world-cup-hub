# World Cup Hub Agent Handoff

## Deployed

`https://world-cup-hub.hello-cloudflare-432.workers.dev`

Stack: TanStack Start, React 19, Vite 8, TypeScript, Tailwind CSS 4, Bun, Cloudflare Workers.

## First Actions in a New Session

1. `git status --short` — confirm clean working tree on `main`.
2. `bun install --frozen-lockfile && bun run verify && bun audit` — all must pass.
3. Read `plans/world-cup-dashboard-hardening-and-cloudflare.md` for completed phase details.
4. If resuming the Crowd Forecast work, switch to `feat/crowd-forecast-layer` and read `plans/crowd-forecast-enhancement-prd.md`.
5. For the next Crowd Forecast UI pass, read `plans/crowd-forecast-ui-ux-quick-wins.md`.

## Verification

```sh
bun install --frozen-lockfile
bun run verify    # typecheck + lint + 46 tests + build
bun audit         # must be clean
```

## Deploy

```sh
./scripts/deploy.sh            # default environment
./scripts/deploy.sh production # production
```

Pipeline: verify → build → `scripts/inject-headers.mjs` (injects CSP + CF cache wrapper) → `wrangler deploy`.

Rollback: `wrangler rollback --env production`

## Key Architecture

| Path                                | Role                                          |
| ----------------------------------- | --------------------------------------------- |
| `src/lib/worldcup/espn-fetch.ts`    | ESPN HTTP with timeout, retry, User-Agent     |
| `src/lib/worldcup/espn-schema.ts`   | Runtime ESPN response validation              |
| `src/lib/worldcup/transform.ts`     | Raw ESPN → typed Match/Team (pure)            |
| `src/lib/worldcup/standings.ts`     | Group standings computation (pure)            |
| `src/lib/worldcup/snapshot.ts`      | Snapshot assembly, TTL constants              |
| `src/lib/worldcup/cache.ts`         | In-isolate module-memory cache helpers        |
| `src/lib/worldcup/server-fn.ts`     | TanStack server function + miss coalescing    |
| `src/lib/worldcup-types.ts`         | Shared DTOs                                   |
| `src/start.ts`                      | TanStack middleware (error handling)          |
| `src/routes/index.tsx`              | Dashboard UI, client polling                  |
| `src/routes/__root.tsx`             | Root metadata, error boundary                 |
| `scripts/inject-headers.mjs`        | Post-build: CSP + CF cache wrapper injection  |
| `scripts/deploy.sh`                 | Full deploy pipeline                          |
| `wrangler.jsonc`                    | Worker config (preview + production)          |
| `vite.config.ts`                    | Build plugins (default tanstackStart entry)   |

## Active Feature Work

Branch: `feat/crowd-forecast-layer`

Goal: add an optional `Crowd Forecast` layer to the existing dashboard without changing the bracket-first default experience. Market data should be lazy-loaded, clearly separated from football standings, and framed as public market signal for education and curiosity only.

Implementation checkpoints:

```
checkpoint/crowd-forecast-0 — PRD + handoff + baseline lint fix
checkpoint/crowd-forecast-1 — Market DTOs, provider fetch, validation, cache, server function
checkpoint/crowd-forecast-2 — Crowd Forecast tab UI, lazy query, degraded states
checkpoint/crowd-forecast-3 — Tests, CSP/header updates, final verification
```

Current status:

- `checkpoint/crowd-forecast-0` committed as `8ceea9f`.
- `checkpoint/crowd-forecast-1` committed as `aafea49`: added forecast DTOs, provider fetchers, schema parsing, normalization, transform logic, server function, cache, and 11 forecast tests.
- `checkpoint/crowd-forecast-2` committed as `368631c`: added the `Crowd Forecast` tab, lazy TanStack Query fetch, compact source status strip, tournament pulse, movers, group forecast cards, degraded states, and responsive tab overflow.
- `checkpoint/crowd-forecast-3` committed as `0511ddc`: added TanStack CSRF middleware for server functions, confirmed the local dev server returns `HTTP 200`, confirmed the CSRF warning is gone, and reran `bun run verify` successfully with 57 tests. `bun audit` was attempted with network approval but hung for more than 60 seconds and was stopped.
- Follow-up design correction committed as `5d69d3f`: `Crowd Forecast` now has a reading guide, tooltip-backed metric labels, calmer 24h movement list, blue tournament bars, green match bars, and color-coded opponent pills for open and settled markets. `bun run verify` passes with 57 tests. Local dev server restarted cleanly after a stale TanStack server-function ID during HMR and returns `HTTP 200`.
- Follow-up clarity fix committed as `a4e10d0`: matchup pills now read as `vs Opponent 31%`, and the guide explains that percentages are from the row team's viewpoint.

Next planned UI pass:

- Read `plans/crowd-forecast-ui-ux-quick-wins.md`.
- Start with Phase 1: visible copy changes only. Replace abstract `Signal` language with `Chance`, change `N/A` display text to `No market`, add the one-line page summary, add a blue/green legend above group cards, and add a `Why different?` tooltip.
- Then consider Phase 2: `Today's simplest read` and `Most uncertain matches`, using the existing forecast snapshot without new upstream requests.

## Key Decisions

- **Default entry only**: `server.entry` in `tanstackStart()` creates a circular dependency with `@tanstack/react-start/server-entry` on Workers. Use the default entry with post-build header injection instead.
- **ESPN data is untrusted**: validated at the boundary, malformed events silently dropped, failed refresh never replaces last-known-good cache.
- **No KV/D1/DO/Queues**: only Cache API + HTTP cache headers + request coalescing.
- **No secrets in VITE\_\***: all env access is server-side only.

## Checkpoints

```
checkpoint/phase-1 — Local baseline, verification scripts
checkpoint/phase-2 — Lovable removal, UI cleanup, 69→28 deps
checkpoint/phase-3 — Compatible dep updates, audit clean
checkpoint/phase-4 — Defensive data boundary, 46 tests
checkpoint/phase-5 — CF Cache API + request coalescing
checkpoint/phase-6 — Security headers + threat model
checkpoint/phase-7 — Wrangler config + deploy script
checkpoint/phase-8 — Incident runbook + observability + branding + deployed
```

Merge: `--no-ff`. Rollback: revert the merge commit.

## Known

- No Playwright browser tests.
- Major dep updates deferred to 2026-07-14 (see `docs/phase-3-dependency-updates.md`).
