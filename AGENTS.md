# World Cup Hub Agent Notes

Deployed app: `https://world-cup-hub.hello-cloudflare-432.workers.dev`

Stack: TanStack Start, React 19, Vite 8, TypeScript, Tailwind CSS 4, Bun, Cloudflare Workers.

## Start Here

```sh
git status --short
bun install --frozen-lockfile
bun run verify
bun audit
```

`bun audit` can hang on network access. If it times out, note it explicitly.

## Current Scope

World Cup Hub is an unofficial 2026 FIFA World Cup dashboard with:

- knockout-first bracket view,
- live, latest, and next-up match desk,
- all-match ledger with filters for live, upcoming, results, knockout, and group-stage matches,
- Group Stage Archive for final tables, automatic qualifiers, and the third-place pool,
- optional Crowd Forecast tab using public Polymarket tournament and match market data.

Official football data and market data must stay visually and technically separate. The forecast layer is educational context only, not betting or financial advice.

## UX Rules

- The bracket is the primary knockout-phase surface.
- Groups A-L remain available as archive context, not the main event after group play.
- Match cards may show emotional football states such as `LIVE NOW`, `FULL TIME`, and `advance`, but avoid hype copy.
- Crowd Forecast should use fan-facing language: Market read, Toss-ups, Cup chances, What changed, Archived group forecast.
- Avoid finance-first labels in visible UI when a clearer fan label exists. Prefer `forecast`, `crowd read`, and `Cup chances` over repeated `markets`, `signals`, and `movement`.
- Keep data-source notes quiet. Do not give operational metadata prime match-card real estate.

## Key Files

| Path | Role |
| --- | --- |
| `src/routes/index.tsx` | Main dashboard route, phase-aware tabs, metadata, footer |
| `src/components/wc/BracketView.tsx` | Knockout bracket board |
| `src/components/wc/CrowdForecastView.tsx` | Crowd Forecast UI |
| `src/components/wc/GroupsView.tsx` | Group Stage Archive and final tables |
| `src/components/wc/MatchesView.tsx` | Match ledger and filters |
| `src/components/wc/MatchCard.tsx` | Match card states and knockout consequence copy |
| `src/lib/worldcup/*` | ESPN fetch, validation, transform, standings, snapshot, cache |
| `src/lib/forecast/*` | Polymarket fetch, validation, transform, cache |
| `src/lib/worldcup-types.ts` | Official football DTOs |
| `src/lib/forecast-types.ts` | Forecast DTOs |
| `src/start.ts` | TanStack middleware |
| `scripts/inject-headers.mjs` | Post-build security/cache header injection |
| `scripts/deploy.sh` | Verify, build, inject headers, deploy |
| `wrangler.jsonc` | Cloudflare Worker config |

## Data Rules

- Treat ESPN and Polymarket as untrusted inputs.
- Validate at the boundary.
- Drop malformed upstream records instead of crashing the page.
- Do not replace known-good data with empty data after a failed refresh.
- Keep market data lazy-loaded and separate from official standings.
- Do not put secrets in `VITE_*` variables.

## Verification

```sh
bun run verify
```

This runs typecheck, lint, tests, and production build.

## Deploy

```sh
./scripts/deploy.sh
./scripts/deploy.sh production
```

Rollback:

```sh
wrangler rollback --env production
```
