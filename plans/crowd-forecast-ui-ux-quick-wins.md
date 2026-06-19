# Crowd Forecast UI and UX Quick Wins

## Goal

Make the Crowd Forecast tab easier for a casual visitor to understand in the first 10 seconds.

The visitor should be able to answer:

1. What is this page showing?
2. Which teams does the market like?
3. Which matches look close?
4. Why do some fields say `No market`?
5. How is this different from official standings?

Keep the page calm. Do not add a new dashboard within the dashboard.

## Product Rule

Explain the object before the number.

Feynman test:

> If a smart novice cannot explain a label after reading it once, the label is wrong or the UI is asking too much.

## Current State

Implemented on `feat/crowd-forecast-layer`:

- `Crowd Forecast` tab.
- Lazy market query.
- Source status strip.
- Reading guide.
- Tournament pulse table.
- 24h movement list.
- Group cards with blue tournament bars and green match bars.
- Matchup pills in `vs Opponent 31%` form.
- Settled pills for `WIN`, `LOSS`, and `DRAW`.

Known remaining friction:

- `Signal` is still too abstract in some places.
- `N/A` reads like a technical failure.
- Visitors may not understand why tournament and match numbers differ.
- The page lacks a single top-level takeaway.
- The most intuitive feature from Odds Odds Oh, close-match scanning, is not yet present.

## Implementation Plan

| Phase | Change | User Benefit | Implementation Notes | Acceptance Check |
| --- | --- | --- | --- | --- |
| 1 | Rename abstract labels | Replaces market jargon with plain language. | Use `Chance` where a percentage is shown. Keep `signal` only in explanatory text where needed. | A novice can read the group card without asking what `Signal` means. |
| 1 | Change `N/A` to `No market` | Makes missing data feel intentional instead of broken. | Update percentage formatter call sites that show absent market data. Avoid changing internal DTO names. | Empty bars say `No market`; source outages still use source status cards. |
| 1 | Add a one-line page summary | Sets context before tables. | Under the `Crowd Forecast` heading: `A quick read on what public markets expect, separate from official results.` | The first screen explains the tab without a paragraph. |
| 1 | Add a compact blue and green legend above group cards | Reduces reliance on tooltips. | Text: `Blue = chance to win the Cup. Green = chance in listed group matches.` | A desktop or mobile user can decode colors without hovering. |
| 1 | Add a `Why different?` tooltip | Explains why blue and green can disagree. | Copy: `A team can be favored in one match and still have a low chance to win the Cup.` | Tooltip appears beside the group card metric area or guide. |
| 2 | Add `Today's simplest read` | Gives instant value before tables. | Compute from existing snapshot: top tournament team, top mover if present, and source health. Keep it to one compact card. | Visitor gets a useful takeaway without scanning all groups. |
| 2 | Add `Most uncertain matches` | Adds a simple fan-friendly reason to use the forecast page. | Use Kalshi match signals closest to 50%. Build from existing `teamForecasts` without new network data. Deduplicate by matchup. | Shows 3 to 5 toss-ups such as `Canada vs Switzerland: close`. |
| 2 | Add match lean words | Turns percentages into words. | Use thresholds: `Toss-up` around 45-55, `Lean` around 55-65, `Strong lean` above 65. Keep the number visible. | A user can understand a match without interpreting decimals. |
| 2 | Limit movement section to top 3 by default | Prevents the movement list from taking over during busy periods. | Show top 3 with a small `Show all` control if more exist. Keep no-movement empty state compact. | Movement never dominates the page. |
| 3 | Add mobile jump controls inside Forecast | Reduces long-scroll friction. | Compact segmented row: `Pulse`, `Close Matches`, `Groups`. Use anchor links or local state. | On mobile, users can jump without hunting. |
| 3 | Improve settled result wording | Makes `WIN`, `LOSS`, `DRAW` viewpoint clear. | Consider `Won`, `Lost`, `Drew` or add tooltip: `Canada result vs Switzerland`. | A settled pill is unambiguous from the row team's viewpoint. |
| 3 | Add official vs forecast micro-note | Prevents standings confusion. | Short note near group cards: `Groups tab = official results. Forecast tab = public market expectation.` | Users do not mistake market order for standings. |

## Recommended First Slice

Implement Phase 1 first.

It is mostly copy and formatter work, with low risk:

1. `Signal` -> `Chance` in visible percentage labels.
2. `N/A` -> `No market` in absent market values.
3. Add the one-line page summary.
4. Add the blue and green legend above group cards.
5. Add the `Why different?` tooltip.

This should be a single small commit after `bun run verify`.

## Second Slice

Implement the two extra-value features:

1. `Today's simplest read`.
2. `Most uncertain matches`.

These are the best quick wins because they answer natural fan questions:

- Who is the market highest on?
- What changed?
- Which matches look like toss-ups?

No new provider fetch is needed. Use the existing forecast snapshot.

## Data Shaping Notes

### Today's Simplest Read

Use:

- `topTournamentSignals[0]` for the highest tournament chance.
- `movers[0]` for the largest 24h move, if present.
- `sourceStatus` to say whether market data is live, cached, or unavailable.

Suggested copy patterns:

- `Highest Cup chance: Brazil 22.0%`
- `Biggest 24h move: France +1.2ppt`
- `Sources: Polymarket live, Kalshi cached`

Do not invent analysis beyond the data.

### Most Uncertain Matches

Build from `teamForecasts[].matchSignals`.

Rules:

- Only include open match signals with a percentage.
- Deduplicate by the pair of team names and date.
- Prefer matchups where the two teams' available signals are closest together.
- If only one side is available, use closeness to 50%.
- Show 3 to 5 rows.

Suggested row copy:

`Canada vs Switzerland - Toss-up - 31% / 40%`

If the numbers do not add to 100%, do not force them to. These are market-side signals from the provider, not a model created by this app.

## Copy Decisions

| Current Copy | Better Copy | Reason |
| --- | --- | --- |
| `Signal` | `Chance` | Easier for casual visitors. |
| `N/A` | `No market` | Explains absence without sounding broken. |
| `Tournament` | `Cup chance` or `Tournament chance` | Says what the percentage refers to. |
| `Match` | `Match chance` | Makes the green bar less abstract. |
| `Teams that shifted in the last day` | `24h movement` | Quieter and shorter. |
| `Public market signal, kept separate` | `What public markets expect` | More direct. |

## Feynman QA Checklist

Before committing, inspect the UI and ask:

- Can I explain this page to a non-technical football fan in one sentence?
- Does every percentage say what object it belongs to?
- Does a missing value say why it is missing?
- Does any label sound like betting advice?
- Does any section shout louder than the bracket, groups, or matches?
- Can a mobile visitor get one useful answer without scrolling for a minute?
- Are official results and market expectations visually separate?

## Verification

Run:

```sh
bun run verify
```

Then smoke test:

```sh
bun run dev --host 127.0.0.1 --port 4173
```

Manual checks:

- Bracket remains the default tab.
- Crowd Forecast opens without layout shift.
- Group cards use `Chance` and `No market` copy.
- Blue and green legend is visible without hover.
- Tooltips work on desktop and are not required to understand the page.
- Mobile layout has no overlapping labels or pills.

## Commit Guidance

Use small commits:

1. `design: simplify forecast labels`
2. `feat: add forecast summary cards`
3. `design: improve forecast mobile navigation`

Update `AGENTS.md` after each checkpoint.
