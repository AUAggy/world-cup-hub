# World Cup Hub

World Cup Hub is an unofficial 2026 FIFA World Cup dashboard. It shows the bracket, groups, fixtures, live match status, and an optional Crowd Forecast layer that summarizes public market expectations.

The default view stays bracket-first. Market data is lazy-loaded, separated from official results, and shown for context only.

## What it does

- Shows the knockout bracket, groups A through L, and every match.
- Highlights live, recent, and upcoming matches.
- Computes group tables from parsed match data.
- Pulls official match data from ESPN's public scoreboard feed.
- Adds an optional Crowd Forecast tab using public Polymarket market data.
- Shows close-match reads, tournament market leaders, 24h movement, and group-level market context.
- Validates external data before it enters the app model.
- Falls back to last-known-good data when an upstream source fails or rate-limits.
- Runs as a TanStack Start app on Cloudflare Workers.

## Data model

Official football data and market data are kept separate.

```text
ESPN feed -> validation -> match model -> standings/bracket UI
Polymarket tournament + match markets -> validation -> forecast snapshot -> Crowd Forecast UI
```

The app does not create its own prediction model. Forecast percentages are public market signals from upstream providers.

## Caching and failure behavior

- World Cup match data refreshes every 30 minutes.
- Forecast data loads only when the Crowd Forecast tab is opened.
- Forecast data refreshes every 5 minutes while that tab is active.
- Match-market coverage depends on which World Cup markets Polymarket currently lists.
- Failed refreshes do not replace known-good data with empty data.

## Stack

- TanStack Start
- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- Bun
- Cloudflare Workers

## Development

```sh
bun install --frozen-lockfile
bun run dev
```

## Verification

```sh
bun run verify
bun audit
```

`bun run verify` runs type checking, linting, tests, and a production build.

## Deploy

```sh
./scripts/deploy.sh
./scripts/deploy.sh production
```

The deploy script runs verification, builds the app, injects production headers, and deploys with Wrangler.

## Status

Unofficial fan project. Not affiliated with FIFA, ESPN, or Polymarket. Nothing here is betting, trading, financial, or investment advice.
