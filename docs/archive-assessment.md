# World Cup Hub — Post-Tournament Assessment (Feynman Pass)

> Status: assessment only. The companion implementation guide is
> `docs/archive-implementation-guide.md`.
>
> Date: 2026 (post-tournament). Written from first principles.

## First-principles framing

Forget what the thing *was*. Ask what it *is* now that the tournament is over.
Three kinds of remaining value, and they are different animals:

1. **Evidence** — proof of the ability to design, build, and ship something
   robust (the portfolio purpose: agentic coding, frontend design, security,
   architecture).
2. **Data** — a frozen record of what the crowd predicted vs. what actually
   happened. Unique, perishable, and nobody else saved it.
3. **Machinery** — bracket engine, validation pipeline, feed adapters.
   Reusable for future tournaments.

One honest fact, because the first principle is that you must not fool
yourself: **a live dashboard with dead feeds is worse than no dashboard.**
Recruiters click links. A broken link says "this person abandons things."
A frozen, intentional archive says "this person finishes things."

Every option below is really a different answer to one question: *what do you
keep alive, and what do you deliberately let die?*

## The Top 10

**1. Freeze it into a static time capsule (highest priority).**
Bake the final ESPN snapshot + final Polymarket snapshot into the repo as
committed JSON, add a build mode that renders everything from that frozen
data, and deploy that. Zero live dependencies, ~zero hosting cost, works
forever. Foundation under almost every other option. The feeds *will* die —
make the artifact immortal now.

**2. Build the "Forecast vs. Reality" retrospective page.**
The scientific payoff and the most interesting thing left to extract. The
crowd said X would win; the bracket says what happened. Where was the market
calibrated? Where was it wildly wrong? Biggest mispriced matches, biggest
"what changed" moments. A genuinely original data artifact. One page, a few
charts, and it becomes the *story* of the whole project.

**3. Write the architecture case study — the build log.**
What you can explain, you understand; what you can't explain, you only
assembled. Write it: untrusted-input validation at the boundary, dropping
malformed records instead of crashing, never replacing good data with failed
refreshes, strict visual/technical separation of official data and market
data, lazy-loaded forecast layer, security headers, agentic coding workflow
with tests as the harness. This turns "I made a dashboard" into "I make
engineering decisions." For the showcase purpose, arguably worth more than
the app itself. README + blog post.

**4. Record the live experience before it's gone.**
Screen-record a scrub-through: bracket filling in, `LIVE NOW` states,
forecast tab loading. 60–90 second demo video + GIFs for the README. A video
can't 404. Recruiters skim; a video plus three screenshots beats a link
they'll never click.

**5. Refactor it into a generic tournament-engine starter.**
Strip FIFA branding, parameterize the feed adapter, open-source as
"tournament-bracket-dashboard" — works for WC 2030, Euro 2028, WWC 2027,
AFCON, a darts league. The architecture was always the asset; ESPN was just
one input. Converts a finished project into a living one and demonstrates
abstraction skill.

**6. Repoint it at the next tournament (lazy version of #5).**
Don't genericize — just swap the adapter and relaunch for 2027 WWC or
Euro 2028 when feeds exist. Lower effort than #5 but keeps the maintenance
treadmill running. Do only if you genuinely want to use it again. Cargo-cult
maintenance — keeping a thing running out of ceremony rather than function —
is a trap.

**7. Extract the reusable pieces as standalone artifacts.**
The bracket component, the validation/transform pipeline, the
snapshot-with-fallback cache — each is a self-contained demonstration.
Publish as gists, small packages, or appendix code in the case study.
Shows modularity: the parts make sense without the whole.

**8. Solve the domain problem deliberately.**
The `workers.dev` deployment is free — keep it alive for the frozen archive.
The custom domain (`nawewe.xyz`) needs a decision: keep it pointed at the
archive, move the archive to a subdomain, or 301 to the portfolio and let
the config go. What you must *not* do is let it rot into a broken page.

**9. Memory-hole the infrastructure, keep the repo tagged.**
The respectable middle path: `git tag v1.0-final-tournament`, archive the
repo on GitHub (read-only, beautiful README), tear down any paid infra,
walk away clean. The repo remains as evidence; nothing demands maintenance.
Finishing something *on purpose* is a skill — most GitHubs are graveyards
of things that ended by accident.

**10. Delete it entirely.**
Included for completeness and honesty, the way you'd include the null
hypothesis. Sometimes the right answer is "it served its purpose, the joy
was in the doing, let it go." Here the numbers don't support it: option 1
costs an afternoon, and the portfolio + retrospective value is real.
Deleting is the one irreversible option, so it loses.

## Recommended sequence

Combine **1 + 2 + 4 + 3**, in that order of effort, then **8** for a
permanent address, and tag/archive the repo per **9**:

1. Freeze the data → static archive deploy (an afternoon).
2. Forecast vs. Reality page (the fun part — you get to *find something out*).
3. Video + screenshots.
4. Case-study write-up.
5. Permanent URL, tagged release, archived repo.

That converts a perishable live tool into a permanent, self-explanatory
artifact — and the retrospective (#2) turns it from "another dashboard"
into "a story only you can tell."

Implementation detail: see `docs/archive-implementation-guide.md`.
