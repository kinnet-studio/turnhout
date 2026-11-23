# SDD ledger — plan: docs/superpowers/plans/2026-11-23-startup-long-runs-retune-2-speed-3.md

- Started 2026-11-23 after plan 6-2b (code 8aedd05; plan commit 1c958a5). Spec: the overview (Tasks 1–2 behaviour unchanged; Task 3 steering only).
- Ruling: no separate pre-flight — both probes measured the exact patches (speed: rec byte-identical tally/hash dumps md5 34c141de…, four rules mutations' failure text identical, 3832 pass, tsc clean; retune: 3817 pass, every required key ≥2, per-game tally table), and the controller applied both to 8aedd05 in a scratch worktree: speed applies cleanly, the retune with -3 has 3 conflicts, all in comments and the HELD set. That is a pre-flight of this plan's code. Cost if wrong: a gap the task reviews or final review must catch.
- Ruling: take the retune's full set (D1–D4, 6 targets) over the cheaper fallback (D2–D4, 5 targets, −38 moves) — the run's CPU time fell 5% anyway; Platform Power (now 2 games) becomes required by the first retune's R3 rule (a key the retune newly brings to 2+ games is required), First Mover Advantage and Full Stack Founder keep their earlier counted status — cost if wrong: one line to revert.
- Ruling: C4 (per-state memo) not taken (C1 caches what it would); the coordinator's "scan only changed cards" not taken (it would stop checking C1's own claim).

## Conflict scan
| Pair / task | Produces → consumes | Found |
|---|---|---|
| T1 → T2 | engine behaviour only → test file | independent hunks (`--include` split); both from one patch that applies cleanly to 8aedd05 |
| T2 → T3 | test file C2/C5 hunks → retune hunks | different regions (adviceRan, outputs invariant vs playTurn, tallies, comments); the combined apply at 8aedd05 conflicted only in the 3 comment/HELD regions, which come from 6-2b's fix wave, not T2 |
| T1 self | engine hunks vs their tests | the tests are in the same patch; consistent with Interfaces |
| T2 self | C2/C5 vs "byte-identical" | proven by the probe's ident and 4 mutations |
| T3 self | tally changes vs "no required key below 2" | the probe's table; the fix wave's at-work change is a named re-measure (Step 4) |
| T3 vs plan 6-3 | card-alone.ts header (6-3 R4) | Gap: the controller drops 6-3's R4 card-alone sentence after T1 |
- Task 1: BASE 1c958a5; implementer dispatched (sonnet), agent ab71e332d05c3fba7.
- Task 1: implementer DONE 1dcbf99 — 3832 pass (+15), tsc clean, ident md5 4b653236… equal at BASE and head, mutations bite (4, 5, 1 failing), timing best 25.08 → 23.35 s (noisy, load 1.8–2.7). Review dispatched (sonnet).
- Task 1 review (sonnet): Approved — sharedZoneHas reads only zone cards' data; zone ids stable (slug of name); cardsOn's 8 callers never mutate, copy returned; {sharedzone} offers only shared zones. Minor → final fix wave: a comment in the classifier saying zoneTested relies on the vocabulary offering only shared zones. Parked: old-style perf3 ident md5s differ (fresh BASE matches head).
- Task 1: complete (1dcbf99).
- Task 2: BASE 1dcbf99; implementer dispatched (sonnet).
- Task 2: implementer DONE_WITH_CONCERNS 12e0ac7 — 3832 pass, tsc clean, 307 examples, mutations 1–4 identical (18/1/13/6 failures), ident md5 unchanged; timing best 22.33 (BASE) vs 23.12 s (head), noise ≈2 s at load 1.5–2.1 — the probe measured C2 as the advice test 1.5–1.7 s → 0.44 s; within this noise. Review dispatched (sonnet).
- Task 2 review (sonnet): Approved — examples run each on its own table; adviceRan read only within its slice; C5 keeps all four reads, every < 0 check and every before/after compare. Minor: the report overstates the saving (2 of 6 reads, not 4) — no change.
- Task 2: complete (12e0ac7).
- Task 3: BASE 12e0ac7; implementer dispatched (sonnet).
- Task 3: implementer DONE 60f5308 — 3832 pass, tsc clean, 307 examples; tally matches the proposal (6 targets, 5 promoted, moves 4615); at-work keys 8/12/14 games (fix wave's counting); five required keys at exactly 2 games, comments name them; timing best 22.48 (BASE 12e0ac7) → 21.62 s; 8aedd05 once 26.20 s. Review dispatched (sonnet).
- Task 3 review (sonnet): Approved — drivers only reorder/gate candidates inside choose; no loop; HELD set loses exactly the six; five promoted keys required; merged comments consistent, sampled pin titles exist; D4 test covers both parities. Minors: five keys at exactly 2 games (named in comments; Review Focus 5); 'both' wording in the slice 6 comment (accurate).
- Task 3: complete (60f5308).
- Final review: range 1c958a5..60f5308, opus.
- Final review (opus): Ready to merge: Yes — 0 Critical, 0 Important, 4 Minor (final-review.md). C1 sound; memory bounded; coverage recomputed from dumps; drivers through choose; constraints hold.
- Ruling (final wave): fix all 4 Minors in one dispatch (sonnet): comments at queue-phrases.ts:23 and card-alone.ts:62 (Task 1's parked Minor); pin sharedZoneHas's code text in card-alone.test.ts (the reviewer's mutation — sharedZoneHas also reading the current player — passed the pin and was caught only by the played-game test); the card-alone.test.ts:189 title; the :581 size tie to Startup's rules; OUTPUT_NAMES.slice(0, 2) at startup test :2802 — each is a few lines, and a pin that lets the trusted code change unseen is the one thing the classifier rests on.
- Final fix wave: DONE 1e64298 — all four Minors; the pin compares sharedZoneHas's code text with a literal (whitespace and vite's import wrappers stripped), since the registrar-vs-library pin compares the function with itself; the reviewer's current-player mutation fails it. Controller's own read of the 19-line diff stands as the scoped re-review (each item matches the finding; nothing else changed). Parked: the pin's text depends on the test transform's import wrapper form — a vitest upgrade that renames the wrapper fails it loudly, which is safe.
- Controller verify: bun run test 3833/3833, typecheck clean.
- Plan: complete.

## Appendix: the final review (opus)

## Final review: long-runs retune 2 and speed-up 3 (1c958a5..60f5308)

Reviewer: whole-plan final review. The tree was left as found. The checks ran in a temporary detached worktree at 60f5308, which has since been removed.

What I checked myself:
- I read every engine hunk, the Task 2 hunks and the Task 3 hunks in full.
- I traced `CENTRE_HAS` from the vocabulary (`{sharedzone}`, `{card}`) through `sharedZoneHas`, `zoneTested`, `readsTheCardAlone`, `classified`, `keptFor` and `zoneCardsKey`.
- I searched the engine, pages and protected files for in-place changes to a `state.cards` array.
- I recomputed the per-game coverage from the implementer's instrumented dumps (`retune2/out/m3base.jsonl` and `m3head.jsonl`, the same 4464 and 4615 moves) with my own script, including every required list the dumps record.
- I grepped every pin title of the 8 `HELD_BY_FEWER_THAN_TWO` keys.
- I ran one extra mutation (below), `bun run typecheck`, and the card-alone and attach test files.

### Strengths

- **C1 is sound as shared engine code.**
  - The key and the line resolve the zone with the same function. The key's zones are `zoneIdFor(ref.args[0])`, collected per value. `sharedZoneHas` reads `zoneCards(env.state, zoneIdFor(zone))` with the same `args[0]`, in the same `state` that `keptFor` keys on. So the zones in the key cannot differ from the zones a line tests.
  - Two refs to one zone resolve to the same declared name. `wordType` returns `entry[1]`, which is the vocabulary's name, not the written text. The id `Set` then dedups them.
  - `{sharedzone}` only ever resolves to a seat-less shared zone name (`v.sharedZones`).
  - `{card}` resolves to a static data match. `matchesCard` reads only `card.data`.
  - `sharedZoneHas` therefore reads exactly the zone's card objects.
  - The classifier is an `every` over refs. Each ref must be either the exact `CENTRE_HAS` condition or a line `namesRead` already trusted. Nothing else can come in alongside `CENTRE_HAS`.
  - The other shared-zone phrase, `'a card in {sharedzone} is {cardflag}'`, would read other cards' worked flags. It is a `which`, not a condition, and is not matched.
  - Nested values add their zones to the same `Set`, so a value's key covers every zone it reads at any depth.
  - A card object's `zoneId` is part of the object, so the chain key is unambiguous even without its `end` steps. The `end` steps are extra safety.
  - `cardAloneValues` is unchanged by construction: the values with `[]` are exactly the old set.
- **The trusted-code pin and the runtime tests work together.**
  - The pin fails if another registrar replaces `CENTRE_HAS` in the default library. Only `createDefaultLibrary` is used outside tests (`designer-page.tsx`), so the classifier's phrase text and the runtime's code cannot diverge in production.
  - I mutated `sharedZoneHas` to read the current player as well. The played-game test "is the value a runtime made for that state alone works out…" failed, which is the right outcome. The pin itself did not fail; see Minor 1.
- **Memory stays bounded.**
  - `byZones` is keyed by the `keptValues` arrays of one compiled game. It holds at most one root per zone-reading value, does not grow over a session, and is dropped with the runtime.
  - Everything below a root is held weakly by card objects.
  - `known` (by compiled game) and `heldBy` (by cards array) are module-level WeakMaps.
  - The designer page makes one engine per start and keeps no old ones. The engine keeps a log, not past states.
- **No `state.cards` array is changed in place.**
  - The search covered engine, pages and protected files, looking for push, splice, sort, reverse, index assignment and `immer`.
  - The only `push` calls are on new arrays being built (`cards.ts`, `deck.ts`, `scene.ts`) and on the view's own `view.cards`.
  - `zone-index.ts` already relied on this.
  - `cardsOn` gives back a copy, and the attach tests check the copy and the old ordering.
- **No coverage was lost.** At head, no key in any required list (the `every`, `paths 1–6`, `replay 2` and `replay 3` lists) is held by fewer than 2 games.
  - Every key required at base is still required, with 2 or more games.
  - The six targets and five promoted keys are all in required lists at head:
    - reassign (`every`, 3 games)
    - License to a chosen provider (paths 1, 2)
    - Junior PM promoted (paths 3, 2)
    - Platform Power (paths 4, 2)
    - Workaholic played (8), TechCrunch $5 (8), Workaholic +2 at the Engine (5) and Toxic in the ops team (2), all paths 5
    - Intern Season (6) and Trade Show $2 (2), both paths 6
    - TechCrunch Features (replay 2, 2 logs; replay 3, 3 logs)
  - The 8 `HELD_BY_FEWER_THAN_TWO` counts match the doc comment: five held by no game (Toxic Red, Engineer $1, Legacy Code, Crunch/Clean Code, trained Junior red), and three held by one game each (Attributes kept in 2p s2, agency row to the bench in 4p s2, Patent Trolls in 2p s4).
  - All 10 pin titles behind those keys exist in `startup-simulator.rules`.
  - I spot-checked the "Held by N" counts in each rewritten tally comment against the dumps (the Attributes, Events, slice 3, slice 5 and Strategy comments). All agree.
  - Every required key held by exactly 2 games names its two games in a comment: Trade Show $2, Platform Power, License to a chosen provider, Junior PM, Toxic in the ops team, and the 2-player replay's TechCrunch Feature. This meets Review Focus 5.
- **The drivers cannot go round a rule.**
  - D1–D4 only add or reorder candidates inside `planned` and `pick`. Every candidate passes `choose`, then `accepts` (`engine.canDispatch`), then `play(engine, move, watch)`, so the same `keepsTheRules` watch sees every move.
  - D1 is gated on the `actions` counter being 1, which means the last action (the rules tests show the counter counting down to 0). It sits only in the later-actions list, after the Diva reassign and the Launch.
  - The reassign's own rules are `Only if it is on a card` and `Only if it is not on the target card`. They have no turn condition, so D4's parity is purely an auto-player choice. Its test now covers both parities, t = 0 to 5.
- **The constraints hold.**
  - The protected files, the four other games and `startup-simulator.rules` are untouched, so the example count stays 307 and Rent Day keeps its 108.
  - The plan 6-1 banned-word regex and the purity grep find nothing in the added non-test engine lines.
  - All three commit messages end with the required trailers.
  - `bun run typecheck` is clean, and card-alone plus attach pass 59 of 59.
  - The plan 6-3 Gap was closed by `49a5885`.

### Issues

#### Critical (Must Fix)

None.

#### Important (Should Fix)

None.

#### Minor (Nice to Have)

1. **What C1 relies on is not stated where someone would edit it, and the pin does not pin the code's body.**
   - **Where:**
     - `src/engine/core/lang/card-alone.test.ts:96`
     - `src/engine/core/lang/library/queue-phrases.ts:23`
     - `src/engine/core/lang/card-alone.ts:62`
   - **What's wrong:**
     - The "run the same code in the default library" test compares `String(fn)` of the default library's `CENTRE_HAS` with `registerQueuePhrases`' own entry. Both are the same `sharedZoneHas`. The test therefore pins that no other registrar replaces it. It does not pin what `sharedZoneHas` reads.
     - My mutation made `sharedZoneHas` also read the current player. The pin passed. Only the played-game test caught the change, and only because Startup's 2p seed 1 sample happens to show it.
     - `sharedZoneHas`'s comment says nothing about the runtime keeping values by its zone's cards.
     - Task 1's parked Minor is still open: `zoneTested` assumes `{sharedzone}` names a zone with no seat. Its comment does not say so.
   - **Why it matters:** a later edit to `sharedZoneHas` could read something else, for example the subject's holder or a player counter that rarely changes. That would make kept values stale without any test saying why. The existing trusted phrases have the same limit, so this is not new to C1.
   - **Fix:**
     - Add one line on `sharedZoneHas`: the runtime keeps values that test it by the zone's card objects (`keptValues`), so it must read nothing but those cards' data.
     - Add one line on `zoneTested`: it relies on `{sharedzone}` resolving to a zone name with no seat.
     - Optionally, pin `String(sharedZoneHas)` against a literal in the test, so that any change to the body flags a review.

2. **One test title says more than the test checks.**
   - **Where:** `src/engine/core/lang/card-alone.test.ts:189`
   - **What's wrong:**
     - The title is "does not hold one that also reads the cards on it, nor one that reads another zone, another player or a game number".
     - Only `scrap crowned` combines a shared-zone test with something else.
     - The other seven names (`crew skill` … `fee paid`) test no shared zone, so they check the card-alone rule again, not the combination the title describes.
   - **Why it matters:** the classifier is correct, since it judges each line on its own. But the test does not show a combined value such as "shared zone and owner" being rejected, and a reader would think it does.
   - **Fix:** add fixture sections that each test the scrap and also read the owner, another zone or the fee, and assert they are not kept. Or narrow the title.

3. **An engine test depends on the shape of Startup's rules.**
   - **Where:** `src/engine/core/lang/card-alone.test.ts:581`
   - **What's wrong:** `expect(zoned.size).toBe(1)` assumes Startup's kept values test exactly one shared zone.
   - **Why it matters:** if a Startup rule later tests a second shared zone, an engine test fails for a reason that has nothing to do with the engine.
   - **Fix:** loop over `zoned`, skipping a state only when every zoned zone is empty, and drop the `toBe(1)`. `allBut` and `sameZones` already work on the whole set.

4. **The outputs check matches values to names by position in two separate lists.**
   - **Where:** `src/games/startup-simulator.test.ts:2802`
   - **What's wrong:**
     - The before/after compare loops over a second literal, `['blue output', 'red output']`.
     - It reads `values[i]`, which comes from `OUTPUT_NAMES` (l.155).
     - A later reorder of `OUTPUT_NAMES` would compare different values. That would mostly fail loudly rather than silently.
   - **Fix:** `for (const [i, name] of OUTPUT_NAMES.slice(0, 2).entries())`.

### Declined to judge

- **Timing figures.** The implementers measured on a noisy machine. The best end figure is 21.62 s against 26.20 s at 8aedd05, well under the 30 s watch. I did not re-time, as the instructions asked.
- **The outputs check's before/after half.** For a kept value that is unchanged and whose zone holds the same cards, this half now holds by construction, because it reads through the same caching runtime.
  - The card-alone cache already worked this way before 6-2b.
  - The plan's ruling deliberately kept the full scan rather than checking only changed cards.
  - The fresh-runtime tests in `card-alone.test.ts` carry the check of C1's own claim.
  - Adding a fresh-runtime cross-check to the long runs is outside this plan.
- **Counted keys whose long-run coverage fell.**
  - A Bug cleaned by a QA Engineer fell from 3 games to 0.
  - A token kept by choice, keep blue in the ops team, a Visionary leading and a trained Junior declared red each fell from 1 to 0.
  - Toxic taking a Blue cube fell from 2 to 1.
  - All of these are disclosed in the retune proposal's table (l.193–198), accepted by the plan, and pinned by examples or arranged tests.
- **A required key held by 2 games dropping to 1 passes without a failure.** The tally test checks `> 0`. That is the point of the "2 or more games" margin, and it predates this plan.
- **Startup attribute names in the added lines of `card-alone.test.ts`** (`'toxic personality'`, `visionary`, `'Rainmaker'`, `startup`). This test file already compiled Startup at BASE, with 22 such lines. The plan's constraint covers shared code, and the non-test engine lines are clean.
- **Comment claims that need the Startup file run:** the Greenlight test reaching seed 6 instead of 10, and the 3-player seed 2 undo reaching all four moves by its 69th move. The probe measured both. I had no specific doubt, so I did not run the 21 s file.
- **Cost of the key walk for a large shared zone in some future game.** The walk is O(zone size) per read, the same order as the uncached `some` it replaces in work. No game in the repo tests a large shared zone.
- **Required keys held by only 1 game at BASE** (the 2- and 3-player replays' `reshuffles` and `strips`). This predates the plan, and the retune lifts them to 2–3.

### Recommendations

- Fold Minor 1, which includes the parked Task 1 comment, into the planned final fix wave. It is two comment lines, plus an optional source-text pin.
- Optional efficiency: intern `byZones` roots by the zone list, e.g. `zones.join('\n')`. Values testing the same zones would then share one chain. In Startup about 19 values test the one Event zone. The end node's `ofCard` map is keyed by card and then by name, so sharing is safe.
- Keep the exactly-2-game keys under watch in the next plan's pre-flight, as Review Focus 5 intends. Five of them, plus the 2-player replay's TechCrunch Feature, depend on the seed-2 games that the retune lengthened.

### Assessment

**Ready to merge?** Yes

**Reasoning:** C1 keys each kept value on exactly what its lines read: the card object and the card objects of the zones it tests, resolved by the same function on both sides. Its memory is bounded per runtime, and no code changes a cards array in place. The retune keeps every required key at 2 or more games and only reorders presses that the engine still judges. The four Minor items are comments and test tidy-ups, not defects.
