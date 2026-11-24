# Plan 8-1's pre-flight, stopped part-way (the owner paused the work)

The pre-flight built plan 8-1 as written on a scratch clone of `759412d` (7-2b's finished head plus docs), one commit per task (`T<n>`) and one per finding (`A-T<n>…`), and was stopped after Task 6 of 8. No report was written. The probe lived in the session scratchpad (`pf81/probe`, branch `pf81`), which a new session will not have, so its commits are listed here: each `A-` commit's message is a finding and its amendment. A fresh pre-flight should rebuild from `plan 7-3`'s finished head, using these as a head start, then do T7–T8, the final checks, the removal probe, timing and the report.

## The probe's commits, oldest first

- **9b5ad04 T1: steps down and shares, as written**

- **1fcf2cf A-T1: the Potter's values are 0 (a section not named after a column starts from 0); card-alone's pin trusts the five phrases, with a section and a runtime test**

- **9e22fe4 T2: prices paid through a card and its owner, a target card's price, a room for a card, as written**

- **ff42090 A-T2: worked-view's pinned player-value list gains the room line, judged not shown**

- **0d81065 T3: a zone of a card's owner, as written (zones.ts imports ownerOf, itCard and NO_OWNER from the library)**

- **2d1d500 A-T3a: zones.ts reads the owner of the card itself and NO_OWNER moves there (board-phrases imports and re-exports it), as 7-1 did with NAMES_NO; the library import loops break four test files at load**

- **f31c0b1 A-T3b: the 3-player tip test makes its Stakes by hand (Setup can't deal 2 jobs to 3 stashes from a pile of 4), and the owner-fact test reads no game (an error leaves none)**

- **a3a3c7e A-T3c: a card move to or from its owner's zone is refused with NAMED_ZONE_IN_MOVE, as 7-1 R3 refused its maker's; it compiled silently**

- **18937a0 T4: cards on cards in their own zone, the card it is on by a flag, a card moved with everything on it, as written**

- **60157f1 A-T4a: NEST_GAME's For each line says "that are tired": a For each line reads its cards as "the cards …", so "that is" names no cards at HEAD**

- **f28a5f2 A-T4b: aboutCards already refuses a picked card as its target (6-1), pinned by an existing Review Focus test with the button's prompt; ONTO_ITSELF dropped and the new tests expect that prompt**

- **51f6652 A-T4c: the loop refused at the press names the Statue, the first card of the loop in the state's order at seed 1**

- **92fd94e A-T4d: worked-view's pin of the phrases that read the card it is on leaves out the two flag forms, which stay outside HOLDER_PHRASES (fail closed)**

- **4dc5072 T5: pairs from a table, as written (the takes column cut at OR_SEPARATORS)**

- **87d6a26 A-T5a: a row's second cell is cut at ", and", " and", ", or", " or" and ", " (SEPARATORS with OR_SEPARATORS): OR_SEPARATORS has no " and ", so PAIR_GAME's "red and mixed" is one value no card has**

- **53a9213 A-T5b: the misnamed-column test renames the header too: with "by their crafts" over a "craft" header, PAIRS_FIRST_COLUMN('crafts') comes first, with no suggestions**

- **367ad98 A-T5c: the pairing test under a button that picks nothing gets the needsMove message, which unmetNeed says before needsOnto's**

- **e2d4f0f A-T5d: a card paired onto itself is refused with the button's prompt, as A-T4b leaves aboutCards (no ONTO_ITSELF)**

- **bee0c69 T6: asking players part-way through a button's lines: the line and its refusals, as written**

- **66290f6 probe: the acting-elsewhere test finds the line it added (both lines stand in later phases too)**

- **9a289ed A-T6a: the wage line's acting-elsewhere test sits in a button with a target (needsOnto is told before needsActing)**

- **4bd1511 A-T6b: 7-1's tests that read the pile's size through a worked flag read what it holds instead (a zone's size is public now)**

- **79ae260 A-T6c: an ask's Only if lines check the zone the card is picked in when they read the card, and the target's when they read the target**

- **1032799 A-T6d: phrases.test's pinned get line gains countsOnly: false**


## What each changed

```
 src/engine/core/lang/action-window.test.ts         | 200 ++++++++++++++++++++-
 src/engine/core/lang/action-window.ts              |  20 +++
 src/engine/core/lang/attach.test.ts                |  17 ++
 src/engine/core/lang/attach.ts                     |  59 ++++++
 src/engine/core/lang/card-alone.test.ts            |  25 ++-
 src/engine/core/lang/compile-phase.test.ts         |  21 +++
 src/engine/core/lang/compile-phase.ts              |  48 ++++-
 src/engine/core/lang/compile-util.ts               |  31 +++-
 src/engine/core/lang/compile.test.ts               |  84 +++++++++
 src/engine/core/lang/compile.ts                    | 185 ++++++++++++++++---
 src/engine/core/lang/declared-actions.test.ts      |  15 ++
 .../core/lang/library/attach-phrases.test.ts       | 116 ++++++++++++
 src/engine/core/lang/library/attach-phrases.ts     |  23 +++
 src/engine/core/lang/library/board-phrases.test.ts |  55 ++++++
 src/engine/core/lang/library/board-phrases.ts      |  18 +-
 .../core/lang/library/card-pick-phrases.test.ts    |  29 +++
 src/engine/core/lang/library/card-pick-phrases.ts  |  30 ++++
 .../core/lang/library/card-subject-phrases.ts      |  20 ++-
 .../core/lang/library/card-value-phrases.test.ts   |  61 +++++++
 src/engine/core/lang/library/card-value-phrases.ts |  14 +-
 src/engine/core/lang/library/flow-phrases.ts       |  16 +-
 .../core/lang/library/player-value-phrases.test.ts |  20 +++
 .../core/lang/library/player-value-phrases.ts      |  14 ++
 src/engine/core/lang/library/support.ts            |   2 +-
 src/engine/core/lang/library/turn-phrases.ts       |  10 ++
 src/engine/core/lang/pairings.test.ts              | 151 ++++++++++++++++
 src/engine/core/lang/pairings.ts                   |  94 ++++++++++
 src/engine/core/lang/phrases.test.ts               |   2 +-
 src/engine/core/lang/phrases.ts                    |  11 +-
 src/engine/core/lang/refs.test.ts                  |  21 ++-
 src/engine/core/lang/refs.ts                       |  15 +-
 src/engine/core/lang/testing.ts                    | 104 +++++++++++
 src/engine/core/lang/types.ts                      |   8 +-
 src/engine/core/lang/worked-view.test.ts           |  33 +++-
 src/engine/core/lang/zones.test.ts                 |  34 ++++
 src/engine/core/lang/zones.ts                      |  12 ++
 36 files changed, 1560 insertions(+), 58 deletions(-)
```
