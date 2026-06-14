# World Cup Hub

World Cup Hub is an unofficial FIFA World Cup 2026 dashboard built for people who want the tournament shape at a glance: bracket, group tables, match list, live status, and source freshness in one place.

The project started as a small fan dashboard and became a deployment-hardening exercise. The constraint was simple: make it useful, cheap to run, defensive against messy upstream data, and easy to recover when something breaks.

## User story

A visitor should be able to open the site on a phone during the tournament and answer three questions without hunting through a news site:

1. What is the next match?
2. What do the groups look like?
3. How does the bracket connect from here?

The page favors a bracket-first layout because most tournament pages bury the shape of the competition behind filters, ads, or match-by-match pages. Groups and fixtures are still first-class views, but the main job is orientation.

## What it does

- Shows the knockout bracket, groups A through L, and every match.
- Pulls from ESPN's public scoreboard feed.
- Validates external data before it enters the app model.
- Drops malformed events instead of crashing the page.
- Computes group tables from parsed match data.
- Keeps date rendering stable across server rendering, browser hydration, and cached HTML.
- Runs as a TanStack Start app on Cloudflare Workers.

## Why this shape

This app is read-only and public. It does not need accounts, user data, payments, databases, admin panels, or background jobs. The architecture follows that reality.

The core data path is deliberately small:

```text
ESPN feed -> runtime validation -> typed match model -> snapshot -> React UI
```

Most of the code is plain TypeScript. Network access is isolated at the ESPN boundary. Transformation and standings logic are pure functions. The UI receives already-shaped data and stays focused on presentation.

## Decisions that matter

### Treat upstream data as untrusted

The ESPN feed is useful, but the app does not assume it is stable. Raw payloads are checked at the boundary. Unknown fields are ignored. Events without the minimum fields needed for a match are skipped.

A failed refresh does not replace a known-good snapshot with an empty shell. That matters during an upstream outage, schema drift, rate limiting, or a partial response.

### Keep caching simple

The app uses in-isolate memory caching for repeated server function calls. Production deployment is designed for Cloudflare's edge model, where cheap caching and short-lived compute are a better fit than a database-backed service.

The freshness policy is intentionally boring: tournament data is cached for 30 minutes. That is frequent enough for a fan dashboard before live play becomes critical, and slow enough to avoid hammering the upstream feed.

### Avoid services the app does not need

No KV. No D1. No Durable Objects. No Queues. No custom origin server.

Those tools are useful when the product needs persistence, coordination, scheduled work, or durable state. This project does not. Avoiding them keeps cost, failure modes, and operational work low.

### Prefer deterministic rendering

The app originally hit a React hydration mismatch after HTML caching was added. The fix was to remove local-time and relative-time text from server-rendered output and use deterministic UTC formatting for visible timestamps.

That is a small example of the broader approach: fix the class of bug, not the symptom.

## What was left out

- User accounts: there is no user-specific state.
- Betting, odds, comments, or social features: they add risk and noise without helping the core use case.
- Persistent storage: the dashboard can be rebuilt from the upstream feed.
- Heavy observability vendors: Cloudflare logs and response metadata are enough for this size of app.
- A backend API service: TanStack Start server functions cover the small amount of server-side work needed here.

## Cost profile

The app is designed to be cheap to operate.

Cloudflare Workers handle the server runtime. Static assets are fingerprinted and served from the edge. The data model is small. Caching reduces repeated upstream requests. There is no database bill, queue bill, object storage bill, or always-on server.

For a portfolio project or small public utility, that matters. A resilient app is easier to keep online when its normal operating cost is close to zero.

## Agentic build process

This repo was built with an AI coding agent under human direction. The agent did the repetitive work: code inspection, refactors, verification runs, deployment checks, and production debugging. Human review set the constraints and made the tradeoffs.

The useful pattern was not "let the agent build everything." The useful pattern was narrower:

- define the success criteria,
- keep changes small,
- run the verification loop often,
- inspect production behavior,
- remove code that did not earn its place.

That workflow caught real issues, including Cloudflare cache behavior and React hydration drift after cached SSR responses.

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

`bun run verify` runs type checking, linting, and a production build.

## Status

This is an unofficial fan project. It is not affiliated with FIFA or ESPN. Data comes from ESPN's public scoreboard feed.
