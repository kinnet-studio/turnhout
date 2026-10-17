# Startup Simulator Slice 6-3 (The page) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The playtest page shows slice 6. The Event in play stands on the shared table with its effect written out above the canvas; the University's prices show on the bank line, at $0 too; Attribute counts and Hype are labelled on their cards, and the hover line names a card's whole label; a Debuff picks its target from a list that names each rival card's seat and zone; the bandwidth gauges count Toxic Personality and the Event; and the seat tabs follow each player's step of the event check.

**Architecture:**
- **This is plan 6-3, the page,** after plans 6-2a and 6-2b (Task 1 may run earlier, see G1). It takes plans 4-3 to 6-2b as given (see "Assumed from earlier plans").
  - It changes one thing in the rules text: the Event table gains an `effect` column, the rulebook's text of each Event (6-2b left the Event's text to this plan). No phrase, no rule and no example changes.
  - What the page needs and those plans don't provide is listed under "Gaps".
- **Five tasks:**
  1. the view reads the card in play (core);
  2. the Event in play, its effect and the prices on the page (core numbers, faces, rules column, tableaux);
  3. Attributes, Utility cards and Hype on the faces (the hover line);
  4. another seat's card picked from the list, and the steps at a round's start (picker, playtest);
  5. the browser check, the README and the final checks.
- **Nothing in shared code knows Startup Simulator.**
  - Core: `queue-phrases.ts` exports `CENTRE_HAS`; `worked-view.ts` gains a `centre` reading, `inPlayZones` and `thenRefs`; `game-numbers.ts` exports `PAY_NUMBER`; `board-view.ts` gains `paidNumbers`; `cards.ts` gains `isSentence`.
  - Rendering: `text-faces.ts` leaves a sentence off a face.
  - Page: `tableaux.tsx` gains `inPlayLines`; `card-pick.ts` gains `placesOf`; `CardPicker` gains `places`; `playtest.tsx` names the label on the hover line, passes the places and keeps decor to drawn cards.
- **Calls this plan makes** (the spec leaves "how the Event and Attributes look" to the builder):
  1. **Modifiers from the card in play are never labelled, but what they change is shown.**
     - A flag whose own lines test a card in the centre (`Only if the event in play has the Server Crash.`) holds for every card alike; the card in play's line says it once. So `shownFlags` never labels one, as 6-1's README already promises.
     - A value or flag that reads such a flag further down (the bandwidths, the made values, the supplies, `losing blue`) reads only what every seat sees, since the zone is public. So a test of a shared zone everyone can see counts as read for stand-ins, player values and labels (`centre`), and the gauges come back (G1).
     - A zone no one sees (a deck) is never read so: the value fails closed, as before.
  2. **The card in play gets a line of its own.** A shared zone everyone can see that a worked value or flag reads with `CENTRE_HAS` (`inPlayZones`: the event in play) is written out first in the tableaux, each card in full: `event in play: Tech Bubble — effect All Active Maintenance Products generate +$1 Revenue this round.` It changes with the view.
  3. **The Event's text.** The Event table gains an `effect` column with §20.D's text, shortened only where the rulebook adds flavour. The four Events whose systems come later end `Not in effect yet.`, and Patent Trolls says only its Greenlight License is. A face has no room for a sentence, so a face leaves off any value that is one (`isSentence`); the hover line and the card in play's line give it.
  4. **Prices.** A game number a button pays to the bank (`They pay the junior price.`) is a price, and the bank line shows it even at 0: `license 3 · junior price 0 · hardware junior price 0` under Intern Season. Other numbers at 0 stay off the line as before, so Rent Day's `high bid` and cash numbers are unchanged.
  5. **Counts and Hype** are 4-3's and 5-3's labels (lone counts on a Board, kept counts off it): `1 workaholic`, `2 hype`. R2's "badges under the Talent's face" is that corner label, which shows in a stack's strip where a caption would be covered. A label longer than the strip shows is named in full on the hover line, for example `Junior Software Dev — cost 2 · skill software · output 1 · salary 0 — 1 workaholic, 1 burnout`.
  6. **The Debuff picker.** A rival's cards are not drawn on the one-seat table, so they are picked from the list under the buttons. A card in another seat's zone is listed with its place: `Engineer (p1's development team)`. A click on the canvas still offers the Debuff for the card in hand. The decor keeps only the cards this canvas draws, so no ring is set for a card it doesn't.
  7. **The seat switcher** needs no new code: `seatToAct` reads `turn.current`, which the round's steps move seat by seat. Task 4 pins it.
  8. **The attributes in play** is a shared pile, drawn on the shared table by `fittedLayout` with its cards face up. It needs no code; Task 3 pins it.
  9. **Slice 6's buttons name no new press flag** (5-3's forward note): their `Then:` lines test card kinds, not worked flags. Task 1 pins `pressFlags` unchanged.
- **Parked:** the card in play's line on a page that fits one table; clicking a rival's card on its Board line.

**Tech Stack:** TypeScript (strict), Bun, Vitest + happy-dom, React 19, PixiJS 8; Playwright (global install, Chromium in `/opt/pw-browsers`) for the browser check.

**Spec:** `docs/superpowers/specs/2026-10-16-startup-slice-6-attributes-utility-events-design.md` is binding, above all "The page" and the rulings R1–R3:
- "The Event in play sits on the shared table with its text";
- "Attributes show under their Talent; Hype shows as a badge on the product";
- R2: "The page shows the counts as badges under the Talent's face".

It sits under `docs/superpowers/specs/2026-10-16-startup-simulator-overview-design.md`, also binding: "The page" (the shared table holds the Event in play; the seat switcher jumps to the seat that must act; the Event in play is a page feature), its anti-goals (hidden information leaking; Startup words in shared code) and "Designers never see engine words". These plans are inputs, with their Global Constraints amendments:
- 4-3 and 5-3 (`…-4-3-the-page.md`, `…-5-3-the-page.md`): the models for this plan;
- 6-1 (`…-6-1-language.md`): its "Left to 6-3";
- 6-2a and 6-2b (`…-6-2a-…`, `…-6-2b-…`): their forward notes for 6-3 and 6-2a's Gap 1.

## Global Constraints

- **Sequencing (controller ruling).** Task 1 runs before plan 6-2b's Task 2; Tasks 2–5 run after 6-2b. The Event `effect` cells that say "Not in effect yet." are edited by slices 7–10 when they switch those Events on. Task 2's face change (a value that is a sentence is left off the face) must leave the four other games' pages and tests unchanged; pre-flight verifies Rent Day's `says` faces aren't drawn anywhere.

- **Branch and commits.** Develop on `claude/peaceful-curie-rdfkow`. Commit by pathspec, never `git add -A`. Every commit message ends with these two lines and contains no model identifiers:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC`
- **Protected files never change:** `src/engine/core/game-state.ts`, `src/engine/core/flow.ts`, `src/engine/core/game-engine.ts`, `src/pages/hearts-demo/**`.
- **The core stays pure:** no pixi/react/DOM in `src/engine/core/**`, no `Math.random` or `Date.now`.
- **State is Json-only, under `lang:*` keys.** This plan adds no `state.data` key, no card `data` key and no move field. The view's shapes are unchanged: `gameNumbers` only lists more entries.
- **No Startup Simulator words in shared code** (code, comments, test names and shared test fixtures). The banned list is plan 6-1's: 1b-2's, slice 3's, 4's and 5's words, and slice 6's (workaholic, clean coder, visionary, toxic, burnout, flight risk, techcrunch, design sprint, cease, desist, hype, utility, buff, debuff, venture capital, bubble, patent, troll, angel, investor, legacy, regulation, audit, open source, hackathon, chip shortage, crunch, server crash, logjam, frenzy, intern, headhunter, course boom, whistleblower, trade show, event), and "Attribute" in the game's sense.
  - **Where they may appear:** `src/games/startup-simulator.*`; `src/pages/designer/designer-page.test.tsx`, `playtest-fitted.test.tsx` and `tableaux.test.ts`; `src/pages/designer/samples.ts`; `README.md`; `docs/`.
  - Shared code says "the card in play" or "a card in the centre", never "event". The page's word "badge" (the corner label) is 5-3's older use; core code says "label".
  - Ordinary words to avoid: "a mistake in the code", not "a bug"; "waiting", not "pending"; "goes to", not "leads".
- **Hearts, Color Match, Venom and Rent Day stay unchanged** (Rent Day keeps its 108 examples): no new view key, no in-play line, no new decor, no bank line entry. One drawing changes and is reported: Rent Day's `says` sentences are left off its faces, which no page draws (a board game whose phases move no cards has no card table); the four games' face test stands unchanged.
- **Every number comes from the rulebook.** Each Startup test says where its numbers come from.
- **Hidden information** (overview anti-goal; 3-2's, 4-3's and 5-3's lessons):
  - What the view shows is decided by the compiled rules alone, never by which hidden cards are where.
  - The view never carries a value worked out from a card or zone the seat can't see: `centre` reads only a shared zone everyone can see.
  - Labels, places, the card in play's line and Board text read only the cards as the seat's scene gives them; a face-down card has no data and gets none.
- **A ring or picker never outlasts its view.** Everything this plan adds to the page is derived from the latest view in the render that receives it, and adds no page state.
- **No measured `Text`.** A `Text`'s size is never measured under happy-dom. This plan adds no Pixi text; any width is taken with `boldTextWidth`.
- **Earlier plans come first.** In execution order: 4-2, 4-3, 5-1, 5-2a, 5-3 Task 1, 5-2b, 5-3 Tasks 2–4, 6-1, 6-2a, 6-2b. Their code is referred to by the names their Interfaces blocks give. Each task re-checks the names it consumes at HEAD before starting, and stops and reports one that differs.
- **Files this plan changes outside page and core code:** `src/games/startup-simulator.rules` (the Event table only, Task 2), `src/games/startup-simulator.test.ts` (appended tests and Task 1's named pins), `README.md`.
- **Existing tests.**
  - No existing test line changes, except the ones Task 1 names.
  - New names are imported on new `import` lines.
  - If any other existing test fails, stop and report it.
- **The browser check** uses the pre-installed Chromium (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`; never `playwright install`).
  - Its scripts and screenshots stay in `/tmp/claude-0/-home-user-turnhout/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/browser-6-3/`, never in the repo.
  - Its setup lines go where every seed sets up: after the Juniors go to the benches and before Setup's deal, checked at seeds 1 to 10.
- **Page copy (exact):**
  - **The card in play:** `{zone}: {card}; {card}`, each card as the hover line gives it (`cardDetail`), in slot order, in `<div data-testid="in-play-{zone id}">`, first in the tableaux, in `#d1d5db`. A zone with no card has no line.
  - **A place in the picker:** `{name} ({seat}'s {zone})`, on the button and in its aria-label `Pick {name} ({seat}'s {zone})`.
  - **The hover line with a label:** `{cardDetail} — {label}`.
  - **The bank line:** as before, with a price at 0 written `junior price 0`.
- **Commands.**
  - Single file: `bunx vitest run <path>`. Full suite: `bun run test`. Types: `bun run typecheck`.
  - Before the first task this plan runs, record `BASE=$(git rev-parse HEAD)` and run `bun run test` once for the passing count and the long runs' time. If Task 1 runs ahead of 6-2b (G1), also record `BASE2` before Task 2; Task 5's checks then cover Task 1's commit and `BASE2..HEAD`.
- **No new dependencies.**
- **Style.**
  - 2-space indent, single quotes, comments that say why.
  - TDD every task: failing test → watch it fail → implement → pass → `bun run typecheck` → commit.
  - A test marked "(guard)" passes before its task's change, and says so.

## Review Focus

- **A flag that reads a centre zone no one sees** (a deck), or reads one everyone sees only through another value.
  - Expected: through a hidden zone, no stand-in, no player value, no gauge and no in-play line; through a public one, the values are shown and the flag that tests the zone itself is never labelled.
  - Test: Task 1.
- **The card in play replaced at the next round start, or a round start undone.**
  - Expected: the in-play line, the prices and the gauges follow the view; nothing of the old card stays on the page.
  - Test: Task 2.
- **A price at 0.**
  - Expected: a number a button pays shows at 0; Rent Day's numbers at 0 stay off its bank line.
  - Tests: Task 2.
- **Two rival cards of the same name as targets, or a click on the presser's own card while a rival's is asked for.**
  - Expected: each target is listed with its seat and zone; the own card explains with the prompt and nothing is sent; no ring is set for a card the canvas doesn't draw.
  - Test: Task 4.
- **A round's steps that all pass at once, a short seat that is not the start player, and Undo across a step.**
  - Expected: the tab follows the seat the steps wait on, then the start player; Undo brings the step and its tab back.
  - Test: Task 4.

## Assumed from earlier plans (check before Task 1)

Re-read each item at HEAD by name, not by line; if one is missing or differs, stop and report it.

- **HEAD (3-2, 1b-3):** `card-detail.ts`'s `cardDetail`; `board-view.ts`'s private `gameNumbersIn` and `cardsKept`, `seesFace`, `seatExtras`; `board-controls.tsx`'s `bankLine`; `zones.ts`'s `zoneInfo`, `zoneIdFor`, `relocate`; `board-state.ts`'s `setGameNumber`, `setCounter`; `card-pick.ts`'s `ringsOf`, `ontoChoices`, `clickCard`; `seat-status.ts`'s `seatToAct`; `text-faces.ts`'s private `detailsOf`; `cards.ts`'s `isSaysColumn`.
- **4-3 (built):** `shownPlayerValues`, `gaugePairs`, `PlayerValuesView`, `PLAYER_TOTAL`, `GAUGED_GAME`; `gaugesOf`, `SHORT_COLOR`, `Tableaux({ game, seats, board, cards, worked, playerValues })`; `boardBadges(game, cards, worked?)`, `loneCounts`; the `playtest-fitted.test.tsx` helpers `askedGroup`, `askedOptions`, `answerAsked`, `seatButtons`; its gauge tests and their Startup pins.
- **5-3 (built):** `fittedBounds`; `readsOnlyCards`'s optional `holder` argument; `pressFlags`, `holderFlags` and the private walk of a button's `Then:` lines they use; `keptBadges(game, cards)` and the decor merge `{ ...keptBadges(…), ...boardBadges(…) }`; `$SCRATCH/../browser-5-3/check.cjs` (`at()` reading the canvas box, `rowCard`, `STRIP`, `BOARD`, `hover`, `click`, `waitFor`, `press`, `pressIn`, `group`, `line`).
- **6-1 (built, with its pre-flight amendment):**
  - `{ others: … }` targets, `ontoZoneIds`, `othersZoneIds`; `JINX_GAME`, `CHARM_GAME`, `PRICE_GAME`, `OMEN_GAME`; `ROUND_STEPS_KEY`, `roundStepsOf`;
  - **the controller's ruling:** worked-view counts an owner-scope test of a zone everyone can see (`its owner has a card in their ops team …`) as read. If it is missing, stop and report (G2).
- **6-2a (built):** the zone `attributes in play`; the counts `workaholic` … `flight risk` and `hype`; the buttons `play a card from their strategy hand to a card in another player's development team or another player's ops team`, `… to a card in their operations` and `play a card in their strategy hand`; the flags `overworked`, `burned out`, `losing blue`/`red`/`qa`, `pool losing blue`/`red`/`qa`, `pitched`; the Startup view pins as 6-2a's Task 6 commit left them.
- **6-2b (built):** the zones `event deck`, `event in play`, `event discard`; the Event table (`| name | copies |`); `EVENTS` in the test file; the game numbers `license`, `junior price`, `hardware junior price` set at each round start; the phase `event check` with its `Hint:` and the buttons `let go of a card in their development team` / `… ops team`; the round-start line `If some card in the event in play is acting once, each player has the event check, in turn from the start player.`

---

### Task 1: The view reads the card in play

Before starting:
- Re-check 5-3's `readsOnlyCards` (its parameters), `pressFlags` and `holderFlags`, 4-3's `shownPlayerValues` and `gaugePairs`, 6-1's `CHARM_GAME` with its `shownFlags`/`standIns` pins, and the owner-scope ruling.
- Read the Startup pins in `startup-simulator.test.ts` (`standIns(game)`, `shownFlags(game)`, `shownPlayerValues(game)`, `gaugePairs(game)`), and the same pins as 6-2a's Task 6 commit left them (`git log --oneline -- src/games/startup-simulator.test.ts`; the commit starting `feat(games): Startup Simulator's long runs play every Attribute`).
- Look for 4-3's gauge tests in `playtest-fitted.test.tsx` and `tableaux.test.ts` that 6-2a or 6-2b changed to the gauges' absence (`git log -p` on those files).

**Files:**
- Modify: `src/engine/core/lang/library/queue-phrases.ts` (export `CENTRE_HAS`), `src/engine/core/lang/worked-view.ts`, `src/engine/core/lang/testing.ts` (`GALE_GAME`)
- Test: `src/engine/core/lang/worked-view.test.ts` (append), `src/games/startup-simulator.test.ts` (append; changed pins in Step 1)

**Interfaces:**
- Consumes: `readsOnlyCards`, `cardOnlyNames`, `standIns`, `shownFlags`, `shownPlayerValues`, `CHARM_GAME`, `seatExtras`.
- Produces (for Tasks 2–5):

```ts
// queue-phrases.ts: used in its own registration
export const CENTRE_HAS = '{sharedzone} has {card}';
// worked-view.ts
// readsOnlyCards gains a last optional parameter `centre = false`. With it, a condition whose phrase is CENTRE_HAS and whose zone
// (args[0]) names a shared zone with visibility 'public' reads no name and counts as read; a zone that is not so reads beyond the card.
/** The shared zones everyone can see that a line of a worked value or flag reads with CENTRE_HAS, in Table order (Call 2). */
export function inPlayZones(game: CompiledGame): string[];
// testing.ts
/**
 * CHARM_GAME with FORCE_GAME's two values about each player, where a job's red left is its red need and 1 more while a Vase lies in the
 * scrap (windy), and a job whose red left is 3 is heavy and gets 2 more bonus.
 */
export const GALE_GAME = [
  CHARM_GAME.replace("  A charmed card's bonus goes up by its charms.",
    "  A charmed card's bonus goes up by its charms.\n  A heavy card's bonus goes up by 2."), '',
  'Red force:', "  A player's red force is the total red work of the cards in their crew.", '',
  'Red load:', "  A player's red load is the total red left of the cards in their workshop.", '',
  'Red left:', "  A card's red left is its red need.", "  A windy card's red left goes up by 1.", '',
  'Windy:', '  Only if the scrap has a Vase.', '',
  'Heavy:', '  Only if its red left is 3.',
].join('\n');
```

- **`standIns`** and **`shownPlayerValues`** read with `centre` true.
- **`shownFlags`** keeps a flag when `readsOnlyCards(…, centre true)` holds for it and none of its own condition refs (every group's) has the phrase `CENTRE_HAS` (Call 1).
- **`pressFlags`** and **`holderFlags`** are unchanged.
- **`inPlayZones`** walks every `game.worked` value: a number's refs, a flag's condition refs.

- [ ] **Step 1: Write the failing tests.**

  In `worked-view.test.ts`, append `describe('a card in the centre')`, with `gale = compiled(GALE_GAME)` and `hidden = compiled(GALE_GAME.replace('  Only if the scrap has a Vase.', '  Only if the pile has a Vase.'))`:
  - **The fixture.** `GALE_GAME` compiles with `[]`; assert that its `.replace` found its text, and so did `hidden`'s.
  - **Shown through the centre.**
    - `standIns(gale)` is `{ 'red need': 'red left' }`.
    - `shownPlayerValues(gale)` is `['red force', 'red load']`.
    - `shownFlags(gale)` is `shownFlags(compiled(CHARM_GAME))` (6-1's pin, read at HEAD) followed by `'heavy'`: `gusty` and `windy` test the scrap themselves, so neither is ever labelled, and `heavy` reads it only through `red left`.
    - `inPlayZones(gale)` is `['scrap']`.
  - **Review Focus: a centre no one sees.** `standIns(hidden)` is `{}`, `shownPlayerValues(hidden)` is `['red force']`, `shownFlags(hidden)` is 6-1's `CHARM_GAME` pin, and `inPlayZones(hidden)` is `['scrap']` (gusty's).
  - **The view.** A 2-player `GALE_GAME` engine at seed 1, arranged with `relocate` and `putOn`: p0's workshop holds the first Vase, with the first Potter on it in `crew-p0`; the second Vase lies in the scrap.
    - For viewers p0 and p1: `worked[vase].columns['red need']` is 3, `worked[vase].flags` contains `'heavy'`, and `playerValues` is `{ p0: { 'red force': 1, 'red load': 3 }, p1: { 'red force': 0, 'red load': 0 } }`.
    - With the second Vase moved to the pile: `columns['red need']` is 2, no `heavy`, and p0's `red load` is 2.
    - With the second Vase in the scrap and the first Statue there too: p0's `red force` is 0, and `worked[potter]` has no entry (`gusty` holds, but is never labelled).
  - **The phrases counted.** Spy on `PhraseLibrary.prototype.condition` while running `registerQueuePhrases(new PhraseLibrary([...STATIC_TYPES, ...VOCAB_TYPES]))`. The conditions it registers are exactly `[CENTRE_HAS]`, so a new one there must be judged here first.
  - **(guards)**
    - `shownFlags`, `standIns` and `inPlayZones` of Hearts, Color Match, Venom, Rent Day, `CREW_GAME` and `FORCE_GAME`: `[]`, `{}` and `[]`.
    - 6-1's `CHARM_GAME` pins, 4-3's `shownPlayerValues` and `gaugePairs` tests, and 5-3's `pressFlags` tests pass unchanged.

  In `startup-simulator.test.ts`, append `describe('what the view reads in the centre')`:
  - `inPlayZones(game)` is `['event in play']`.
  - `pressFlags(game)` and `holderFlags(game)` are 5-3's pins (Call 9).
  - `shownFlags(game)` holds none of 6-2b's flags: `bubbly`, `legacy`, `open source boosted`, `hackathon boosted`, `server crashed`, `logjammed`, `chip short`, `course priced`, `show priced`, `blue covered`, `crunching blue`, `crunching red`, `crunched`, `acting once`, `angel funded`, `past tier 1`, `taxed`.
  - **Changed lines (only if 6-2b dropped them).** Where HEAD's `standIns`, `shownFlags`, `shownPlayerValues` or `gaugePairs` pin lacks an entry 6-2a's Task 6 commit pinned, it is put back in the order the code gives. `standIns` also keeps 6-2b's `'blue made': 'blue reached'`. `gaugePairs(game)` is 4-3's `[['blue supply', 'blue demand'], ['red supply', 'red demand']]`. Name each changed line in the report. When Task 1 runs ahead of 6-2b (G1), nothing was dropped and the pins pass unchanged as guards.
  - **Changed lines in the page tests.** A 4-3 gauge test that 6-2a or 6-2b changed to the gauges' absence is put back as 4-3 wrote it, with the values 6-2a's examples give. Name each.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/worked-view.test.ts src/games/startup-simulator.test.ts`. Expected: FAIL (`CENTRE_HAS`, `inPlayZones`, `GALE_GAME` and the centre reading are missing; the guards pass).
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** `bunx vitest run src/engine/core/lang src/games src/pages/designer`, then `bun run test` and `bun run typecheck`.
  - 4-2's "plays the same game through the page's view as without it" passes unchanged.
  - Report the long runs' time if it grew by more than a third.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/library/queue-phrases.ts src/engine/core/lang/worked-view.ts src/engine/core/lang/testing.ts \
  src/engine/core/lang/worked-view.test.ts src/games/startup-simulator.test.ts
# and each page test file Step 1 changed, named in the report
git commit -F - <<'EOF'
feat(lang): the view reads a card in a shared zone everyone can see as it reads the card itself, never labels a flag that tests one, and names the zones whose cards change what the rules work out

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 2: The Event in play, its effect and the prices on the page

Before starting: re-check Task 1's `inPlayZones`, 5-3's walk of a button's `Then:` lines, 6-2b's Event table, zones, game numbers and recruit buttons (`They pay the junior price.`), and 4-3's `gaugesOf` at HEAD.

**Files:**
- Modify: `src/engine/core/lang/cards.ts` (`isSentence`), `src/engine/pixi/text-faces.ts` (`detailsOf`)
- Modify: `src/engine/core/lang/library/game-numbers.ts` (export `PAY_NUMBER`), `src/engine/core/lang/worked-view.ts` (export `thenRefs`), `src/engine/core/lang/board-view.ts` (`paidNumbers`; `gameNumbersIn`)
- Modify: `src/pages/designer/tableaux.tsx` (`inPlayLines`; the lines first)
- Modify: `src/games/startup-simulator.rules` (the Event table)
- Test (all append): `src/engine/core/lang/cards.test.ts`, `src/engine/pixi/text-faces.test.ts`, `src/engine/core/lang/board-view.test.ts`, `src/pages/designer/tableaux.test.ts`, `src/pages/designer/playtest-fitted.test.tsx`, `src/games/startup-simulator.test.ts`

**Interfaces:**
- Consumes: Task 1's `inPlayZones`; `cardDetail`; `setGameNumber`; `relocate`.
- Produces (for Tasks 3–5):

```ts
// cards.ts
/** Whether a card's value is a sentence: it has a space and ends with '.', '!' or '?'. A face has no room to say one (Call 3). */
export function isSentence(value: string): boolean;
// text-faces.ts: detailsOf leaves out every value that isSentence, before taking the first FACE_DETAILS.
// game-numbers.ts: used in its own registration
export const PAY_NUMBER = 'they pay the {gamenumber}';
// worked-view.ts: 5-3's walk, exported; pressFlags reads through it
/** Every ref a button's Then: lines can run: into an if's condition and effect, a for's and a for each's effect, each CHOOSE_ONE option's effects and a CHOOSE_PLAYER's effect. */
export function thenRefs(action: DeclaredAction): PhraseRef[];
// board-view.ts
/** The game numbers a button pays to the bank (an effect ref with the phrase PAY_NUMBER), in the order declared: prices (Call 4). */
export function paidNumbers(game: CompiledGame): string[];
// gameNumbersIn keeps a number at 0 when paidNumbers names it; every other number at 0 is left out as before.
// tableaux.tsx
/** Each zone of inPlayZones(game) that holds cards, by zone id, as the Page copy says, in Table order. */
export function inPlayLines(game: CompiledGame, cards: CardState[]): { zoneId: string; text: string }[];
// playtest-fitted.test.tsx, module level, for Tasks 3–4
/** `state` with the named card the only one in the event in play (any other there goes to the event discard), and license 3, junior price 2, hardware junior price 2 (§20.D's printed prices). */
const inPlay: (state: GameState, name: string) => GameState;
/** `state` with the named card moved to the top of the event deck (relocated there, so last in slot order). */
const onTop: (state: GameState, name: string) => GameState;
/** A 2-player state after Setup at SEED, its start player and the other seat. */
const setUpTwo: () => GameState; const FIRST2: string; const SECOND2: string;
const inPlayLine = () => screen.getByTestId('in-play-event-in-play').textContent;
const bankText = () => within(screen.getByTestId('tableaux')).getByText(/^license /).textContent;
```

- **`Tableaux`** renders `inPlayLines(game, cards)` first, one `<div>` each (Page copy), before the seats' lines.
- **The Event table** (§20.D). In `  A deck called events, starting in the event deck:`, the table becomes, exact copy:

```text
    | name                         | effect | copies |
    | Venture Capital Rain         | Whenever a player Invests in a Founder this round, the Bank pays that Founder $3 extra cash (not on Secondary Trades or Buybacks). Not in effect yet. | 1 |
    | Tech Bubble                  | All Active Maintenance Products generate +$1 Revenue this round. | 1 |
    | Patent Trolls                | This round the Tag Owner's share of every license fee is $5 instead of $3; Bank fees don't change. Only the Greenlight License is in effect yet. | 1 |
    | Angel Investors              | When revealed, each player with at least one Tier 1 product and no Tier 2 or 3 product, in Development or Maintenance, gains $3. | 1 |
    | Legacy Code                  | Revenue Decay is -$2 per Bug instead of -$1 this round. | 1 |
    | Regulation Audit             | When revealed, every player pays $1 for each Employee on their Board whose Salary is above $0 (Juniors with 0-1 XP are exempt); a player who can't pay lets staff go, choosing who. | 1 |
    | Open Source Boom             | Every staff member working in Software gets +1 Output this round, in Development and in Ops bandwidth. | 1 |
    | Hardware Hackathon           | Every staff member working in Hardware gets +1 Output this round, in Development and in Ops bandwidth. | 1 |
    | Chip Shortage                | Hiring any talent whose native skill is Hardware costs +$3 this round, from any source; Flex staff are not affected. | 1 |
    | Crunch Time                  | Every Development project that isn't Stalled produces +1 Cube (Blue if it still needs Blue, otherwise Red), staffed or not, and adds 1 Bug unless a Clean Code unit works on it. | 1 |
    | Server Crash                 | All Software staff in the Ops Zone produce -1 Bandwidth this round. | 1 |
    | Supply Chain Logjam          | All Hardware output is -1 this round, in Development and Ops. | 1 |
    | Recruiter Frenzy             | The poach multiplier is x1 instead of x2 this round; Token Value still counts. Not in effect yet. | 1 |
    | Intern Season                | Recruiting from the University costs $0 this round. | 1 |
    | Headhunter Holiday           | Hostile Offers (Poaching) are suspended this round. Not in effect yet. | 1 |
    | Online Course Boom           | Every Training card costs $1 instead of its printed price this round. | 1 |
    | Whistleblower Protection Act | The Bank Reward for a successful Audit (Settlement) is doubled to $8. Not in effect yet. | 1 |
    | Trade Show                   | TechCrunch Feature costs $2 instead of $5 this round; it doesn't stack with the Sales Rep perk. | 1 |
```

- [ ] **Step 1: Write the failing tests.**

  In `cards.test.ts`, append `describe('isSentence')`: `'They pay 50.'`, `'Strike first!'` and `'Who goes?'` are sentences; `'Red Dragon'`, `'St.'`, `'7'` and `''` are not.

  In `text-faces.test.ts`, append `describe('a sentence on a face')`, with the file's `drawn`, `card` and `labels`:
  - `textFaceKey({ name: 'Gale', effect: 'The fee goes up by 2 this round.' })` draws `Gale` and its corner, and no line starting `effect:`; its label has the big centred style (`{ fontSize: 24, wordWrapWidth: 80, anchorY: 0.5, y: -12 }`).
  - `textFaceKey({ name: 'Goblin', motto: 'Strike first!', attack: 3, defense: 2, speed: 1 })` lists `attack: 3`, `defense: 2` and `speed: 1`: the sentence gives up its place.
  - **(guards)** "the faces of the four games" and "lists only the first three detail lines" pass unchanged.

  In `board-view.test.ts`, append `describe('prices')`:
  - `paidNumbers(OMEN_GAME)` is `['fee']`; `paidNumbers(PRICE_GAME)` is `[]` (raising the fee pays nothing); `paidNumbers` of Rent Day is `[]` (its `They pay the high bid.` is a rule's, and its cash numbers are paid to a player).
  - A 2-player `OMEN_GAME` engine with `setGameNumber(state, 'fee', 0)`: p0's `board.gameNumbers` is `[{ name: 'fee', value: 0 }]`.
  - **Review Focus (guard).** The same for `PRICE_GAME`: `[]`. Rent Day's existing bank-line tests pass unchanged.

  In `tableaux.test.ts`, append `describe('the card in play and the prices')`, on the file's 3-player engine:
  - **The arrangement:** the cards of `event-in-play` go to `event-discard`; the Intern Season goes to `event-in-play`; `junior price` and `hardware junior price` are set to 0 and `license` to 3.
  - `inPlayLines(startup, state.cards)` is `[{ zoneId: 'event-in-play', text: 'event in play: Intern Season — effect Recruiting from the University costs $0 this round.' }]`.
  - Rendered with `board` from p0's `seatExtras`:
    - the first child of `tableaux` is `in-play-event-in-play`, reading that text;
    - the last line reads `license 3 · junior price 0 · hardware junior price 0`.
  - With the Intern Season moved to the event discard as well, `inPlayLines` is `[]`, and no `in-play-` test id is rendered.
  - **(guard)** Color Match's `Tableaux` renders no `in-play-` test id, and "reads each seat's Board once…" passes unchanged.

  In `startup-simulator.test.ts`, append `it('gives every Event its effect, a sentence the page shows while it is in play, and makes the University prices the numbers a button pays (§20.D)')`:
  - every card of the event deck in `fresh()` has an `effect` that `isSentence`, and the 18 effects are distinct;
  - in a fresh 5-player game, every face value that `isSentence` is an Event's `effect`;
  - `paidNumbers(game)` is `['junior price', 'hardware junior price']`.

  In `playtest-fitted.test.tsx`, define the module-level helpers above, then append `describe('the Event in play and the prices on the page')`, with `tab` local and `hover`/`detail` as the hover describe defines them:
  - **A reveal through the page.** Mount `onTop(inPlay(setUpTwo(), 'Whistleblower Protection Act'), 'Intern Season')` with `players: 2`.
    - `inPlayLine()` is `event in play: Whistleblower Protection Act — effect The Bank Reward for a successful Audit (Settlement) is doubled to $8. Not in effect yet.`, and `bankText()` is `license 3 · junior price 2 · hardware junior price 2`.
    - Press `End your actions` twice (FIRST2's, then SECOND2's):
      - `tab(`${FIRST2} — to act`)` is selected;
      - `inPlayLine()` is `event in play: Intern Season — effect Recruiting from the University costs $0 this round.`;
      - `bankText()` is `license 3 · junior price 0 · hardware junior price 0`;
      - `inOrder('event-in-play')` names `['Intern Season']`, its decor has no label, and hovering it shows `cardDetail` of its face.
    - Press `Recruit a junior software dev`: `lineOf(FIRST2)` starts `` `${FIRST2} 7 capital, 2 actions` `` and contains `bench 4`.
    - **Review Focus.** Press `Undo` twice: `inPlayLine()` names the Whistleblower Protection Act again, and `bankText()` is `license 3 · junior price 2 · hardware junior price 2`.
  - **The gauges count the Event and Toxic Personality** (Task 1, G1). Arranged on `setUp()`: a Dating App in `operations-${N}`, N's Junior Software Dev in `ops-team-${N}`; `gauges(seat)` is `screen.getByTestId(`gauges-${seat}`).textContent`.
    - With `inPlay(…, 'Whistleblower Protection Act')`: `gauges(N)` is `Blue supply 1 / demand 1 · Red supply 0 / demand 0`.
    - With `inPlay(…, 'Server Crash')`: `gauges(N)` is `Blue supply 0 / demand 1 (short) · Red supply 0 / demand 0`; `inPlayLine()` is `event in play: Server Crash — effect All Software staff in the Ops Zone produce -1 Bandwidth this round.`; and after clicking N's tab, `table!.decor?.[junior]` is undefined (Review Focus: no `server crashed` label).
    - With the Whistleblower Protection Act and `'toxic personality': 1` on the Junior: `gauges(N)` is `Blue supply 0 / demand 1 (short) · Red supply 0 / demand 0`.
  - **How the numbers come:**
    - §20.D 14: Intern Season makes the University $0; §6: a recruit costs 1 action, 3 − 1 = 2; the bench held 3 Juniors (setup);
    - §20.D: each round start resets the License to $3 and the University to $2;
    - §20.B: a Junior Software Dev's output is 1 Blue; §20.C.1: the Dating App's maintenance is 1 Blue / 0 Red;
    - §20.D 11: Server Crash takes 1 Bandwidth from each Software staff member in Ops; §20.A and R1: Toxic Personality takes one cube, Blue first, off its team's total, here the ops pool.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/cards.test.ts src/engine/pixi/text-faces.test.ts src/engine/core/lang/board-view.test.ts src/pages/designer/tableaux.test.ts src/pages/designer/playtest-fitted.test.tsx src/games/startup-simulator.test.ts`. Expected: the new tests FAIL, except the gauge tests, which pass after Task 1 and are guards; every existing test passes.
- [ ] **Step 3: Implement** the interfaces and change the Event table.
  - If a Startup line now reads two ways (an `ambiguous` diagnostic from the new column's words), stop and report it.
- [ ] **Step 4: Run** `bunx vitest run src/engine src/pages src/games`, then `bun run test` and `bun run typecheck`.
  - Startup compiles with `[]` and its example count is unchanged.
  - An existing check that reads the whole page's text for a hidden card's name may now find it in the in-play line (Trade Show names the TechCrunch Feature). If one does, stop and report it.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/cards.ts src/engine/pixi/text-faces.ts src/engine/core/lang/library/game-numbers.ts \
  src/engine/core/lang/worked-view.ts src/engine/core/lang/board-view.ts src/pages/designer/tableaux.tsx src/games/startup-simulator.rules \
  src/engine/core/lang/cards.test.ts src/engine/pixi/text-faces.test.ts src/engine/core/lang/board-view.test.ts \
  src/pages/designer/tableaux.test.ts src/pages/designer/playtest-fitted.test.tsx src/games/startup-simulator.test.ts
git commit -F - <<'EOF'
feat(designer): the card in play is written out above the table in full, a face leaves a sentence to the hover line, a price a button pays shows on the bank line even at 0, and each Event says its effect

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 3: Attributes, Utility cards and Hype on the faces

Before starting: re-check Task 2's `inPlay` and the module-level helpers, 4-3's `boardBadges` and 5-3's `keptBadges` and decor merge, and 6-2a's buttons, counts and prices at HEAD. Read 6-2a's labels for the Strategy buttons from the view (`offered()`), as below.

**Files:**
- Modify: `src/pages/designer/playtest.tsx` (the hover line)
- Test: `src/pages/designer/playtest-fitted.test.tsx` (append)

**Interfaces:**
- Consumes: `cardDetail`; the decor's `badge`; Task 2's `inPlay`.
- Produces: in `playtest.tsx`, the hover line is `cardDetail(faceKey)`, then ` — {label}` when the decor gives the card a label (Call 5). No new export.
- **Second-person labels used below** (re-check each against the view):
  - `PLAY` = `Play a card from your strategy hand to a card in your bench, your development team or your ops team`;
  - `DEBUFF` = `Play a card from your strategy hand to a card in another player's development team or another player's ops team`;
  - `TO_PRODUCT` = `Play a card from your strategy hand to a card in your operations`;
  - `ALONE` = `Play a card in your strategy hand`.

- [ ] **Step 1: Write the tests.** Append `describe('Attributes, Utility cards and Hype on the page')`, with `hover`/`detail` as the hover describe defines them, `tab` and `boardOf` local:
  - **The arrangement:** `inPlay(setUp(), 'Whistleblower Protection Act')`, with:
    - the first Workaholic, TechCrunch Feature and Design Sprint in `strategy-hand-${S}`;
    - a To-Do List in `development-${S}`, with S's Junior Software Dev `putOn` it in `development-team-${S}`;
    - a Dating App in `operations-${S}`;
    - the first Junior QA Tester not S's in `open-job-market`, with `'clean coder': 1`;
    - N's bench Junior Hardware Eng with `burnout: 1`.
  - **Mounted, on S's tab:**
    - the market QA Tester's decor is `{ badge: '1 clean coder' }`, on O's tab too (a count rides with its Talent, R2);
    - `fittedLayout(game.zones, S)` has a shared `attributes-in-play` pile, and `inOrder('attributes-in-play')` is `[]`;
    - **Review Focus:** `document.body.textContent` doesn't contain `1 burnout` (N's bench is hidden from S).
  - **A Buff.** `click(workaholic)`: `offered()` contains `[PLAY, true]`; pin the whole list as the view gives it. `choose(PLAY)`, then `click(junior)` (S's Junior on the To-Do List, drawn hanging under it):
    - the Junior's label ends with `1 workaholic`; pin it whole as the view gives it (4-3's order: kept flags, shown flags, lone counts) and report it;
    - `boardOf(S)` contains `` `with Junior Software Dev${bracket} [1 workaholic]` ``, where `bracket` is ` (…)` with the label's flags, or empty when it has none;
    - `lineOf(S)` starts `` `${S} 5 capital, 3 actions` ``;
    - `inOrder('attributes-in-play')` names `['Workaholic']`, face up, on O's tab too.
  - **The hover line names the label.** `hover(junior)`: `detail()` is `` `${cardDetail(faceKey)} — ${label}` ``. `hover(dating)` before any Hype: `detail()` is `cardDetail(faceKey)` alone.
  - **TechCrunch Feature and Hype.** `click(techcrunch)`, `choose(TO_PRODUCT)`, `pickNamed('Dating App')`:
    - the Dating App's label is `1 hype`, and its caption is unchanged;
    - `boardOf(S)` contains `Dating App (tier Tier 1, tag Social, sector Consumer) [Blue 0/6, Red 0/0, 1 hype]`;
    - `lineOf(S)` starts `` `${S} 0 capital, 3 actions` ``; on N's tab, `boardOf(S)` reads the same.
  - **Design Sprint.** Press `ALONE`, `pickNamed('Design Sprint')`: `lineOf(S)` contains `backlog 6`; on O's tab, `cardsIn(`backlog-${S}`)` is `[]` and `lineOf(S)` contains `backlog 6`.
  - **A full label in a stack** (Call 5). Arranged on `inPlay(setUp(), 'Whistleblower Protection Act')`: a Cloud Storage in `development-${N}`, with N's Junior Software Dev (`{ 'blue xp': 1, workaholic: 1, burnout: 1 }`) and then N's Junior Hardware Eng `putOn` it. On N's tab:
    - the Software Dev's label ends with `1 blue xp, 1 workaholic, 1 burnout`; pin it whole;
    - `hover(softwareDev)`: `detail()` ends with `` ` — ${label}` ``.
  - **How the numbers come** (§20.A, ruling 23, R2): Workaholic $2, TechCrunch Feature $5, Design Sprint $0, each 0 AP: 7 − 2 − 5 = 0; Design Sprint deals 5 Seed cards to a backlog of 1; a TechCrunch Feature adds 1 Hype; Attributes ride with their Talent into the open job market (R2).
- [ ] **Step 2: Run** `bunx vitest run src/pages/designer/playtest-fitted.test.tsx`. Expected: the hover-line checks of a labelled card FAIL. The rest pass already (4-3's and 5-3's labels, 3-2's picker and offer) and are guards; say so in the report.
- [ ] **Step 3: Implement** the hover line. If a guard fails for a reason other than the hover line, stop and report it: it is a page gap, not something to work around.
- [ ] **Step 4: Run** `bunx vitest run src/pages/designer src/engine src/games`, then `bun run test` and `bun run typecheck`. The hover describe's existing tests pass unchanged.
- [ ] **Step 5: Commit**

```bash
git add src/pages/designer/playtest.tsx src/pages/designer/playtest-fitted.test.tsx
git commit -F - <<'EOF'
feat(designer): the hover line names a card's whole label, and Attributes, TechCrunch Feature's Hype and Design Sprint are pinned through the page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 4: Another seat's card picked from the list, and the steps at a round's start

Before starting: re-check 6-1's `othersZoneIds` order, `JINX_GAME`, `ROUND_STEPS_KEY`; 6-2b's `event check` phase, its `Hint:` and let-go buttons; Tasks 2–3's helpers and labels at HEAD.

**Files:**
- Modify: `src/pages/designer/card-pick.ts` (`placesOf`), `src/pages/designer/card-picker.tsx` (`places`), `src/pages/designer/playtest.tsx` (the places; decor for drawn cards only)
- Test (all append): `src/pages/designer/card-pick.test.ts`, `src/pages/designer/card-picker.test.tsx`, `src/pages/designer/playtest-fitted.test.tsx`

**Interfaces:**
- Consumes: `zoneInfo`; 6-1's `JINX_GAME`; Tasks 2–3's helpers and labels.
- Produces:

```ts
// card-pick.ts
/** Where each card in another seat's own zone is, as `p1's workshop`; none for `seat`'s own zones or a shared zone's (Call 6). */
export function placesOf(game: CompiledGame, cards: CardState[], seat: PlayerId): { [cardId: string]: string };
// card-picker.tsx: CardPicker's props gain
places?: { [cardId: string]: string };   // a card with a place reads `{name} ({place})`, and so does its aria-label after `Pick `
```

- **`playtest.tsx`:**
  - `places` is `placesOf(game, view.scene.cards, seat)`, memoised on the view, passed to the `CardPicker`;
  - the decor has an entry only for a card in `placed`: a ring for a card this canvas doesn't draw is dropped.

- [ ] **Step 1: Write the failing tests.**

  In `card-pick.test.ts`, append `describe('placesOf')`, on a 3-player `JINX_GAME` engine: p1's workshop holds a Vase with a Potter on it in `crew-p1`, p2's workshop a Statue, p0's workshop a Vase, and the hall its hands.
  - For p0: p1's Vase is `p1's workshop`, the Potter `p1's crew`, p2's Statue `p2's workshop`; p0's Vase and every hall card have none.
  - **Review Focus.** A face-down copy of a card in `stash-p1` (`faceUp: false`, `faceKey: HIDDEN_FACE_KEY`, `data: {}`) is `p1's stash`: its place, never its name.

  In `card-picker.test.tsx`, append `describe('places')`, with a `CardPickView` whose one card `s` (`Statue`) goes onto `c1` and `c2`, both named `Vase`, and `places: { c1: "p1's workshop", c2: "p2's workshop" }`:
  - after picking `s`, the buttons read `Vase (p1's workshop)` and `Vase (p2's workshop)`, with aria-labels `Pick Vase (p1's workshop)` and `Pick Vase (p2's workshop)`;
  - pressing the second sends `{ cardId: 's', onto: 'c2' }`;
  - **(guard)** without `places`, the existing tests pass unchanged.

  In `playtest-fitted.test.tsx`, append `describe("a Debuff on another seat's staff, and the steps as a round starts")`, with `T = after(N, 3)` (the third seat, since the file's `O` may be N), `tab` and `boardOf` local:
  - **A Debuff from the list.** Arranged on `inPlay(setUp(), 'Whistleblower Protection Act')`:
    - the first Burnout in `strategy-hand-${S}`;
    - a Smart Lock in `development-${N}`, with the Engineer `putOn` it;
    - a Dating App in `development-${T}`, with T's Junior Software Dev `putOn` it; T's Junior QA Tester in `ops-team-${T}`;
    - a To-Do List in `development-${S}`, with S's Junior Software Dev `putOn` it.

    The checks:
    - `click(burnout)`: `offered()` contains `[DEBUFF, true]`. `choose(DEBUFF)`:
      - the picker reads `Pick where it goes: a card in another player's development team or another player's ops team`;
      - its buttons are, in order, `Engineer (${N}'s development team)`, `Junior Software Dev (${T}'s development team)`, `Junior QA Tester (${T}'s ops team)` and `Cancel` (6-1: development teams first, seat by seat from S's left);
      - `ring(burnout)` is `'chosen'`, and `Object.keys(table!.decor!)` holds none of the Engineer, T's Junior Software Dev and T's Junior QA Tester (Review Focus).
    - **Review Focus.** `click(sJunior)` (S's own Junior): nothing is sent (`inOrder('attributes-in-play')` is still `[]`), the notice reads `Pick where it goes: a card in another player's development team or another player's ops team.`, and the picker stays open.
    - `pickNamed(`Engineer (${N}'s development team)`)`:
      - `inOrder('attributes-in-play')` names `['Burnout']`, and `lineOf(S)` starts `` `${S} 7 capital, 3 actions` ``;
      - `boardOf(N)` contains `` `with Engineer${bracket} [1 burnout]` ``, where `bracket` is ` (…)` with the flags of the Engineer's label, or empty when it has none;
      - the picker is gone and no card has a ring;
      - on N's tab, the Engineer's label ends with `1 burnout`.
  - **The event check on the page** (Review Focus). Arranged on `onTop(inPlay(setUpTwo(), 'Whistleblower Protection Act'), 'Regulation Audit')`, with the Engineer and the Diva in `ops-team-${SECOND2}` and SECOND2's capital set to 4. Mount with `players: 2`.
    - Press `End your actions` (FIRST2's). On SECOND2's tab the status ends with `hint('income')` (an ops check with no product passes by itself; if it waits, stop and report). Press `Pay salaries`: `lineOf(SECOND2)` starts `` `${SECOND2} 1 capital` ``. Press `End your actions`:
      - `tab(`${SECOND2} — to act`)` is selected, though FIRST2 starts the round: the steps passed FIRST2 at once;
      - `status()` is `` `seat: ${SECOND2} — Your turn — ${hint('event check')}` ``;
      - `inPlayLine()` starts `event in play: Regulation Audit — effect When revealed,`;
      - `seatButtons()` is `['Let go of a card in your development team', 'Let go of a card in your ops team']`, and the first has `aria-disabled` `true`;
      - on FIRST2's tab, `status()` is `` `seat: ${FIRST2} — ${hint('event check')} — waiting for ${SECOND2}` ``; click SECOND2's tab again.
    - `click(diva)`: `offered()` is `[['Let go of a card in your ops team', true]]`. Choose it:
      - `tab(`${FIRST2} — to act`)` is selected, and `status()` no longer names the event check;
      - `lineOf(SECOND2)` starts `` `${SECOND2} 0 capital` ``, and `inOrder('open-job-market')` contains the Diva.
    - Press `Undo`: `tab(`${SECOND2} — to act`)` is selected, the status names the event check's hint again, `lineOf(SECOND2)` starts `` `${SECOND2} 1 capital` ``, and the Diva is back in `ops-team-${SECOND2}`.
  - **Steps that all pass at once** (Review Focus). Arranged on `onTop(inPlay(setUpTwo(), 'Whistleblower Protection Act'), 'Angel Investors')`, with a To-Do List in `development-${SECOND2}`. Press `End your actions` twice:
    - `tab(`${FIRST2} — to act`)` is selected and `status()` ends with `hint('actions')`;
    - `lineOf(SECOND2)` starts `` `${SECOND2} 10 capital` `` and `lineOf(FIRST2)` `` `${FIRST2} 7 capital` ``;
    - `inPlayLine()` starts `event in play: Angel Investors — effect When revealed,`.
  - **How the numbers come:**
    - §20.A: Burnout costs $0 and 0 AP and goes on an opponent's Board staff (Development or Ops); R2: its card waits in the attributes in play;
    - §20.B: the Engineer's salary is $2 and the Diva's $1; §5 Phase B: 4 − 3 = 1 at Income;
    - §20.D 6: $1 for each Board employee whose salary is above $0, from the Start Player; FIRST2 has none; SECOND2 owes $2 with $1, lets the Diva go, then owes and pays $1;
    - §20.D 4: $3 to a player with a Tier 1 product and none of Tier 2 or 3, counting Development, 7 + 3 = 10; none to a player with no product.
- [ ] **Step 2: Run** `bunx vitest run src/pages/designer`. Expected: `placesOf`, the places on the picker's buttons and the decor check FAIL; the event check and Angel tests pass already (6-1's and 6-2b's steps, and 3-2's tabs) and are guards.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** `bunx vitest run src/pages/designer src/engine src/games`, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/pages/designer/card-pick.ts src/pages/designer/card-picker.tsx src/pages/designer/playtest.tsx \
  src/pages/designer/card-pick.test.ts src/pages/designer/card-picker.test.tsx src/pages/designer/playtest-fitted.test.tsx
git commit -F - <<'EOF'
feat(designer): a card in another seat's zone is listed with its seat and zone where a button picks it, the canvas rings only cards it draws, and the steps at a round's start are pinned through the seat tabs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 5: The browser check, the README and the final checks

**Files:**
- Modify: `README.md`
- Browser scripts and screenshots go only in `SCRATCH=/tmp/claude-0/-home-user-turnhout/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/browser-6-3`.

**Interfaces:** Consumes Tasks 1–4. Produces nothing new.

- [ ] **Step 1: The probe.** Write `$SCRATCH/probe.ts`, run with `bun`. It reads `src/games/startup-simulator.rules`, removes `  The start player is chosen at random.`, and adds this block right after `  A new Junior QA Tester goes to each bench.`, before Setup's deal:

```text
  Move the regulation audit from the event deck to the box.
  Move the regulation audit from the box to the event deck.
  Move the intern season from the event deck to the box.
  Move the intern season from the box to the event deck.
  Move the workaholic from the strategy deck to p0's strategy hand.
  Move the toxic personality from the strategy deck to p0's strategy hand.
  Move the burnout from the strategy deck to p0's strategy hand.
  Move the to-do list from the seed deck to p0's development.
  Move the hacker from the talent deck to p0's bench.
  Move the veteran from the talent deck to p0's bench.
  Move the architect from the talent deck to p0's bench.
  Move the dating app from the seed deck to p1's operations.
  For each card in p1's operations, it gains 2 hype.
  Move the diva from the talent deck to p1's ops team.
  Move the junior software dev from p1's bench to p1's ops team.
```

  The checks, for a 2-player engine at each of seeds 1 to 10:
  - the edited rules compile with no diagnostics;
  - p0 is to act, in `actions`;
  - the event in play is the Intern Season, the event deck's top card is the Regulation Audit, and the junior price and hardware junior price are 0;
  - p0's strategy hand is the Workaholic, the Toxic Personality and the Burnout; p0's bench is its three Juniors, the Hacker, the Veteran and the Architect; p0's development is the To-Do List;
  - p1's operations is the Dating App with 2 hype, and p1's ops team the Diva and p1's Junior Software Dev;
  - p1's `blue supply`, `blue demand` and `red supply` are 1, 1 and 3.

  If a check fails at HEAD (`Shuffle the event deck.` after the anchor, say), stop and report.
- [ ] **Step 2: The browser check.** Copy 5-3's `$SCRATCH/../browser-5-3/check.cjs` helpers (`at()`, `rowCard()`, `STRIP`, `BOARD`, `hover`, `click`, the launch, the error collection, `waitFor`, `press`, `pressIn`, `group`, `line`).
  - **Setup.**
    - Regenerate `zones.json` for p0 and p1 from `fittedLayout(game.zones, viewer)` on the probe's rules.
    - Run the dev server on 5173 with `--strictPort`, polled with `curl -sf`.
    - Use Chromium with `['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']` and a viewport of `1600 × 3200`.
    - Expect no `pageerror` and no console error.
    - Load the Startup Simulator sample, fill `Rules` with the probe's text, choose `2` and press `Play`.
  - **Screenshots.** Each must show what is listed after it.
    1. **`01-table.png`:**
       - the in-play line reads `event in play: Intern Season — effect Recruiting from the University costs $0 this round.`, above p0's line;
       - the bank line reads `license 3 · junior price 0 · hardware junior price 0`;
       - `gauges-p1` reads `Blue supply 1 / demand 1 · Red supply 3 / demand 0`;
       - `board-p1` names the Dating App with `2 hype`;
       - on the canvas, the Intern Season stands in the event in play with its name alone on its face, and the attributes in play is an empty pile on the shared lines.
    2. **`02-hover.png`.** Hover the Intern Season (`rowCard(event in play, 0, 1, STRIP)`): the hover line reads `Intern Season — effect Recruiting from the University costs $0 this round.`
    3. **`03-buff.png`.** Press `Assign some cards from your bench to a card in your development`, pick the Hacker, the Veteran and the Architect, `Confirm` and `Pick To-Do List`. Click the Workaholic in the strategy hand (`rowCard(strategy hand p0, 0, 3, STRIP)`), choose `Play a card from your strategy hand to a card in your bench, your development team or your ops team`, and pick p0's Junior Software Dev on the bench:
       - the Junior is labelled `1 workaholic` on the bench;
       - p0's line starts `p0 5 capital`;
       - the attributes in play shows the Workaholic face up.
    4. **`04-picker.png`.** Click the Toxic Personality (`rowCard(strategy hand p0, 0, 2, STRIP)`) and choose `Play a card from your strategy hand to a card in another player's development team or another player's ops team`:
       - the picker reads `Pick where it goes: a card in another player's development team or another player's ops team`, with `Diva (p1's ops team)` and `Junior Software Dev (p1's ops team)`;
       - the Toxic Personality is ringed green, and no other ring shows.
    5. **`05-toxic.png`.** Pick `Junior Software Dev (p1's ops team)`:
       - `gauges-p1` reads `Blue supply 0 / demand 1 (short) · Red supply 3 / demand 0`, the first in orange;
       - p0's line starts `p0 2 capital`;
       - `board-p1` names the Junior Software Dev with `1 toxic personality`.
    6. **`06-burnout.png`.** Press the same button, pick the Burnout, then `Diva (p1's ops team)`:
       - `gauges-p1` reads `Blue supply 0 / demand 1 (short) · Red supply 0 / demand 0`;
       - `board-p1` names the Diva with `1 burnout`.
    7. **`07-rival.png`.** Press `End your actions`:
       - the `p1 — to act` tab is selected, and the status reads the ops check's hint;
       - on p1's canvas, the Diva is labelled with `1 burnout`, the Junior with `1 toxic personality`, and the Dating App `2 hype`;
       - `Confirm the products online` is greyed.
    8. **`08-income.png`.** Click the Dating App (`rowCard(operations p1, 0, 1, BOARD)`), choose `Switch off a card in your operations`, press `Confirm the products online`, then `Pay salaries`:
       - the Dating App is faded, labelled `offline, 2 hype`;
       - p1's line starts `p1 6 capital`.
    9. **`09-event-check.png`.** Press `End your actions`:
       - the `p0 — to act` tab is selected, and the status reads `Your turn — The Regulation Audit taxes you $1 …`;
       - the in-play line starts `event in play: Regulation Audit — effect When revealed,`;
       - the bank line reads `license 3 · junior price 2 · hardware junior price 2`;
       - the buttons are `Let go of a card in your development team` and `Let go of a card in your ops team` (greyed).
    10. **`10-waiting.png`.** Click the `p1` tab: the status ends `— waiting for p0`.
    11. **`11-let-go.png`.** Back on p0's tab, press `Let go of a card in your development team` and `Pick Veteran`:
        - the status reads Income's hint, on p0's tab;
        - p0's line starts `p0 0 capital`, and p1's `p1 5 capital`;
        - the open job market shows the Veteran.
    12. **`12-color-match.png`.** Color Match at 3: three panels as before, with no in-play line, no gauges and no labels.
  - **Afterwards.** Open every PNG (Read) and check it against its list. Judge each label's readability where cards hang under a card; report one that covers a corner index or can't be read, with its hover line. Then stop the dev server.
  - **How the numbers come:**
    - §20.D 14: Intern Season makes the University $0; then §20.D: the next round resets it to $2 and the License to $3;
    - §20.B: the Junior Software Dev makes 1 Blue, the Diva 3 Red; §20.C.1: the Dating App needs 1 Blue / 0 Red;
    - §20.A: Workaholic $2, Toxic Personality $3, Burnout $0, each 0 AP: 7 − 2 − 3 − 0 = 2; R1: Toxic takes the pool's Blue; R3: Burnout makes 0;
    - §5 Phase B: the Dating App offline earns nothing, and the Diva's $1 salary leaves 7 − 1 = 6;
    - §20.D 6: p0 owes $3 for the Hacker, the Veteran and the Architect (each $2 salary) with $2, lets the Veteran go and pays $2; p1 pays $1 for the Diva: 6 − 1 = 5.
- [ ] **Step 3: Update the README.**
  - **"A table too big for one screen", `The other seats`.** Add:
    - above the players' lines, a line for each zone in the centre whose cards change what the rules work out (`Only if the event in play has the Tech Bubble.`), with each card in full: `event in play: Tech Bubble — effect All Active Maintenance Products generate +$1 Revenue this round.`;
    - a price a button pays (`They pay the junior price.`) stays on the bank line at 0.
  - **`The Board`.** Add:
    - the hover line names a card's whole label after its columns, for a label that a card hanging over it covers;
    - a flag that tests a card in the centre is never a label, though the values it changes are shown, gauges included.
  - **"Buttons that pick cards", `In the playtest`.** Add: a card in another player's zone is listed with its place, `Vase (p1's workshop)`, since the table shows one seat at a time.
  - **"Cards that say what they do".** Add: a value that is a sentence is left off the card's face; the hover line gives it.
  - **Plan 6-1's paragraph** ("Other players' cards, lines a flag turns on, …"). Add an `In the playtest` bullet before its `Startup Simulator` one: targets listed with their place; a centre flag never labelled, its values shown; the card in play's line; prices at 0; the tabs follow each player's step at a round's start.
  - **Its `Startup Simulator` bullet.** Add that the Event in play's effect is written out above the table, the University's prices show on the bank line, Attributes and Hype are labelled on their cards, a Debuff lists each rival card with its seat and zone, and the event check is played under the buttons of the seat it waits on.
- [ ] **Step 4: Run** `bun run test` and `bun run typecheck`. The passing count is the starting count plus this plan's new tests. Then run these checks over `BASE..HEAD` (or Task 1's commit and `BASE2..HEAD`). Each must print nothing, except where noted.

```bash
# Startup Simulator's words in shared code, slices 3–6, tests included
git diff "$BASE" -- src/engine src/pages src/utils ':!src/pages/designer/designer-page.test.tsx' ':!src/pages/designer/playtest-fitted.test.tsx' \
  ':!src/pages/designer/tableaux.test.ts' ':!src/pages/designer/samples.ts' | grep '^+[^+]' \
  | grep -iE '\b(capital|talents?|agency|juniors?|backlogs?|growth|crash(es)?|vaporware|universit(y|ies)|bench(es)?|ideation|start-?ups?|research(es)?|recruit(s|ed|ing)?|products?|job market|idea pool|greenlight(s|ed|ing)?|launch(es|ed|ing)?|pivot(s|ed|ing)?|salar(y|ies)|payroll|projects?|cubes?|ops|operations|onboarding|scouting|sourcing|market share|tags?|leads?|leading|licen[cs]es?|tiers?|stall(s|ed|ing)?|sectors?|expertise|modes?|bandwidths?|bugs?|qa|online|offline|maint(enance)?|suppl(y|ies)|demands?|xp|pending|skills?|badged|ranks?|mentor(s|ed|ing)?|synerg(y|ies)|agile|graduat(e|es|ed|ing|ion)|training|trained|brainstorm(s|ed|ing)?|strateg(y|ies)|milestones?|seniors?|workaholics?|clean coders?|visionar(y|ies)|toxic|burnouts?|flight risks?|techcrunch|design sprints?|cease|desist|hype|utilit(y|ies)|buffs?|debuffs?|venture capital|bubbles?|patents?|trolls?|angels?|investors?|legacy|regulations?|audits?|open source|hackathons?|chip shortage|crunch|server crash|logjam|frenz(y|ies)|interns?|headhunters?|course boom|whistleblowers?|trade show|events?)\b|\bseed (decks?|markets?|cards?|products?)\b'
# "badge" in core code (the page may say it)
git diff "$BASE" -- src/engine/core | grep '^+[^+]' | grep -iE '\bbadges?\b'
# protected files
git diff --stat "$BASE" -- src/engine/core/game-state.ts src/engine/core/flow.ts src/engine/core/game-engine.ts src/pages/hearts-demo
# a pure core
git diff "$BASE" -- src/engine/core ':!*.test.ts' | grep '^+' | grep -E "from '(pixi|react|@/components|@/utils)|\b(document|window)\.|Math\.random|Date\.now"
# the rules: only the Event table changed (prints its header and 18 rows, as removed and as added)
git diff "$BASE" -- src/games/startup-simulator.rules | grep -E '^[-+][^-+]'
# existing test lines removed or changed: only Task 1's
git diff "$BASE" -- '*.test.ts' '*.test.tsx' | grep -E '^-[^-]'
```

  - The rules check prints only the Event table's lines.
  - The last check prints exactly the pins Task 1 named, or nothing.
  - Also read the `+` lines of `src/engine`, `src/pages` and `src/utils` for "source" in the game sense and "Attribute" meaning a kind of card.
- [ ] **Step 5: Run the four games alone.** `bunx vitest run src/games/hearts.test.ts src/games/color-match.test.ts src/games/venom.test.ts src/games/rent-day.test.ts src/pages/hearts-demo src/engine/input` passes, and Rent Day still has 108 examples.
- [ ] **Step 6: Commit**

```bash
git add README.md
git commit -F - <<'EOF'
docs: the card in play written out above the table, prices at 0 on the bank line, the hover line's label, targets listed with their place, and slice 6 on the page, checked in a browser

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

## Gaps

- **G1. 6-2b's Event lines take the gauges off the page, whatever the owner-scope ruling.**
  - 6-2b's Task 2 puts a flag that reads the Event in play into `blue output`, `red output` and `blue bandwidth` (Open Source Boom, Hardware Hackathon, Logjam, Server Crash). Every value read through them then fails closed: the bandwidth stand-ins, `blue made` and its kin, the three supplies (so both gauges), and `losing blue`/`red`/`qa`.
  - 6-2b's pins say `standIns` is unchanged, so its Task 2 fails as written, and 4-3's gauge tests fail with it. 6-2b's constraints don't let it change those.
  - **Recommendation:** run this plan's Task 1 before 6-2b's Task 2. It needs no slice 6 rules: its fixtures are general, and its Startup part is then guards only (nothing is dropped). 6-2b's stated pins then hold as written. This is as 5-3's Task 1 ran ahead of 5-2b.
  - Otherwise 6-2b's executor stops at those pins, and Task 1 restores them as its named changed lines.
- **G2. The owner-scope ruling is assumed in place** (the controller's call at 6-1's pre-flight). Without it, the pool values stay unshown even with Task 1, and so do the supplies and gauges. Task 1 checks it first and stops. This plan doesn't need it moved here.
- **G3. One rules-text change and one shared drawing change.**
  - The Event table gains an `effect` column (6-2b left the Event's text to this plan). Its words join the card vocabulary; Task 2 stops on any `ambiguous` line.
  - Faces leave sentences off, so Rent Day's `says` lines leave its faces too. No page draws them, since Rent Day has no card table. Reported under the Global Constraints.
- **G4. The four Events of later slices and Patent Trolls' later fees say "Not in effect yet."** in their effect text. Slices 7–10 must edit those cells when they switch the Events on.

## Forward notes

- **Slice 7:** Venture Capital Rain's effect cell drops `Not in effect yet.`. A Consultant on a rival's card would be a target in another seat's zone; `placesOf` already names it.
- **Slice 8:** a poach button's target in another seat's zone gets its place in the picker as the Debuff's does. Recruiter Frenzy's and Headhunter Holiday's cells drop `Not in effect yet.`.
- **Slice 9 (face-down cards in a public zone):** `placesOf` names only the place of a face-down card, never the card. A flag that tests the centre stays public only while the centre zone is public; a face-down card there would need `CENTRE_HAS` to fail closed for it, as 4-3's note asks of player values.
- **Later:** the card in play's line on a page that fits one table; clicking a rival's card on its Board line to pick it.
