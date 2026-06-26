# World Cup Hub

World Cup Hub is an unofficial 2026 FIFA World Cup dashboard. It puts the live bracket, fixtures, results, and group-stage archive in one place, with a separate Crowd Forecast tab for public market context.

The app is bracket-first. During the knockout phase, the bracket becomes the main surface, matches become the live ledger, and Groups A-L move into a Group Stage Archive. Forecast data stays lazy-loaded and visually separate from official football results.

## What it does

- Shows the knockout bracket as the main tournament map.
- Highlights live, latest, and next-up matches.
- Adds knockout consequence copy such as `advance`, `win the Cup`, and `take third place` when official results support it.
- Provides match filters for all, live, upcoming, results, knockout, and group-stage matches.
- Preserves final group tables, automatic qualifiers, and the third-place ranking pool in a Group Stage Archive.
- Pulls official match data from ESPN's public scoreboard feed.
- Computes group tables from parsed match data.
- Adds an optional Crowd Forecast tab using public Polymarket tournament and match market data.
- Presents Crowd Forecast as fan-facing sections: Market read, Toss-ups, Cup chances, What changed, and Archived group forecast.
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
- Vite 8
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
