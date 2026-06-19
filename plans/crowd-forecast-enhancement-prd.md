# PRD: Crowd Forecast Layer for World Cup Hub

## Problem Statement

World Cup Hub is a clean fan dashboard for the 2026 FIFA World Cup. It answers the basic fan questions first: what is next, how the groups stand, and how the bracket connects.

Odds Odds Oh answers a different question: what public prediction markets currently think about the tournament. It tracks Polymarket tournament futures and Kalshi group-stage match markets, with source status and fallback behavior.

Both products work on their own. Combined carelessly, they would make the main dashboard feel like a betting product. That would hurt the larger audience: fans and casual observers who only want results, groups, fixtures, and the bracket.

The opportunity is to bring the useful market signal into World Cup Hub without making it noisy. The market data should feel like a quiet layer of curiosity, not the center of the app.

## Solution

Add an optional **Crowd Forecast** layer to World Cup Hub.

The default experience stays the same:

1. Bracket first.
2. Groups second.
3. Every match third.

Add a fourth tab:

4. Crowd Forecast.

The Crowd Forecast tab shows live public market signals from Polymarket and Kalshi in the same visual language as the current dashboard: warm paper, ink type, terracotta accent, compact cards, readable tables, and no decorative market-site styling.

The main dashboard may show small forecast hints only where they add context. These hints must never dominate match cards, group tables, or the bracket. A novice should be able to land on the site and ignore the forecast layer without feeling that they missed the point.

Product language should avoid betting-first framing. Use:

- Crowd Forecast
- Public market signal
- Market pulse
- Crowd leans
- Movement
- Last confirmed

Avoid:

- Bet now
- Wager
- Lock
- Sharp money
- Guaranteed
- Picks
- Free money

Odds Odds Oh can remain as a sub-brand or source note:

> Crowd Forecast by Odds Odds Oh. Live public market data from Polymarket and Kalshi. For education and curiosity only.

## Product Goals

- Preserve the current World Cup Hub first impression.
- Make market data optional, readable, and educational.
- Keep betting language out of the main dashboard.
- Use the existing visual system instead of importing the Odds Odds Oh style.
- Load fast on mobile.
- Avoid blank desktop or mobile states.
- Keep source health visible without turning errors into page-level failures.
- Reuse the hardening approach already present in this repo: typed data, validation, cache, last-known-good behavior, bounded upstream requests, and clear fallback states.

## Non-Goals

- Do not turn World Cup Hub into a betting app.
- Do not add user accounts, watchlists, alerts, comments, affiliate links, or trading links.
- Do not add paid APIs or secrets for the first version.
- Do not invent probabilities that are not available from public sources.
- Do not blend tournament futures, match markets, and settled results into one unexplained number.
- Do not replace the bracket-first home experience.

## Audience

### Primary Audience

Fans who want a fast, clear World Cup dashboard on mobile or desktop.

They want:

- next match
- latest result
- groups
- bracket
- every fixture

They may not care about markets.

### Secondary Audience

Curious observers who want to know what public markets imply.

They want:

- which teams are favored to win the tournament
- which teams moved recently
- which group-stage matches have a clear market lean
- where Polymarket and Kalshi disagree
- whether the data is live, delayed, or unavailable

### Product Principle

The casual fan should never have to understand prediction markets to use the app. The curious fan should be able to learn from the forecast layer without leaving the app.

## User Stories

1. As a casual fan, I want the homepage to open on the bracket, so that I can understand the tournament shape immediately.

2. As a casual fan, I want groups and matches to remain easy to scan, so that market data does not slow me down.

3. As a curious fan, I want a Crowd Forecast tab, so that I can see what public markets currently imply.

4. As a curious fan, I want Polymarket tournament futures separated from Kalshi match signals, so that I do not confuse different market types.

5. As a mobile visitor, I want the forecast page to fit the screen without large empty areas, so that the app feels useful during quick checks.

6. As a visitor who does not follow betting markets, I want plain labels and short explanations, so that I can understand the numbers without learning exchange terminology.

7. As a visitor during an upstream outage, I want to know whether data is live, delayed, or unavailable, so that I can trust what the page is showing.

8. As the app owner, I want market fetching isolated behind server functions and cache, so that third-party APIs cannot slow down the core dashboard.

9. As the app owner, I want the feature to avoid secrets and paid services in the first version, so that deployment remains cheap and simple.

10. As the app owner, I want tests around parsing, merging, source status, and UI fallback states, so that market changes do not break the public page.

## User Experience

### Navigation

Add **Crowd Forecast** as the fourth tab after **All matches**.

Default selected tab remains **Bracket**.

The tab order should be:

1. Bracket
2. Groups
3. All matches
4. Crowd Forecast

On narrow screens, the tab list should scroll horizontally or wrap cleanly. Text must not squeeze or overlap.

### Header

Keep the existing header copy focused on the tournament:

> An unofficial fan dashboard. Bracket first, then groups, then every match. No betting, no noise.

Do not mention markets in the main header.

If the forecast feature is present, add a small non-dominant note in the data strip or footer:

> Crowd Forecast available for public market signals.

### Crowd Forecast Tab

The forecast tab should answer four questions:

1. Who does the public market think can win the tournament?
2. Which teams moved recently?
3. What do Kalshi group-stage match markets say about upcoming games?
4. Is the data live, delayed, or unavailable?

Recommended sections:

#### Source Status Strip

Compact source cards:

- Polymarket: live, cached, or error
- Kalshi: live, cached, or error
- Last updated
- Next refresh window

Use quiet styling. Degraded states should be visible but not alarming unless both sources are unavailable.

#### Tournament Pulse

A compact ranked list of the top tournament futures from Polymarket.

Fields:

- team
- group
- tournament win signal
- 24h movement
- 24h volume, if available

Keep the table short on first view. Show the top 12 by default. Provide a simple "show all teams" control if needed.

#### Movers

Show teams with meaningful 24h movement.

Default threshold:

- absolute movement greater than 0.5 percentage points

If no teams moved, show a compact empty state:

> No major movement in the last 24 hours.

#### Group Forecast

A 12-group grid similar in density to the current Groups view.

Each group card should show four teams and small forecast measures:

- tournament win signal from Polymarket
- average group-stage match signal from Kalshi, when available
- upcoming opponent chips
- settled result chips for completed markets

Do not rank teams by market signal in a way that looks like official standings. Official group standings remain in the Groups tab. The forecast card should be clearly labeled as public market signal.

#### Explainer Drawer

Use a small expandable explainer, not a large tutorial block.

Suggested copy:

> These numbers come from public prediction markets. They are not official standings, betting advice, or a model from this site. A tournament future and a match market answer different questions, so they are shown separately.

### Optional Inline Hints

After the forecast tab works, add small hints to existing match cards and group cards only if they stay quiet.

Examples:

- `Crowd leans: Brazil 62%`
- `Market pulse: +4ppt`
- `Forecast: unavailable`

Rules:

- No hint on every card by default if it creates visual clutter.
- No hint should change row height unpredictably.
- No tooltip should be required to understand the main football data.
- Hints should disappear cleanly when market data is unavailable.

## Visual Direction

The feature should use the current World Cup Hub style, not the Odds Odds Oh style.

Keep:

- Fraunces display type
- current sans stack
- paper background
- ink text
- terracotta accent
- pitch green for positive football states
- compact cards
- thin borders
- restrained shadows
- small uppercase metadata labels

Avoid:

- purple gradients
- heavy market-site colors
- large hero sections
- decorative blobs or orbs
- oversized empty panels
- nested cards
- dense betting tables
- all-caps hype

Forecast UI should look like a natural fourth view of the existing app.

## Content Rules

Use plain language.

Preferred labels:

- Crowd Forecast
- Public market signal
- Tournament signal
- Match signal
- Movement
- Last confirmed
- Delayed
- Unavailable

Required disclaimer near the forecast content:

> For education and curiosity only. This is not betting, trading, financial, or investment advice.

Footer language should also state:

> Unofficial fan site. Not affiliated with FIFA, ESPN, Polymarket, or Kalshi.

Do not use language that encourages trading or betting.

## Data Sources

### Existing World Cup Data

Continue using the current ESPN scoreboard path:

```text
ESPN feed -> validation -> typed match model -> snapshot -> dashboard UI
```

The current dashboard data should remain independent from market data. A market failure must not break the bracket, groups, or matches.

### Polymarket

Use public Polymarket data for tournament winner markets.

Target data:

- team
- current implied probability
- volume
- 24h volume
- 24h movement
- 1w movement, if useful
- active or closed state

### Kalshi

Use public Kalshi market data for group-stage match markets.

Target data:

- match market ticker
- teams
- date
- side prices
- volume
- status
- settlement result, when available

### Name Normalization

Create one canonical team mapping shared by the forecast module.

Known mappings from Odds Odds Oh:

- United States -> USA
- Korea Republic -> South Korea
- IR Iran -> Iran
- DR Congo -> Congo DR
- Czech Republic -> Czechia
- Turkiye -> Turkey
- Bosnia -> Bosnia and Herzegovina
- Bosnia-Herzegovina -> Bosnia and Herzegovina
- Cote d'Ivoire -> Ivory Coast

The app should not assume third-party source names match ESPN names.

## Implementation Decisions

### Route and UI Shape

Build the first version as a fourth tab in the current dashboard. Keep the first route and first screen unchanged.

If shareable links become important, add a direct route or URL state for the forecast tab after the main feature works.

### Data Boundary

Add a separate market-data module cluster parallel to the existing worldcup module cluster.

The module should own:

- Polymarket fetch
- Kalshi fetch
- runtime validation
- normalization
- source status
- cache
- merge into forecast DTOs

The UI should receive shaped forecast data. It should not parse provider payloads.

### Server Function

Add a TanStack Start server function for market data.

Requirements:

- GET method
- no client-side secrets
- bounded timeout
- bounded retry
- source-specific status
- request coalescing where useful
- last-confirmed cache for source failures
- no module-scope async API work

### Fetch Timing

Do not fetch market data during the initial bracket view unless inline hints are enabled.

First version:

- load ESPN tournament data as today
- load market data only when the Crowd Forecast tab is selected
- keep market query stale time short enough for live curiosity, but not so short that public APIs are hammered

Recommended starting values:

- server cache: 2 minutes
- browser stale time: 5 minutes
- degraded Kalshi retry delay: 5 minutes after rate limit

These values can be tuned after observing source behavior.

### Failure Model

Market data must fail soft.

If Polymarket fails:

- use last confirmed Polymarket data if fresh enough
- mark source as delayed
- keep Kalshi data if available

If Kalshi fails:

- use last confirmed Kalshi data if fresh enough
- mark source as delayed
- keep Polymarket data if available

If both fail and no cache exists:

- show the Crowd Forecast tab with source error states and a compact empty state
- do not affect bracket, groups, or matches

### Cache

Start with in-isolate memory cache, matching the current repo's simple operating model.

Do not add KV, D1, Durable Objects, Queues, or cron in the first version unless production measurements show a real need.

If last-confirmed market data needs to survive isolate turnover, consider KV as a later phase. That decision should be documented before implementation.

### DTO Shape

Create a forecast response with stable plain DTOs.

Minimum shape:

- fetchedAt
- ttlSeconds
- sourceStatus
- teamForecasts
- groupForecasts
- topTournamentSignals
- movers

Each team forecast should separate:

- tournament signal
- match signal
- movement
- source availability
- provider-specific IDs only if needed for debugging

Do not expose raw provider payloads to React components.

## Performance Requirements

- First meaningful dashboard load should not wait on market APIs.
- Market fetches should be lazy until the Crowd Forecast tab is opened.
- Forecast tab should render useful skeleton or compact loading state without large blank areas.
- No source failure should cause a full-page error.
- Avoid adding heavy charting libraries for the first version.
- Use CSS and simple bars, chips, and tables before adding dependencies.
- Keep bundle growth small and justified.
- Preserve current production build behavior on Cloudflare Workers.
- Keep mobile layouts dense enough to avoid empty vertical space, but not so dense that labels wrap badly.

## Responsive Requirements

### Mobile

- Tabs remain tappable.
- Forecast cards stack in one column.
- Top tournament list shows only the most useful fields.
- Group forecast cards avoid horizontal scrolling when possible.
- Any table that must scroll uses clear edge spacing and does not clip team names.
- Source status uses short labels.

### Tablet

- Forecast sections use two columns where space allows.
- Group cards can use a two-column grid.

### Desktop

- Main content keeps the existing `max-w-7xl` rhythm.
- Forecast content uses three-column group grids where useful.
- Avoid wide empty panels.
- Avoid large blank hero areas.

## Accessibility Requirements

- Forecast tab and controls must be keyboard reachable.
- Use semantic tables where tabular data is shown.
- Use readable text contrast on paper backgrounds.
- Do not communicate movement by color alone.
- Add `aria-label` text for compact controls and ambiguous abbreviations.
- Tooltip content must not be the only way to understand core data.

## Security and Compliance Requirements

- No API keys in client bundles.
- No `VITE_*` secrets.
- No user accounts.
- No personal data collection.
- No outbound links that encourage a transaction in the first version.
- CSP must be updated only for required data sources.
- Logs must not include full provider payloads.
- Provider names and unofficial status must be clear.
- Add a short threat model update before deployment.

## Testing Decisions

Add focused tests around behavior, not implementation details.

### Unit Tests

Test:

- Polymarket payload validation
- Kalshi payload validation
- name normalization
- market parsing
- source status mapping
- cache fallback behavior
- merge behavior when one provider is missing
- movement threshold logic
- settled Kalshi result mapping

### Integration Tests

Test the server function with mocked provider responses:

- both sources live
- Polymarket live, Kalshi delayed
- Kalshi live, Polymarket delayed
- both sources unavailable with last-confirmed cache
- both sources unavailable with no cache
- malformed provider payload
- rate-limited Kalshi response

### UI Tests

Use existing component-level or route-level testing style if present.

Verify:

- default tab remains Bracket
- Crowd Forecast tab loads market data lazily
- source status appears correctly
- empty states are compact
- no market failure breaks existing dashboard views
- mobile layout does not overlap text or controls

### Manual Smoke Tests

Before deployment:

- desktop bracket view
- desktop Crowd Forecast
- mobile bracket view
- mobile Crowd Forecast
- degraded Polymarket state
- degraded Kalshi state
- no market data state
- production build
- Cloudflare preview

## Acceptance Criteria

- The homepage still opens on the bracket.
- Existing bracket, groups, and matches views remain usable without market data.
- Crowd Forecast appears as an optional fourth tab.
- Market data loads only when needed in the first version.
- Polymarket and Kalshi signals are labeled separately.
- Degraded source states are visible and compact.
- No betting CTA or trading link appears in the main UI.
- The feature uses the existing World Cup Hub palette and typography.
- The app remains mobile responsive with no overlapping controls.
- `bun run verify` passes.
- `bun audit` is clean.
- Production deployment uses the existing deploy pipeline.

## Rollout Plan

### Phase 1: Forecast Data Boundary

- Add provider fetch modules.
- Add validation and normalization.
- Add forecast DTOs.
- Add server function with cache and source status.
- Add tests for parsing, merging, and failure states.

### Phase 2: Crowd Forecast Tab

- Add fourth tab.
- Add source status strip.
- Add tournament pulse list.
- Add movers section.
- Add group forecast cards.
- Add compact disclaimer.
- Verify desktop and mobile layouts.

### Phase 3: Quiet Inline Hints

- Add optional match or team hints only where they improve comprehension.
- Keep hints hidden when source data is unavailable.
- Measure whether the main dashboard still feels clean.

### Phase 4: Domain and Funnel Decision

- Decide what happens to Odds Odds Oh as a standalone app.
- Options:
  - keep it as a separate deeper market wall chart
  - redirect it to the Crowd Forecast tab
  - use it as a sub-brand landing page that links into World Cup Hub

This decision should happen after the integrated forecast tab is usable.

## Open Questions

1. Should the Crowd Forecast tab be shareable by URL in the first version?
2. Should Odds Odds Oh stay public as a separate advanced view?
3. Should inline hints appear on match cards in version one, or wait until the tab proves useful?
4. What exact movement threshold should count as a mover?
5. Should the app ever link to Polymarket or Kalshi, or only name them as data sources?

## Further Notes

Richard Feynman's likely contribution would be editorial discipline: explain what the number means before showing more numbers.

For this feature, that means:

- show the football object first
- show the market signal second
- explain the source only when needed
- keep unlike numbers separate
- never pretend uncertainty is certainty

The finished feature should feel effortless because it removes choices from the visitor. Fans see the World Cup. Curious observers can open the forecast layer. Neither group has to carry the other's complexity.
