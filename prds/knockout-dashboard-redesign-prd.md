# PRD: Knockout-First World Cup Dashboard

## Problem Statement

Once the group stage ends, the dashboard's current information hierarchy becomes stale. The app currently treats Bracket, Groups A-L, All matches, and Crowd Forecast as equal peers. That works during group play, when the main fan question is "Who is qualifying?"

When the Round of 32 begins, the main question becomes "Who survives next?" The bracket should become the primary surface, match results should support the bracket story, Crowd Forecast should become a clearly separated context layer, and Groups A-L should move into an archival role.

## Solution

Reposition the dashboard as a knockout-first command center:

- Make the bracket the primary destination after group play.
- Treat official results as the spine of the product.
- Use live, next, and latest match cards as the dashboard heartbeat.
- Keep Crowd Forecast visually and technically separate from official football data.
- Demote Groups A-L into a Group Stage Archive / final tables view.
- Make All Matches easier to scan by emphasizing knockout matches first and collapsing group-stage history.

The product should communicate one clear idea:

> The groups decided the field. The bracket decides everything now.

## Design Read

- Page kind: live sports dashboard for fans.
- Visual language: editorial sports desk / printed wall chart / clean scoreboard.
- Aesthetic foundation: existing cream, ink, terracotta theme with restrained data cards.

### Design Dials

- `DESIGN_VARIANCE`: 5 — clear structure over novelty.
- `MOTION_INTENSITY`: 2 — mostly static, no distracting movement.
- `VISUAL_DENSITY`: 7 — operational but not cramped.

## Information Architecture

### Current Navigation

```txt
Bracket | Groups · A-L | All matches | Crowd Forecast
```

### Recommended Knockout Navigation

```txt
Bracket | Matches | Crowd Forecast | Group Stage
```

Alternative compact version:

```txt
Bracket | Matches | Forecast | More
```

Where `More` contains Group Stage, data notes, and other secondary views.

## Layout Direction

### Desktop Layout

Use a bracket-first 12-column layout:

```txt
| 8 cols: Bracket / Round path     | 4 cols: Today panel       |
| 8 cols: Knockout match cards     | 4 cols: Forecast pulse    |
| 12 cols: Group stage archive / All matches                         |
```

The bracket is the map. The right rail is the commentary booth.

### Mobile Layout

Recommended order:

1. Live / next match.
2. Current round cards.
3. Bracket map, horizontally scrollable.
4. Crowd Forecast preview.
5. Results timeline.
6. Group Stage Archive.

## Core Product Surfaces

### 1. Bracket

The bracket becomes the main page after group play.

Recommended improvements:

- Keep the full bracket visible as the main tournament map.
- Highlight the current round.
- Add seed/context labels where available, such as `1A`, `2B`, or `3rd-place qualifier`.
- Surface live, next, and latest knockout matches near the bracket.
- Preserve horizontal scrolling for the full bracket, but provide a simpler current-round view above it on mobile.

### 2. Matches

All Matches becomes an answer engine instead of a long undifferentiated feed.

Recommended filters:

```txt
All | Live | Upcoming | Results | Knockout | Group Stage
```

Default after the Round of 32 begins:

```txt
Knockout
```

Group-stage matches should be collapsed under a section such as:

```txt
Group stage results, 72 matches
```

### 3. Crowd Forecast

Crowd Forecast remains optional, clearly separated from official football results.

Post-group priority order:

1. Tournament Pulse — who public markets think can win the Cup.
2. Next Match Forecast — expectations for upcoming knockout matches.
3. Most Uncertain Matches — best fan-facing forecast section.
4. Movement — teams that changed most after recent results.
5. Archived Group Forecast — collapsed or moved lower.

The bracket page should include only a small forecast preview, for example:

```txt
Crowd Forecast
Most uncertain R32 match:
Portugal vs Uruguay, near even

Biggest 24h move:
France +3.1ppt
```

The full forecast view remains behind the Crowd Forecast tab.

### 4. Groups A-L

Groups should not be removed. They should be demoted and renamed.

Recommended names:

- `Group Stage`
- `Group Stage Archive`
- `Groups, final tables`

The page should lead with the answer, not the 12 equal group cards.

Recommended order:

1. Qualified from groups.
2. Best third-place teams.
3. Final group tables A-L.

The group cards remain useful as explanation: "How did this team get here?" They should no longer be positioned as the main tournament surface.

## Card System

Use four card families only.

### Match Card

Purpose: live, next, latest, fixtures, and results.

Should answer quickly:

```txt
Brazil        2
Germany       1
FT · Round of 32 · Dallas
```

### Bracket Board

Purpose: main tournament map.

Should feel like the official path through the tournament, not just a row of cards.

### Ledger / Timeline Card

Purpose: All Matches and historical results.

Should support filters, day grouping, and collapsed group-stage history.

### Forecast Sidecar

Purpose: public expectation, separated from official results.

Should use small, clearly labeled modules. It must not look like official standings.

## Inspiration

Use these references as design principles, not as visual clones:

- The Athletic match center: calm, editorial, readable.
- NYTimes election results pages: live status plus structured outcomes.
- Printed World Cup wall chart: bracket as the hero object.
- Sports newspaper box scores: groups and results as supporting evidence.

Avoid making every dataset fight for equal attention.

## User Stories

1. As a fan, I want the bracket to be the first thing I understand after groups, so that I can see who survives next.
2. As a fan, I want live, next, and latest knockout matches surfaced near the bracket, so that I do not hunt through all fixtures.
3. As a fan, I want group standings preserved as final tables, so that I can understand how teams qualified.
4. As a fan, I want group-stage results collapsed after knockouts begin, so that old fixtures do not overwhelm current matches.
5. As a fan, I want Crowd Forecast kept separate from official results, so that I can distinguish public expectation from football data.
6. As a mobile user, I want the current round before the full bracket map, so that I can quickly see today's relevant games.
7. As a returning user, I want the app to feel ready for the knockout phase without losing group-stage context.

## Implementation Decisions

- Add tournament-phase-aware navigation labels and default emphasis.
- Preserve existing official-data and forecast-data separation.
- Keep the Bracket route as the primary knockout surface.
- Demote Groups from peer-level emphasis to archive-level emphasis.
- Add or refine match filters for knockout, group stage, live, upcoming, and completed results.
- Add a compact Crowd Forecast preview outside the full forecast tab.
- Keep forecast market data lazy-loaded unless the user opens the full forecast view or a deliberately small preview is supported without degrading performance.
- Avoid introducing a new visual design system; evolve the existing cream / ink / terracotta editorial theme.

## Testing Decisions

Validation should focus on external behavior:

- Bracket remains the default primary view.
- Group data is still available after being renamed or demoted.
- Match filters correctly separate knockout and group-stage matches.
- Crowd Forecast remains visually and technically separate from official results.
- Lazy-loading behavior for forecast data is preserved unless explicitly changed.
- Empty, loading, and failed upstream data states remain safe and readable.
- Mobile layout places current match context before archival group content.

## Out of Scope

- Replacing official ESPN-derived football data.
- Treating Polymarket data as official prediction or advice.
- Adding betting, trading, or financial calls to action.
- Full visual rebrand.
- Removing Group Stage data entirely.

## Rollout Plan

Recommended approach: build behind a feature branch now, then merge or enable for June 28 after verification.

Suggested phases:

1. Create feature branch for knockout-first IA and layout.
2. Implement navigation label changes and Group Stage Archive treatment.
3. Implement bracket-first layout and mobile ordering.
4. Add match filtering / group-stage collapse.
5. Add small Crowd Forecast preview if it can preserve data separation and loading discipline.
6. Run full verification and manual responsive review.
7. Merge or enable on June 28.

## Success Criteria

- The bracket is unmistakably the primary knockout-phase surface.
- Users can still find final group tables within one navigation action.
- All matches are easier to scan once knockout games begin.
- Crowd Forecast feels like optional context, not official tournament truth.
- The UI feels calmer, clearer, and more decisive than the current equal-tab layout.
