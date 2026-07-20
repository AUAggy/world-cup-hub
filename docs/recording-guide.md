# Demo Recording Guide — World Cup Hub Archive (Step 4)

> Purpose: a 60–90s silent tour + 3–5 stills that prove what the dashboard
> was, for the README and portfolio. Record against the **frozen archive**
> so the footage never goes stale.
>
> Two ways to do it: automated (`scripts/record-demo.ts`, preferred) or
> manually with this shot list as the script. Either way, the output spec
> and shot list below are the contract.

## Output spec

| Artifact | Spec | Destination |
| --- | --- | --- |
| `demo.mp4` | 60–90s, 1440×900 @2x, H.264, silent, no cursor theatrics | `docs/media/` |
| `demo.gif` | 12–15s sped-up cut of the same tour, ≤ ~3MB, ~960px wide, 12fps | `docs/media/` |
| `bracket.png` | Full-page still, Bracket tab | `docs/media/` |
| `matches.png` | Full-page still, Matches tab | `docs/media/` |
| `groups.png` | Full-page still, Group Stage tab | `docs/media/` |
| `forecast.png` | Full-page still, Crowd Forecast tab | `docs/media/` |
| `reality.png` | Full-page still, Forecast vs. Reality tab | `docs/media/` |

Orientation: **landscape desktop only**. The dashboard is a wide bracket
board; mobile capture undersells it. (If you want a mobile still for the
README, take one 390×844 shot of the bracket separately, optional.)

## Environment

- Serve the **archive build** locally: `bun run build:archive` then
  `bun run preview`. Do not record production — local is deterministic
  and safe to restart.
- Light theme, default browser chrome hidden (headless or clean window).
- No personal tabs/bookmarks bar visible if recording manually.

## Shot list (the story, in order)

Total ~75s. The rule: **linger on the two tabs that are the story** —
Bracket and Forecast vs. Reality — and move briskly through the rest.

1. **Bracket (hero) — ~20s**
   - Load `/` (lands on Bracket). Hold 3s on the full board.
   - Slow scroll down through the rounds to the Final
     (Spain 1–0 Argentina, AET). Hold 2s on the champion.
   - Scroll back to top.
2. **Matches — ~10s**
   - Click `Matches`. Scroll the ledger once, letting `FULL TIME` cards
     and knockout consequence copy read. No filters needed.
3. **Group Stage — ~10s**
   - Click `Group Stage`. One pass over the archive tables + third-place
     pool. Brisk — it's context, not the story.
4. **Crowd Forecast — ~12s**
   - Click `Crowd Forecast`. Show Market read / Cup chances / What changed
     sections. Note how it's visually separate from results.
5. **Forecast vs. Reality (the star) — ~20s**
   - Click `Forecast vs. Reality`.
   - Hold 4s on the champion's arc (dots = match days).
   - Slow scroll: "The read before each round" (crowd backed France all
     knockout long), the Final card (Spain 59% / Argentina 41%), and
     "What changed" (France −39pts after the semifinal).
   - Hold 2s on the last section before cut.
6. **Footer — ~3s**
   - Scroll to the "Final archive — data frozen as of …" note. It's the
     thesis of the whole exercise: finished on purpose.

## Manual recording fallback (if not using the script)

- macOS: `Cmd-Shift-5` → "Record Selected Portion", or QuickTime → New
  Screen Recording. Set browser window to 1440×900 (or record a region).
- Move slowly; the viewer can always skim, they can't un-blur.
- Convert: `ffmpeg -i raw.mov -c:v libx264 -crf 23 -pix_fmt yuv420p docs/media/demo.mp4`
- GIF: `ffmpeg -i docs/media/demo.mp4 -vf "fps=12,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -t 15 docs/media/demo.gif`

## After capture

- [ ] Files land in `docs/media/` (force-add if gitignored: `git add -f docs/media`)
- [ ] Reference `demo.gif` + stills in README (Step 3b)
- [ ] Total added repo weight ≤ ~15MB
