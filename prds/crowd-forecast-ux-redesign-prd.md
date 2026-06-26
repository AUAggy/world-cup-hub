# PRD: Crowd Forecast UX Redesign

## Problem Statement

The current Crowd Forecast tab is accurate, but its section structure reflects data-source categories more than fan questions. Labels such as `Close matches`, `Tournament Pulse`, `Movement`, and `Group Forecast` are understandable, but they still require users to translate market-feed language into sports meaning.

A fan does not naturally ask:

```txt
Where is Tournament Pulse?
Where is Movement?
```

A fan asks:

```txt
What should I watch?
Who can win?
What changed?
Is this reliable?
Where are the old group markets?
```

Once the knockout phase begins, the Crowd Forecast tab should help users understand public market expectations quickly, without making the forecast layer look official or like betting advice.

## Solution

Redesign the Crowd Forecast tab around fan-facing questions instead of market-feed categories.

Recommended section structure:

```txt
Market read
Toss-ups
Cup chances
What changed
Archived group forecast
```

This preserves the existing data while making the tab easier to scan, more intuitive, and more clearly separated from official World Cup results.

## Product Principle

The current tab says:

> Here are the market feeds.

The redesigned tab should say:

> Here is what the crowd currently believes, and where it is uncertain.

## Recommended Information Architecture

### 1. Market read

A compact summary area at the top of the page.

Purpose: give users the forecast answer in 30 seconds.

Example layout:

```txt
Crowd Forecast
Public market expectations, separate from official results.

Most uncertain match
Portugal vs Uruguay
Near even, 51% / 49%

Highest Cup chance
France
18.4%

Biggest 24h shift
Argentina
+3.1ppt

Market status
Match markets live
Tournament markets live
```

Why:

- Users get the headline before seeing detailed tables.
- The section frames forecast data as context, not official truth.
- It reduces the cognitive load of interpreting market feeds.

### 2. Toss-ups

Rename `Close matches` to `Toss-ups`.

Purpose: show matches where public markets are least certain.

Example card:

```txt
Portugal            51%
Uruguay             49%
Toss-up · Round of 32 · Jun 29
```

Why:

- `Toss-ups` is more human than `Close matches`.
- It emphasizes uncertainty rather than betting odds.
- It gives fans an obvious answer to: "Which games should I watch?"

### 3. Cup chances

Rename `Tournament Pulse` to `Cup chances`.

Purpose: show who public markets think can win the tournament.

Recommended presentation: ranked rows, not many equal cards.

Example:

```txt
1  France       18.4%   +1.2ppt
2  Brazil       16.8%   -0.4ppt
3  England      12.1%   +0.8ppt
```

Why:

- This is leaderboard content.
- Tables/ledger rows are calmer and easier to compare than cards.
- The label `Cup chances` is direct and fan-friendly.

### 4. What changed

Rename `Movement` to `What changed`.

Purpose: explain which teams moved most in public market pricing over the last 24 hours.

Example:

```txt
Argentina   +3.1ppt
Moved in public market pricing

Germany     -2.4ppt
Moved in public market pricing
```

If the product does not have a verified reason for a movement, do not invent one. Use neutral language such as:

```txt
Moved in public market pricing
```

Why:

- `Movement` is market language.
- `What changed` maps to the fan question.
- Neutral explanatory copy avoids unsupported claims.

### 5. Archived group forecast

Demote `Group Forecast` after the group stage ends.

Recommended labels:

- `Archived group forecast`
- `Group-stage market archive`

Default behavior in knockout phase: collapsed or placed near the bottom.

Why:

- Group markets become historical context once knockouts begin.
- Keeping group forecast high makes the page feel stuck in the old phase.
- Users can still inspect group-stage market context without it competing with knockout content.

## Layout Direction

### Desktop

```txt
[Market read in 30 seconds.................................]

[Left: Toss-ups / next knockout markets] [Right: Cup chances]

[What changed..............................................]

[Archived group forecast collapsed........................]
```

### Mobile

Recommended order:

1. Market read.
2. Toss-ups.
3. Cup chances.
4. What changed.
5. Archived group forecast.

## Visual Design Direction

Use three forecast display types.

### 1. Insight card

For summary facts.

Example:

```txt
Most uncertain match
Portugal vs Uruguay
51% / 49%
```

Use sparingly. These are headline facts, not every row.

### 2. Match probability card

For head-to-head markets.

Example:

```txt
Portugal  ██████████ 51%
Uruguay   █████████  49%
```

Guidance:

- Present as public expectation, not official probability.
- Use restrained bars.
- Avoid sportsbook-style visual treatment.

### 3. Ranking row

For tournament winner markets.

Example:

```txt
France   18.4%   +1.2ppt
```

Guidance:

- Use rows for comparison-heavy lists.
- Do not turn every team into a card.
- Keep the table compact and readable.

## Copy Changes

Recommended naming changes:

| Current Label | Recommended Label |
| --- | --- |
| Today's simplest read | Market read |
| Close matches | Toss-ups |
| Tournament Pulse | Cup chances |
| Movement | What changed |
| Group Forecast | Archived group forecast |

## User Stories

1. As a fan, I want a quick top-level market read, so that I can understand the crowd view without reading every table.
2. As a fan, I want toss-up matches highlighted, so that I know which knockout games look most uncertain.
3. As a fan, I want Cup chances in a ranked list, so that I can compare contenders quickly.
4. As a fan, I want recent market movement explained in plain language, so that I can see what changed without knowing market terminology.
5. As a fan, I want group forecast data archived after group play, so that old group context does not distract from knockout matches.
6. As a cautious user, I want forecast data clearly separated from official football results, so that I do not confuse public expectations with official standings or outcomes.

## Implementation Decisions

- Keep Crowd Forecast lazy-loaded when the forecast tab is opened.
- Preserve the technical and visual separation between official football data and Polymarket-derived forecast data.
- Reorganize existing forecast components around fan-facing sections.
- Rename market-feed-oriented headings to user-question-oriented headings.
- Keep group forecast data available, but demote it after the knockout phase begins.
- Avoid adding betting, trading, or financial call-to-action language.
- Do not invent reasons for market movement unless the data source explicitly supports them.

## Testing Decisions

Validation should focus on external behavior:

- Forecast tab still handles loading, unavailable, cached, and live states.
- Source status pills remain visible and understandable.
- Toss-up matches still derive from available match market probabilities.
- Cup chances still derive from tournament market signals.
- Movement still derives from 24-hour movement data.
- Archived group forecast remains accessible.
- Forecast data does not appear inside official standings or bracket components.
- Empty states remain clear when no market data exists.

## Out of Scope

- Adding new Polymarket sources.
- Treating forecast data as official prediction.
- Adding betting, trading, financial, or investment advice.
- Explaining market movement with unsupported editorial claims.
- Replacing official ESPN-derived match or standings data.
- Full visual rebrand of the dashboard.

## Success Criteria

- A user can understand the main crowd forecast in under 30 seconds.
- The tab feels like a fan-facing forecast reader, not a raw market dashboard.
- Toss-up matches are easier to find than before.
- Cup chances are easier to compare than before.
- Group forecast no longer competes with knockout-phase forecast content.
- Official football results and public market expectations remain visually and technically separate.
