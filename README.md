# World Cup Hub

Unofficial FIFA World Cup 2026 dashboard built with TanStack Start, React, TypeScript, Tailwind CSS, Bun, and Cloudflare Workers.

## Features

- Bracket-first tournament view
- Group tables and match listings
- Defensive ESPN scoreboard parsing
- In-isolate server cache
- Cloudflare Workers deployment target

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

## Notes

This is an unofficial fan project and is not affiliated with FIFA or ESPN. Data comes from ESPN's public scoreboard feed.
