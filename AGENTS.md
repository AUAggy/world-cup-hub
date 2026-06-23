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

- bracket-first tournament view,
- groups A through L,
- all matches,
- live/recent/next match strip,
- optional Crowd Forecast tab using public Polymarket tournament and match market data.

Official football data and market data must stay visually and technically separate. The forecast layer is educational context only, not betting or financial advice.

## Key Files

| Path | Role |
| --- | --- |
| `src/routes/index.tsx` | Main dashboard route, tabs, metadata, footer |
| `src/components/wc/CrowdForecastView.tsx` | Crowd Forecast UI |
| `src/components/wc/MatchesView.tsx` | All matches view |
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
