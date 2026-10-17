# Startup Simulator Slice 9-2 (Rules text and long runs) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Startup Simulator plays slice 9, Stealth and Audits:
- any product may be Greenlit Face-Down, legally with Secured Access, as a bluff when some player provides each Tag, never with no provider, paying no License;
- rivals see a Face-Down project's staff as they are and nothing of the card;
- in the owner's Engine phase, between Clean and Commit, rivals with $3 may Audit a Face-Down project the Audit Shield doesn't cover, bidding once around;
- the reveal checks Ghost Progress and Missing Dependency: a clean project pays the owner the bid, a caught one is Folded or Settled;
- Voluntary Disclosure in Phase C, the Face-Down Launch with its Stealth Bonus, and the bonus in the score.

The long runs play all of it at 2 to 5 players.

**Architecture:**
- **This is plan 9-2, the rules plan of slice 9.** Plan 9-1 (language) is built first, plan 9-3 (the page) after. Six tasks, so one plan.
- This plan writes only the rules text, its examples and the long runs. It adds no phrase and changes no shared code.
- **Six tasks:**
  1. the row where projects lie face down, the Face-Down Greenlight, and what rivals see;
  2. the Audit window: the offer, the bid, the reveal, and the Audit Shield (every verdict clean until Task 3);
  3. the legality check and the Fold;
  4. Settle;
  5. Voluntary Disclosure, the Face-Down Launch and the Stealth Bonus;
  6. long runs: every slice-9 path tallied, whole games replayed; the README and the checks.

  Each rules task keeps the long runs passing. It adds the auto-player's answers in the phases and buttons it creates, and the invariants its rules need. Task 6 adds the tallies.
- **Phases.**
  - `audit` is a step of the active player's turn, right after `engine`: the engine's three `Go to commit.` become `Go to audit.`, and `audit` goes to `commit`.
  - `declaration` (an interrupt opened by a rule about a player, 5-1) and `bidding` (8-1's ask) are added after the last phase.
  - Phase order after this plan: `…, crisis, engine, audit, commit, bench cleanup, …, placing, counter-offer, declaration, bidding`.
- **Builder calls this plan makes** (the spec leaves wordings and the auto-player to the builder; recorded for the owner):
  - **The Face-Down Greenlight is a button of its own,** `greenlight face down a card in their backlog`, 0 AP.
    - It asks what every Greenlight asks of the Tags: some player provides each (#21).
    - It pays no License (§6 "You must Greenlight Face-Up to pay a License").
    - It asks Domain Expertise's cut as the Greenlight does (§19.A "Locked at Greenlight").
    - Its last lines are `Turn it face down.` and 9-1's `No other player can tell it from the cards in their backlog.` (R1).
  - **The Audit follows 9-1's `INSPECT_GAME`.**
    - The `audit` step invites every rival; a rule un-invites those with less than $3, and the first invited in turn order from the active player's left gets `declaration`.
    - The declarer's button opens the bid at $3, asks `Each other player has the bidding, in turn from their left.` with `Only if they are not under audit.`, reveals, judges, and goes back.
    - Cards are `passed over` while an offer runs. The verdict clears that on the owner's cards, so the offer restarts from the active player's left after each verdict (R4). The step ends when no one is invited and no card is open to audit.
    - The highest bidder holds the player flag `the whistleblower` from the bid on.
  - **Secured Access at the Audit is marked, not related** (see the Gaps).
    - As the `audit` step starts, the owner marks `in reach` every product of theirs and of each Partner (either holding the other's Equity).
    - A project counts the marked products whose Tag is its `requires` (`sources`) and its `also requires` (`second sources`). The marks are cleared as the step ends.
    - Voluntary Disclosure marks and clears them in its own press.
  - **Ghost Progress is written and never fires (R2):** `stalled` with new cubes. Examples arrange new cubes on a Stalled project; the long runs assert it never holds and tally it as 0.
  - **The forced Fold is Settle refused:** Settle asks, as a Greenlight does, that some player provides each Tag. A Tag that exists nowhere leaves only the Fold.
  - **Settle is offered only when cash covers the `settlement`** (the spec's call before slice 10). The settlement is $3, plus the `tag fee` ($3, or $5 under Patent Trolls) for each missing Tag, plus $3 for Ghost Progress alone.
    - It pays the bank $3, then the License to a provider of the owner's choice for each missing Tag, with the Greenlight's own License lines.
    - The bank pays the Whistleblower $4, and $4 more under Whistleblower Protection Act (§20.D 17).
  - **The Fold is the Pivot's lines without `Every card on it is onboarding.`,** losing the new cubes too. It returns Consultants (R4) and fires the Diva (ruling 9).
    - It pays `They pay up to 4 to the whistleblower.` then `They pay up to 1.`: the Whistleblower first, the rest forgiven (§7.C, the spec's call).
    - A staff member already onboarding keeps the token to the next turn start, which clears it before it matters, so no line clears it.
  - **Voluntary Disclosure** is `disclose a card in their development` in `actions` only, 0 AP.
    - Its guards are the Greenlight's License guards with a game number `late license` ($4; $6 under Patent Trolls, set each Round Start as 6-2b sets `the license`).
    - It pays the License to a provider of the owner's choice for each Tag lacking Secured Access, and $1 to the bank for each, read from the marks.
  - **The Stealth Bonus** is a public player counter `stealth bonus` worth its points, gained at a Face-Down Launch: 5 for Tier 2, 10 for Tier 3, none for Tier 1. Each counts 1 point at the score. The page draws it as markers (9-3).
  - **Copies are pinned by tests that compare them with their source.** Lines the rulebook asks the same of several actions are copied, since no line can be shared between buttons. These are the Greenlight's cut and Tag guards, the Pivot's lines, the License lines and the marks. A test in the owning task compares each copy with its source, compiled and without line numbers, so a removed line fails it.
- **Names.**
  - Zone mark: the development row `…, where cards may lie face down`.
  - Players: counter `stealth bonus`; flags `under audit`, `invited`, `the whistleblower`; game numbers `high bid`, `late license`.
  - Cards: flags `passed over`, `caught`, `in reach`.
  - Worked flags: `shielding`, `open to audit`, `ghost progress`, `requires missing`, `also requires met`, `also requires missing`, `illegal`, `ghost only`, `trolled`.
  - Worked numbers: `sources`, `second sources`, `tag fee`, `settlement`.
  - Phases: `audit`, `declaration`, `bidding`.
  - Buttons:
    - `greenlight face down a card in their backlog` and `disclose a card in their development` (`actions`);
    - `audit a card in another player's development` and `pass the audit` (`declaration`);
    - `raise an amount` and `pass the bid` (`bidding`);
    - `fold a card in their development` and `settle a card in their development` (`audit`).

**Tech Stack:** TypeScript (strict), Bun, Vitest + happy-dom.

**Spec:** `docs/superpowers/specs/2026-10-16-startup-slice-9-stealth-audits-design.md` is binding, and its "Builder-check rulings" win over its body:
- R1: a Face-Down card can't be followed by its id; the greenlit card and every card left in the backlog take fresh ids from `lang:next-card`.
- R2: no faking progress; Stalled applies Face-Down too; Ghost Progress is pinned by arranged examples only, tallied as 0 and recorded as never firing.
- R3: rivals see each staff card on a Face-Down project as it is: modes, Pending XP, XP, Skills, Attributes, Onboarding and the `cto`/`vest` marks. They see nothing worked out from the hidden card: no Pending Badge, Stalled, need, cut or Feature complete, and no card name in any prompt, verdict reason or tableau line.
- R4: Patent Trolls' $5 Settlement Tag fee; a Fold returns Consultants as Pivot does; the declaration offer restarts from the active player's left after each verdict.

It sits under `docs/superpowers/specs/2026-10-16-startup-simulator-overview-design.md`, also binding, with its anti-goals and its rule "every number comes from the rulebook, and examples say where".

The other inputs:
- plan 9-1 (`docs/superpowers/plans/2026-10-16-startup-slice-9-1-language.md`): its Interfaces are the phrases this plan may use, its `INSPECT_GAME` is the Audit's pattern, and its "Left to 9-2" is this plan's floor;
- `builder-check-startup-9.md` (Q1–Q3 and its three settled points) and the controller's `notes-9-preflight.md`, in the session scratchpad;
- slice 10's spec and builder check: Fold and Settle are built here for the active player in the Audit window, and generalised there. Settle's cover by Fire Sale value is slice 10's. Ghost Progress can't arise at a Come Clean.
- `suwa/rulebook.md` v6.0: §2, §5 Phase D, §6 (Greenlight, Launch, Voluntary Disclosure), §7.A–D, §11.G.2, §12, §14.B, §17.B.3, §20.D (3, 17); Rulings #4, #5, #9, #11, #17, #21, #25;
- where those are silent, suwa's `resolvers/audit.rs`, `phases/engine.rs` and `view/censor.rs`.

## Global Constraints

- **Plan 4-2's controller amendment applies throughout** (P1–P15), as plans 7-2a to 8-2b carry it:
  - counts are taken from the committed test when a task starts;
  - every task runs the removal probe over the lines it added or changed, and adds an example for any survivor that isn't display text (P13);
  - the auto-player may be steered beyond a task's brief when the rules alone leave a tallied path at 0, and the report lists each change (P14);
  - checks and tallies read counts as numbers (missing = 0) and flags as `=== true` (P6);
  - no `For each … that is/are <flag>` line (P7).
- **Branch and commits.** Develop on `claude/peaceful-curie-rdfkow`. Commit by pathspec, never `git add -A`. Every commit message ends with these two lines and contains no model identifiers:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC`
- **Protected files never change:** `src/engine/core/game-state.ts`, `src/engine/core/flow.ts`, `src/engine/core/game-engine.ts`, `src/pages/hearts-demo/**`.
- **The core stays pure:** no pixi/react/DOM in `src/engine/core/**`, no `Math.random` or `Date.now`.
- **State is Json-only, under `lang:*` keys.** This plan adds no key: flags, counts and numbers live in the rules text. Plan 9-1's `lang:renamed` is written by its renaming line.
- **No Startup Simulator words in shared code.** The banned list is plan 9-1's (plan 8-1's plus stealth, audit, fold, settle, ghost, bluff, whistleblower, disclose/disclosure, shield, dependency, legality, fraud, bounty, secured, transient). This plan touches no shared code.
- **The other games.** Hearts, Color Match, Venom and Rent Day stay unchanged. Rent Day keeps its 108 examples.
- **Files this plan changes:**
  - `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts` and `README.md`;
  - test-file pins under `src/pages/designer/**` that read the rules text, and no page source:
    - the Startup example count in `designer-page.test.tsx`;
    - the offered-button lists, phase lists, zone pins, fitted-table pins and player-counter pins in `playtest-fitted.test.tsx` and `tableaux.test.ts` that the new buttons, phases, the development row's mark or the `stealth bonus` counter change.
  - Each such pin is pinned as the view now says it and reported. Nothing under `src/engine/**` changes.
- **Every number comes from the rulebook, and examples say where:** a section or ruling in each title, and each task's "How the numbers come". The numbers are:
  - the $3 opening bid and the $1 raise (§7.A);
  - the $5 Fold, $4 to the Whistleblower and $1 to the bank (§7.C);
  - the Settlement's $3, a $3 License per missing Tag, and $3 more for Ghost Progress alone (§7.C, ruling 25);
  - the $4 bounty, $8 under Whistleblower Protection Act (§7.C, §20.D 17);
  - the $5 Tag fee under Patent Trolls (§20.D 3, R4);
  - the $4 Late License ($3 + $1; $5 + $1 under Patent Trolls) (§6, §20.D 3);
  - the +5 / +10 Stealth Bonus (§6 Launch, §12.7, ruling 17);
  - the 3-project cap (§14.B.1).
- **Hidden information (the overview's first anti-goal, R1, R3).**
  - No rival's view contains a Face-Down card's name, its counts, or a value worked out from it. That covers board text, scene data, worked values, prices, waiting lines, button verdicts and refusal reasons.
  - No Face-Down card carries an id a rival saw face up.
  - The auto-player's choices for a seat read only what that seat may see, so it plays the same game through the page's view as without it.
- **Anti-goals (spec and overview):**
  - a Face-Down project's identity, cubes or Tier visible to a rival in any view;
  - a card audited twice;
  - a bluff that pays a License, or a Face-Down Greenlight with no provider of a Tag;
  - money created by a Fold (its shortfall is forgiven, never owed);
  - a game that can't end;
  - an auto-player that hides a rule that never fires, Ghost Progress excepted by R2;
  - Startup words in shared code.
- **Every rules line is pinned.** Each line this plan adds or changes fails some example, or one of its task's named tests, when it alone is removed. `Hint:` lines, `Players take turns.` lines, table rows and `Cards can …` / `Players can …` declarations are exempt.
- **Examples arrange at most 3 Equity tokens naming one player** (7-1's claim rule).
- **Example counts.** N₁₂ is the count the committed test pins when Task 1 starts: plan 8-2b's N₁₁ + 20, plus whatever fix waves add.
  - The tasks end at N₁₂ + 6, + 13, + 20, + 26 and + 33.
  - Each task updates `results` in `startup-simulator.test.ts`, the Startup test in `designer-page.test.tsx` and the README's "Its N examples".
- **Commands.**
  - Single file: `bunx vitest run src/games/startup-simulator.test.ts`. Full suite: `bun run test`. Types: `bun run typecheck`.
  - Before Task 1: record `BASE=$(git rev-parse HEAD)`, run `bun run test` once for the passing count and the long runs' time, and note N₁₂.
- **Existing tests.** Only the lines each task names change. If any other existing test fails, stop and report it.
- **Long runs.**
  - If an invariant shows a wrong rule, fix the rules text.
  - If a required tally stays at 0, change the auto-player, never the rules. Report a key that stays unreachable and pin its path with an arranged test, in the shape of 6-2b Task 5's.
  - If the long runs take more than a third longer than at BASE, report the timing.
- **Earlier plans come first.**
  - Execution order: 4-1 and 4-2 (built), the speed-up plan, 4-3, 5-1, 5-2a, 5-3 Task 1, 5-2b, 5-3 Tasks 2–4, 6-1, 6-3 Task 1, 6-2a, 6-2b, 6-3 Tasks 2–5, 7-1, 7-2a, 7-2b, 7-3, 8-1, 8-2a, 8-2b, 8-3, 9-1. Then this plan, then 9-3.
  - Their rules text is the base. Every anchor below is named by its text.
- **Style.**
  - 2-space indent, single quotes, comments that say why.
  - Commit prefix `feat(games):`, or `docs:` for a README-only commit.
  - TDD every task: change the test first, watch it fail, then the rules, pass, `bun run typecheck`, commit.
  - Every rules line below is exact copy. Insertion points name a line or section by its text, never by a line number.
  - **Re-read the committed rules file before each task.** If a named anchor line is missing or worded otherwise, stop and report it. Where this plan copies a block "as it reads at HEAD" (the Pivot, the Greenlight's cut), copy HEAD's lines.
  - In examples, a zone's `Given` comes before any `… has a … on it` Given that adds to the same zone.
  - If a line reads two ways (an `ambiguous` diagnostic), stop and report it. If an example's verb form or refusal text differs from the compiler's, use the compiler's and report it.

## Review Focus

- **An Audit window nobody can or will use:** every rival short of $3, every rival passing, two players with no one to bid, a project whose CTO is still onboarding.
  - Expected: the offer closes, cubes commit and the turn goes on; the declarer alone is the Whistleblower at $3; an onboarding CTO shields nothing.
  - Tests: Task 2 examples 3, 4 and 7.
- **A Face-Down project relying on Tags every way:** the owner's own Offline product, a Partner holding the owner's Equity, a Partner whose Equity the owner holds, a Tag that has left play, and a rival's product the owner relied on at an earlier Audit.
  - Expected: clean, clean, clean, a forced Fold, caught.
  - Tests: Task 3 examples 3, 4 and 7; Task 4 example 4.
- **A caught owner short of money:** less than the Fold's $5, less than the Settlement.
  - Expected: the Fold pays what they have, the Whistleblower first, and never leaves a debt; Settle is refused and the Fold is left.
  - Tests: Task 3 example 2; Task 4 examples 2, 3 and 5.
- **Undo and replay across a Face-Down Greenlight's renaming, an Audit's bid, a verdict and a Fold or Settle.**
  - Expected: the log alone rebuilds the finished game; undo of the renaming move gives back the old ids.
  - Tests: Task 6.
- **Each seat's view through an Audit:** the offer's buttons, the bid's waiting line, a refused Audit's reason, and a Veto prompt for a Face-Down Launch.
  - Expected: a card back and `a face-down card` for rivals, no id in a waiting line, reasons from public facts only.
  - Tests: Task 2's view test, Task 5's Veto test, Task 6's view check.

## Assumed from earlier plans (check before Task 1)

Re-read each item at HEAD by name. If one is missing or differs, stop and report it.

- **Plan 9-1, built:**
  - the zone mark `…, where cards may lie face down`; `Turn it face down.`, `Turn it face up.`, `it is face down`, `it is face up`;
  - `No other player can tell it from the cards in their {perzone}.` as a button's last line;
  - `its owner is (not) {playerflag}`;
  - `They pay up to {int} to {holder}.`, `They pay up to {int}.`, `{holder} pays the {gamenumber} to its owner.`, `{holder} gets {int} {counter}.`;
  - the example words `Given {card} in {zone} is face down`, `Then … is face down` / `… is face up`, `{player} sees …`, `{player} can't see …`, `{player} can't tell {card} in {zone} from the cards in {zone}`;
  - in code: `seenBy`, `seenByAll` (`zones.ts`), `dealtIdOf`, `RENAMED_KEY` (`cards.ts`), `SeatExtras.faceDown`, the view naming a hidden card `a face-down card`;
  - `INSPECT_GAME` and its Task 7 examples passing.
- **Plan 8-2b, built:** the count `cto`; `Lead material:`; the two `promote …` buttons; `Phase: counter-offer` (the last phase); the locked-equity rule. In the test file: `PROMOTE`, `promoting()`, `marksOf`.
- **Plan 8-2a, built:** `Phase: crisis` before `engine`; the Fire Sale; in the test file `askOf` and the judge's ask rule.
- **Plan 8-1, built:** the ask `Each other player has the {phase}, in turn from their left.` with `Only if` lines under it; `its owner's <zone>`.
- **Plan 7-2b, built:** the Veto window line and `Phase: veto`; in the test file `VETO`, `ANSWERS`, `windowJudge`, `turnOf`.
- **Plan 7-2a, built:**
  - `equity`, `portfolio`, founders;
  - the Greenlight's Partner lines (`Another player tied to them by a card in their portfolio has a card in their operations whose tag is the card's requires.` and the rest);
  - the Pivot's `      The other players' cards on it go to their owners' portfolio.`;
  - Income's `For each card in each portfolio whose founder is them, …`;
  - in the test file `tiedTo`, `EQUITY_TOKENS`, `founderOf`.
- **Plan 6-2b, built:** `  When a round starts:` with `    If the event in play has the Patent Trolls, the license is 5.`; Events read as `the event in play has the …`; examples' Event deck in table order.
- **Plan 6-2a, built:** the Pivot's `      Every card on it that is egotistic is fired.`.
- **Plan 5-2a, built:** the Pivot's three `For each card on it, it loses its pending …` lines; `Pending badge:`; the counts `pending blue`, `blue xp`, `blue skill`.
- **Plan 5-1, built:** `If <a> and <b>, <effect>`; rules about a player in turn order; `a card's {attribute} is the number of {cardgroup}`.
- **Plan 4-2, built:** `Phase: engine` with three `    Go to commit.` lines; `Stalled:`; the `new blue cubes` / `new red cubes` counts.
- **The test file:** `arrange`, `fresh`, `playTurn`, `playGame`, `keepsTheRules`, `keepsTheBudget`, `happenings`, `turnsIn`, `ranTheEngine`, `atTheEngine`, `scoreOf`, `buttonOf`, `viewedCards`, `PHASES`, `GREENLIGHT`, `LAUNCH`, `PIVOT`, `seatExtras`, and the `describe('what the view says the rules work out')` pins.

---

### Task 1: The row where projects lie face down, the Face-Down Greenlight, and what rivals see

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count); `playtest-fitted.test.tsx` and `tableaux.test.ts` where they pin the actions phase's offered buttons or the development row's table entry

**Interfaces:**
- Consumes: 9-1's mark, `Turn it face down.`, the renaming line, the example words, `dealtIdOf`, `seenBy`, `SeatExtras.faceDown`; 7-2a's `tiedTo`.
- Produces (rules): the development row's mark; the button `greenlight face down a card in their backlog`.
- Produces (test file):

```ts
const GREENLIGHT_FACE_DOWN = 'greenlight face down a card in their backlog';
/** Every card lying face down in a development row, with the seat whose row it is. */
function faceDownCards(state: GameState): { card: CardState; owner: PlayerId }[];
/** The declared action whose words are `words`, in whichever phase holds it. */
const actionNamed = (words: string): DeclaredAction => game!.phases.flatMap((phase) => phase.actions).find((action) => action.words === words)!;
/** Compiled lines or groups as JSON without their line numbers and wording, so two copies of the same lines compare by what they parsed to. */
const bare = (json: unknown): unknown => JSON.parse(JSON.stringify(json, (key, value) => (key === 'line' || key === 'text' ? undefined : value)));
/** Whether `seat` has Secured Access to every Tag `card` requires in `state`: its own operations, or those of a seat `tiedTo` it, provide each. */
function securedFor(state: GameState, seat: PlayerId, card: CardState): boolean;
```

- [ ] **Step 1: Change the tests.**
  - **Pins.**
    - `results` is N₁₂ + 6; the designer page's count too.
    - The actions phase's offered buttons gain `GREENLIGHT_FACE_DOWN` right after `GREENLIGHT`.
    - The fitted table's development entries gain `faceDown: true` (9-1 Task 1).
    - **`shownPlayerValues`, `shownFlags`, `standIns`:** take each pin from HEAD. A player value totalled over the development row leaves `shownPlayerValues` (9-1 Task 3). Pin what the view says and report each change.
  - **Lines the rulebook asks the same of** (a new `describe('lines the rulebook asks the same of')`, which Tasks 3–5 add to):
    - `it('asks the same Tags of a Face-Down Greenlight as of a Greenlight, and the same cut (§6, §14.B.3, §19.A, ruling 21)')`.
    - `bare` of `actionNamed(GREENLIGHT_FACE_DOWN).conditions[1..2]` equals `bare` of `actionNamed(GREENLIGHT).conditions[1..2]`: the two `Only if one of:` groups naming `Some player has a card in their operations whose tag is …`.
    - `bare` of the face-down button's effects from `It loses its cut blue cubes.` through `Move it to their development.` equals the Greenlight's. Find each slice by the refs' `text`, not by index.
  - **The view (R3).** Append to `describe('what the view says the rules work out')`: `it('shows a rival the staff on a Face-Down project as they are, and nothing worked out from the project (the slice’s R3)')`.
    - **The table.** A 2-player state from `arrange`:
      - p0's development holds a Search Engine with 2 `cut blue cubes`, 3 `new blue cubes` and `faceUp: false`;
      - on it (`putOn`) sit a Firmware Specialist with `red mode` and `onboarding`, a Junior PM, a Junior Software Dev with 2 `blue xp`, 1 `blue skill` and 1 `pending blue`, and the Architect with 1 `cto`.
    - **For p1:**
      - `deriveScene(tableDefFor(game!, seats), { cards }, 'p1')` shows the Search Engine as `{ faceUp: false, faceKey: HIDDEN_FACE_KEY, data: {} }`, at its id and slot;
      - each staff card is face up with exactly the counts and flags arranged, and `lang:on` the project;
      - `seatExtras(engine, runtime, state, 'p1')` has no `worked` entry, nor any per-card entry, for the project, and the Junior PM's entry has no `pending badge`;
      - `JSON.stringify({ scene, extras })` doesn't contain `Search Engine`;
      - `extras.faceDown` is undefined.
    - **For p0:** `worked[project].columns['blue need']` is 10 (12 − 2), the Junior PM is `pending badge` (5-2a), and `extras.faceDown` is `[project id]`.
  - **Matching cards across a move.** Every check in `keepsTheRules`, `happenings` and the Equity, `lang:on` and locked-equity invariants that matches a card in `after` with one in `before` by id reads both through `dealtIdOf` (9-1). A Face-Down Greenlight renames the card and the backlog left behind it.
  - **Invariants (R1, R3, after every move):**
    - **Put there by a Face-Down Greenlight.** A card lies face down in a development row only after a `GREENLIGHT_FACE_DOWN` of its seat moved it there. A `GREENLIGHT_FACE_DOWN` leaves exactly one more card face down.
    - **Fresh ids.**
      - Each game keeps `seenFaceUp: Set<string>`, the id of every card that after any move lies face up in a zone `seenByAll` says every seat sees, or face up in a development row.
      - After a `GREENLIGHT_FACE_DOWN`, the new face-down card's id, and the id of every card left in that seat's backlog, is absent from `seenFaceUp`, and `dealtIdOf` of each names a card of `before`.
    - **Hidden from rivals** (in the runs through the view, after every move; in the others, after each run's last move). For each `faceDownCards(after)` entry and each other seat:
      - its scene card has `data: {}` and the hidden face key;
      - `JSON.stringify` of that seat's scene and `seatExtras` holds no `"<its name>"`;
      - no per-card map of the extras has its id as a key.
  - **The auto-player** (free moves). While its development has fewer than 3, it greenlights as now, in the same order of backlog cards (Domain Expertise first):
    - when `t % 3 === 1`, it first presses `GREENLIGHT_FACE_DOWN` for the first card that press allows, and only then `GREENLIGHT`;
    - otherwise it presses `GREENLIGHT` first. When that allows no card and `t % 2 === 0`, it presses `GREENLIGHT_FACE_DOWN`, a bluff when the License was what it lacked.
    - Choices are answered as any press's are.
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Change the rules text.**
  - **The table** (§6, the overview's call). `  Each player has a development row that everyone can see.` becomes:

```text
  Each player has a development row that everyone can see, where cards may lie face down.
```

  - **Re-check what reads another player's development** (9-1 "Left to 9-2"). Run the compiler.
    - Every window clause, ask and pick in `another player's development` must still compile with `[]`.
    - 7-2a's two placing buttons and 7-2b's `take a card from another player's portfolio to a card in another player's development or another player's operations` read the target with `Only if the target card's owner is its founder.` and `Only if it is not on the target card.`. If 9-1 Task 4 refuses those lines, stop and report Gap 1: they read where the target lies, never its face.
  - **The Face-Down Greenlight** (§6 Greenlight, §14.B.3, §19.A, rulings 11, 21, R1). In `Phase: actions`, right after the `A player may greenlight a card in their backlog.` button and its lines, add the lines below. The cut's block is the Greenlight's as it reads at HEAD; the copy test pins it.

```text
  A player may greenlight face down a card in their backlog.
    Only if their development has fewer than 3 cards.
    Only if one of:
      The card has no requires.
      Some player has a card in their operations whose tag is the card's requires.
    Only if one of:
      The card has no also requires.
      Some player has a card in their operations whose tag is the card's also requires.
    Then:
      It loses its cut blue cubes.
      It loses its cut red cubes.
      They choose one:
        Only if they have a card in their operations that is not offline and whose sector is the card's sector.
        Only if the card is not an Infra card.
        Only if the card is not a Concept card.
        Cut 2 blue:
          Only if its blue cost is more than 1.
          Only if one of:
            Its blue cost is more than 2.
            Its red cost is more than 0.
          It gains 2 cut blue cubes.
        Cut 2 red:
          Only if its red cost is more than 1.
          Only if one of:
            Its red cost is more than 2.
            Its blue cost is more than 0.
          It gains 2 cut red cubes.
        Cut 1 of each:
          Only if its blue cost is more than 0.
          Only if its red cost is more than 0.
          Only if one of:
            Its blue cost is more than 1.
            Its red cost is more than 1.
          It gains 1 cut blue cube.
          It gains 1 cut red cube.
        Cut 1 blue:
          Only if its blue cost is 2.
          Only if its red cost is 0.
          It gains 1 cut blue cube.
        Cut 1 red:
          Only if its red cost is 2.
          Only if its blue cost is 0.
          It gains 1 cut red cube.
      Move it to their development.
      Turn it face down.
      No other player can tell it from the cards in their backlog.
```

  - **Append these 6 examples.**

```text
Example: a player without a Tag may still Greenlight Face-Down when some player provides it, paying no License: a bluff, which rivals see only as a card back (section 6, section 14, ruling 7, ruling 21)
  Given the phase is actions
  And p0 has 2 capital
  And p1's operations has a Tech Blog
  And p0's backlog has a Search Engine
  When p0 greenlights the Search Engine
  Then it is rejected because "the card has no requires or they have a card in their operations whose tag is the card's requires or another player tied to them by a card in their portfolio has a card in their operations whose tag is the card's requires or they have at least the license in capital"
  When p0 greenlights face down the Search Engine
  Then it is accepted
  And p0 has 2 capital
  And p1 has 7 capital
  And p0 has 3 actions
  And p0's development has a Search Engine
  And the Search Engine in p0's development is face down
  And p0 sees the Search Engine in p0's development
  And p1 can't see the Search Engine in p0's development

Example: a card can't be Greenlit Face-Down when no player provides a Tag it needs, nor into a full development (section 14, ruling 21)
  Given the phase is actions
  And p1's operations has a Server Farm
  And p0's backlog has a Search Engine and a Planetary Wi-Fi
  When p0 greenlights face down the Search Engine
  Then it is rejected because "the card has no requires or some player has a card in their operations whose tag is the card's requires"
  When p0 greenlights face down the Planetary Wi-Fi
  Then it is rejected because "the card has no also requires or some player has a card in their operations whose tag is the card's also requires"
  Given p0's development has a To-Do List, a Flashlight App and a Basic Website
  When p0 greenlights face down the Planetary Wi-Fi
  Then it is rejected because "their development has fewer than 3 cards"

Example: a Tier 1 card may go Face-Down too, needing no Tag (section 6, section 14, the spec's call)
  Given the phase is actions
  And p0's backlog has a To-Do List
  When p0 greenlights face down the To-Do List
  Then the To-Do List in p0's development is face down
  And p1 can't see the To-Do List in p0's development

Example: Domain Expertise cuts a Face-Down Greenlight as it cuts any other, and the cut stays hidden with the card (section 19, ruling 25)
  Given the phase is actions
  And p0's operations has a Smart Lock
  And p0's backlog has a Drone Delivery
  When p0 greenlights face down the Drone Delivery
  Then it is rejected because "Choose one: cut 2 blue, cut 2 red or cut 1 of each."
  When p0 greenlights face down the Drone Delivery, choosing cut 2 red
  Then the Drone Delivery in p0's development has 4 red need
  And the Drone Delivery in p0's development is face down
  And p1 can't see the Drone Delivery in p0's development

Example: a rival who saw a card drafted can't tell which card of the backlog went into development Face-Down (the slice's R1, the overview's anti-goal)
  Given the phase is actions
  And the growth market has a Search Engine and a Server Farm
  And p0's backlog has a To-Do List
  And p1's operations has a Tech Blog
  When p0 drafts the Search Engine
  And p0 greenlights face down the Search Engine
  Then p1 can't tell the Search Engine in p0's development from the cards in p0's backlog

Example: rivals see the staff on a Face-Down project as they are, but not the project (the slice's R3, ruling 25)
  Given the phase is actions
  And p0's development has a Search Engine
  And the Search Engine in p0's development has a Firmware Specialist and a Junior Software Dev on it
  And the Search Engine in p0's development is face down
  Then p1 can't see the Search Engine in p0's development
  And p1 sees the Firmware Specialist in p0's development team
  And p1 sees the Junior Software Dev in p0's development team
```

  **How the numbers come** (§6, §14.B, §19.A, §20.C, rulings 7, 21, 25):
  - **No License Face-Down:** "You must Greenlight Face-Up to pay a License" (§6). Example 1 is 2 capital, short of the $3 License, unchanged. A Greenlight is 0 AP (ruling 7): 3 actions.
  - **A provider somewhere** (§14.B.2–3, ruling 21). The Search Engine requires Platform, which the Tech Blog provides and the Server Farm (Cloud) doesn't. The Planetary Wi-Fi requires Cloud and IoT, and no one has IoT.
  - **3 projects at most** (§14.B.1).
  - **Domain Expertise** (§19.A): the Smart Lock is Deep Tech and online, and so is the Drone Delivery (6 Blue, 6 Red), so three cuts are open. Red 6 − 2 = 4.
  - **Lines each example pins:**
    - 1: the button, `Move it to their development.`, `Turn it face down.`, and the requires group's provider line;
    - 2: the requires and also requires provider lines, and the 3-project line;
    - 3: both `The card has no …` alternatives;
    - 4: the cut block's run through a Face-Down press (each copied line is pinned by the copy test);
    - 5: `No other player can tell it from the cards in their backlog.`;
    - 6: the table's mark, with the R3 test.
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`, then the removal probe.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx \
  src/pages/designer/playtest-fitted.test.tsx src/pages/designer/tableaux.test.ts README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator Greenlights a project Face-Down for no License whenever some player provides its Tags, shows rivals a card back with its staff as they are, and gives the backlog fresh ids so no rival can follow the card

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 2: The Audit window: the offer, the bid, the reveal, and the Audit Shield

Every verdict is clean in this task. Task 3 adds the check, so every example here has a legal project.

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count); `playtest-fitted.test.tsx` where it pins the phase list

**Interfaces:**
- Consumes: Task 1; 9-1's `its owner is …`, the ask under a button, `{holder} pays the {gamenumber} to its owner`; 8-2b's `cto`; 7-2b's `windowJudge`, `turnOf`, `ANSWERS`; 8-2a's `askOf`.
- Produces (rules):
  - the flags `under audit`, `invited`, `the whistleblower` (players) and `passed over` (cards); the game number `high bid`;
  - `Shielding:`, `Open to audit:`;
  - `Phase: audit`, `Phase: declaration`, `Phase: bidding` and their buttons.
- Produces (test file):

```ts
const AUDIT = "audit a card in another player's development";
const PASS_THE_AUDIT = 'pass the audit';
const RAISE = 'raise an amount';
const PASS_THE_BID = 'pass the bid';
/** The ids each game's Audits revealed, in order: a card audited twice is a failure. */
type Revealed = Set<string>;
```

- [ ] **Step 1: Change the tests.**
  - **Pins.**
    - `results` is N₁₂ + 13; the designer page's count too.
    - `PHASES` gains `'audit'` right after `'engine'`, and `'declaration'` and `'bidding'` last.
    - `ANSWERS` gains `AUDIT`, `PASS_THE_AUDIT`, `RAISE` and `PASS_THE_BID`.
    - `askOf` is set while the phase is `bidding` too.
    - `playGame` skips in `turnsIn` each move whose `before.turn.phase` is `declaration` or `bidding`.
  - **The Engine.**
    - `ranTheEngine` and `atTheEngine` are unchanged: cubes are made as the Engine starts.
    - Every check that expects the Commit in the move that ran the Engine now expects it in the move that leaves `audit`. That move may be another seat's in `declaration` or `bidding`, read through `turnOf`.
  - **Invariants (after every move):**
    - **Flags and the high bid.**
      - At most one seat is `the whistleblower`, and only while `turnOf(after).phase` is `audit`, `declaration` or `bidding`.
      - `under audit` is held only by `turnOf(after).seat`, and only then.
      - `high bid` rises only in a `RAISE` or as an `AUDIT` opens at 3, and a `RAISE` is by exactly the amount pressed.
    - **Revealing.** A card in a development row turns face up only:
      - as an `AUDIT` press reveals it (the press itself with no one asked, or the move that closes its bid);
      - in a `DISCLOSE` of it (Task 5);
      - by leaving the row (a Launch).
    - **Audited once.** Each card an Audit reveals is added to the game's `Revealed`; one already there fails.
    - **Money.** A clean reveal moves exactly `high bid` from the Whistleblower to the card's owner, and no other capital.
    - **Shield.** No `AUDIT` is accepted of a card with a `shielding` card on it in `before`.
  - **The auto-player.** `playTurn` goes on while `TURN_OF_KEY` is `by`'s, and answers:
    - **In `declaration`, as the current seat:**
      - when `(t + i) % 3 === 0`, it presses `AUDIT` with the first card of the active seat's development, in slot order, that the press allows (through the view, as `viewedCards` lists them); else `PASS_THE_AUDIT`;
      - `i` counts the `declaration` moves made so far in this turn.
    - **In `bidding`, as the asked seat:**
      - when `(t + j) % 4 === 1` and it has at least `high bid + 1` capital, it presses `RAISE` with that amount; else `PASS_THE_BID`;
      - `j` counts the `bidding` moves made so far in this turn.
  - **The view** (a new `it('offers a rival the active player’s Face-Down projects as card backs, refuses one with a working CTO in words that name no card, and shows the bid’s waiting line with no name (§7.A, §11.G.2, the slice’s R3)')`). Take the table of example 6 below up to p0's last action.
    - **In `declaration`,** p1's view of `AUDIT` lists both projects, in slot order, as `a face-down card`:
      - the Search Engine's verdict is the view's words for `no card on it is shielding`, and the Blockchain Ledger's is allowed;
      - `engine.dispatch` of p1's `AUDIT` of the Search Engine is refused with that reason, which contains no card name.
    - **After p1 audits the Blockchain Ledger:**
      - p2's and p1's `seatExtras(…).waiting` are `{ by: 'p1', cards: ['a face-down card'], … }` with no id;
      - p0's names `Blockchain Ledger`;
      - p2's buttons are `RAISE` and `PASS_THE_BID`.
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Change the rules text.**
  - **Declarations** (§7.A).
    - After the last `  Players can …` line of the opening block add:

```text
  Players can be under audit.
  Players can be invited.
  Players can be the whistleblower.
```

    - After the last `  The game has …` line add `  The game has a high bid of 0.`
    - After the last `  Cards can be …` line add `  Cards can be passed over.`
  - **Who shields and what is open** (§7.A, §11.G.2 Effect B, ruling 8). Right before the `Blue supply:` section add:

```text
Shielding:
  Only if its cto is more than 0.
  Only if it is not onboarding.

Open to audit:
  Only if it is face down.
  Only if it is not passed over.
  Only if no card on it is shielding.
```

  - **The Engine** (§5 Phase D, ruling 4). In `Phase: engine`, each of its three `    Go to commit.` lines becomes `    Go to audit.` Re-read the file for any other `Go to commit.` and report it.
  - **The step.** Right after the `Phase: engine` block (before `Phase: commit`) add:

```text
Phase: audit
  Hint: Your rivals may audit your Face-Down projects now, before your new cubes commit.
  When this phase starts:
    They are under audit.
  When they have a card in their development that is open to audit:
    Every card in their development is passed over.
    Every player is invited.
    They are not invited.
  When a player is invited:
    Only if they have less than 3 capital.
    They are not invited.
  When a player is invited:
    The declaration phase starts with them.
  When no player is invited:
    Only if they have no card in their development that is open to audit.
    They are not under audit.
    Every card in their development is not passed over.
    Go to commit.
```

  - **The offer and the bid** (§7.A, R4). Right before `End:` add:

```text
Phase: declaration
  Players take turns.
  Hint: You may audit one of the active player's Face-Down projects, opening the bid at $3, or pass.
  A player may audit a card in another player's development.
    Only if its owner is under audit.
    Only if it is face down.
    Only if no card on it is shielding.
    Then:
      No player is invited.
      The high bid is 3.
      They are the whistleblower.
      Each other player has the bidding, in turn from their left.
        Only if they are not under audit.
      Turn it face up.
      Every card in its owner's development is not passed over.
      The whistleblower pays the high bid to its owner.
      No player is the whistleblower.
      Go back to the interrupted turn.
  A player may pass the audit.
    Then:
      They are not invited.
  After a player passes the audit, the turn passes to the next player on the left who is invited.
  When no player is invited:
    Go back to the interrupted turn.

Phase: bidding
  Players take turns.
  Hint: Raise the audit's bid by at least $1, or pass. The highest bidder is the Whistleblower.
  A player may raise an amount.
    Only if the amount is more than the high bid.
    Only if they have at least the amount in capital.
    Then:
      The high bid is the amount.
      No player is the whistleblower.
      They are the whistleblower.
      The bidding passes to the left.
  A player may pass the bid.
    Then:
      The bidding passes to the left.
```

  - If example 3 below finds the poorer p1 given `declaration`, add `    Only if they have at least 3 capital.` under the second `When a player is invited:`, as `INSPECT_GAME` has it, and report it.
  - **Append these 7 examples.**

```text
Example: rivals may audit a Face-Down project in its owner's Engine phase, after the cubes are made and before they commit; a clean project's Whistleblower pays the owner the bid, the card stays Face-Up and its cubes commit (section 5, section 7, ruling 4)
  Given 3 players
  And the phase is actions
  And p0's operations has a Tech Blog
  And p0's development has a Search Engine
  And the Search Engine in p0's development has the Architect on it
  And the Search Engine in p0's development is face down
  When p0 ends their actions
  Then the phase is declaration
  And it is p1's turn
  And the Search Engine in p0's development has 3 new blue cubes
  And the Search Engine in p0's development has 0 blue cubes
  When p1 audits the Search Engine in p0's development
  Then the phase is bidding
  And it is p2's turn
  When p2 raises 5
  Then the Search Engine in p0's development is face up
  And the Search Engine in p0's development has 3 blue cubes
  And p0 has 12 capital
  And p1 has 7 capital
  And p2 has 2 capital
  And it is p1's turn

Example: the bid goes once around from the declarer's left, never to the player audited, and the declarer doesn't bid again; the highest bidder is the Whistleblower (section 7)
  Given 4 players
  And the phase is actions
  And p0's operations has a Tech Blog
  And p0's development has a Search Engine
  And the Search Engine in p0's development is face down
  When p0 ends their actions
  And p1 passes the audit
  Then it is p2's turn
  When p2 audits the Search Engine in p0's development
  Then the phase is bidding
  And it is p3's turn
  And p2 is the whistleblower
  And the high bid is 3
  When p3 raises 3
  Then it is rejected because "the amount is more than the high bid"
  When p3 raises 4
  Then it is p1's turn
  And p3 is the whistleblower
  When p1 raises 6
  Then the Search Engine in p0's development is face up
  And p0 has 13 capital
  And p1 has 1 capital
  And p2 has 7 capital
  And p3 has 7 capital
  And p1 is not the whistleblower

Example: a rival with less than $3 is passed over, and when every other rival passes the project stays Face-Down and its cubes commit (section 7)
  Given 3 players
  And the phase is actions
  And p1 has 2 capital
  And p0's operations has a Tech Blog
  And p0's development has a Search Engine
  And the Search Engine in p0's development has the Architect on it
  And the Search Engine in p0's development is face down
  When p0 ends their actions
  Then the phase is declaration
  And it is p2's turn
  When p2 passes the audit
  Then it is p1's turn
  And the phase is actions
  And the Search Engine in p0's development is face down
  And the Search Engine in p0's development has 3 blue cubes

Example: with two players no one else bids, so the declarer is the Whistleblower at $3; a project its rival passed on is offered again at its owner's next Engine (section 7, section 5)
  Given the phase is actions
  And p0's operations has a Tech Blog
  And p0's ops team has a Junior Software Dev
  And p0's development has a Search Engine
  And the Search Engine in p0's development is face down
  When p0 ends their actions
  And p1 passes the audit
  Then it is p1's turn
  And the phase is actions
  When p1 ends their actions
  And p0 ends their actions
  Then the phase is declaration
  When p1 audits the Search Engine in p0's development
  Then the Search Engine in p0's development is face up
  And p0 has 11 capital
  And p1 has 4 capital

Example: after a verdict the offer starts again from the audited player's left, for the Face-Down projects not yet audited, and a card is audited only once (section 7, the slice's R4)
  Given 3 players
  And the phase is actions
  And p0's operations has a Tech Blog
  And p0's development has a Search Engine and a Blockchain Ledger
  And the Search Engine in p0's development is face down
  And the Blockchain Ledger in p0's development is face down
  When p0 ends their actions
  And p1 passes the audit
  And p2 audits the Blockchain Ledger in p0's development
  And p1 passes the bid
  Then the phase is declaration
  And it is p1's turn
  And the Blockchain Ledger in p0's development is face up
  When p1 audits the Blockchain Ledger in p0's development
  Then it is rejected because "it is face down"
  When p1 passes the audit
  And p2 passes the audit
  Then it is p1's turn
  And the phase is actions
  And the Search Engine in p0's development is face down
  And p0 has 10 capital
  And p2 has 4 capital

Example: only the audited player's Face-Down projects may be audited, and not one a working CTO shields (section 7, section 11)
  Given 3 players
  And the phase is actions
  And p0's operations has a Tech Blog
  And p0's development has a Search Engine and a Blockchain Ledger
  And the Search Engine in p0's development has the Architect on it
  And the Architect in p0's development team has 1 cto
  And p0's locked equity has an Equity whose founder is p0
  And the Search Engine in p0's development is face down
  And the Blockchain Ledger in p0's development is face down
  And p2's operations has a Basic Website
  And p2's development has a Server Farm
  And the Server Farm in p2's development is face down
  When p0 ends their actions
  And p1 audits the Search Engine in p0's development
  Then it is rejected because "no card on it is shielding"
  When p1 audits the Server Farm in p2's development
  Then it is rejected because "its owner is under audit"
  When p1 audits the Blockchain Ledger in p0's development
  Then the phase is bidding

Example: a CTO reassigned this turn is onboarding, so the project it joined has no Audit Shield yet (section 11, ruling 8)
  Given the phase is actions
  And p0's operations has a Tech Blog
  And p0's development has a Search Engine and a Blockchain Ledger
  And the Search Engine in p0's development has the Architect on it
  And the Architect in p0's development team has 1 cto
  And p0's locked equity has an Equity whose founder is p0
  And the Blockchain Ledger in p0's development is face down
  When p0 reassigns the Architect to the Blockchain Ledger
  And p0 ends their actions
  Then the phase is declaration
  When p1 audits the Blockchain Ledger in p0's development
  Then the Blockchain Ledger in p0's development is face up
```

  **How the numbers come** (§5 Phase B and D, §7.A, §7.C, §11.G.2, §20.B, rulings 4, 8):
  - **The window sits between Clean and Commit** (§5 Phase D step 3, ruling 4). The Architect leads the Search Engine and makes 3 Blue (§20.B.1). The cubes wait as new cubes through the window and commit after it.
  - **The bid** (§7.A). It opens at $3, and the declarer must have $3. It goes once around from the declarer's left, skipping the active player; the declarer doesn't bid again; the highest bidder is the Whistleblower.
    - Example 1: p2 raises to 5; 7 + 5 = 12 and 7 − 5 = 2.
    - Example 2: p3 4, then p1 6; 7 + 6 = 13 and 7 − 6 = 1.
  - **A clean project** (§7.C Scenario 1): the Whistleblower pays the owner the full bid. The card stays Face-Up, so it is never offered again (§7.A.4).
  - **Example 4:** at p0's next Income the Tech Blog earns 1 (7 + 1), and the Junior gives its Blue bandwidth (§5 Phase B). Then p1's $3: 8 + 3 = 11 and 7 − 3 = 4.
  - **The Audit Shield** (§11.G.2 Effect B): a Tier 3 talent working on the project, with no Onboarding Token (ruling 8); a reassigned unit is onboarding (§6).
  - **Lines each example pins:**
    - 1: the step's rules, the button's reveal and payment, the bid's raise, and `Go back to the interrupted turn.`;
    - 2: `The high bid is 3.`, `They are the whistleblower.`, the ask's `Only if they are not under audit.`, the raise's lines, the declaration's pass and After line, and `No player is the whistleblower.`;
    - 3: the less-than-$3 rule, `When no player is invited:` in both phases, and `Every card in their development is passed over.`;
    - 4: the step's `Every card in their development is not passed over.` and the bid with no one asked;
    - 5: `Every card in its owner's development is not passed over.`, `No player is invited.` and `Only if it is face down.`;
    - 6: `Only if its owner is under audit.`, `Only if no card on it is shielding.` and Shielding's cto line;
    - 7: Shielding's onboarding line.
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`, then the removal probe.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx \
  src/pages/designer/playtest-fitted.test.tsx README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's rivals may audit a Face-Down project between its owner's Engine and Commit, in turn from the owner's left, bidding once around from $3; a working CTO shields it, and the offer starts again after each verdict

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 3: The legality check and the Fold

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count)

**Interfaces:**
- Consumes: Tasks 1–2; 9-1's `They pay up to …`; 7-2a's Partner lines, the Pivot's return line and `For each card in each portfolio whose founder is them, …`; 8-1's `its owner's <zone>`; 7-1's `its founder's <zone>`; 5-1's count.
- Produces (rules):
  - the flags `caught` and `in reach`;
  - `Ghost progress:`, `Sources:`, `Second sources:`, `Requires missing:`, `Also requires met:`, `Also requires missing:`, `Illegal:`;
  - the step's marks and catches; the button `fold a card in their development`.
- Produces (test file): `const FOLD = 'fold a card in their development';`

- [ ] **Step 1: Change the tests.**
  - **Pins.** `results` is N₁₂ + 20; the designer page's count too.
  - **The Fold is a Pivot** (append to `describe('lines the rulebook asks the same of')`): `it('folds as a Pivot scraps, without its Onboarding Token, losing the new cubes and the catch (§7.C, ruling 9, the slice’s R4)')`. The `text` of `actionNamed(FOLD).effects` equals that of `actionNamed(PIVOT).effects` (each as `ref.text` reads it, so write the expected lines in that form), with these changes:
    - `Every card on it is onboarding.` removed;
    - `It loses its new blue cubes.` and `It loses its new red cubes.` after `It loses its red cubes.`;
    - `It is not caught.` after `It loses its bugs.`;
    - then `They pay up to 4 to the whistleblower.`, `They pay up to 1.` and `No player is the whistleblower.`
  - **Invariants (after every move):**
    - **Catches.** A card is `caught` only in its owner's turn, only while `turnOf(after).phase` is `audit`, and only while some seat is `the whistleblower`.
    - **Marks.** No card is `in reach` unless `turnOf(after).phase` is `audit`, `declaration` or `bidding`.
    - **A verdict.** A reveal catches the card exactly when `runtime.workedFlag(after, id, 'illegal')`, and moves no capital then.
    - **R2.** No card in a development row is `ghost progress` after any move (Stalled projects make nothing).
    - **A `FOLD`:**
      - it moves `min(5, capital)` from the mover: `min(4, capital)` to the Whistleblower, the rest to the bank;
      - the card is in the open idea pool (or the box by FIFO), face up, with no cubes of any kind and not `caught`;
      - every card that was on it is on the mover's bench or in the open job market (a fired Diva), and each Equity that was on it is on no card in its holder's portfolio.
    - **Secured Access.** At each reveal, `securedFor(before, owner, card)` is false exactly when `requires missing` or `also requires missing` holds for the card.
  - **The auto-player.** In `audit`, as the active seat with a `caught` card, it presses `FOLD` with it (Task 4 adds Settle).
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Change the rules text.**
  - **Declarations.** After `  Cards can be passed over.` add `  Cards can be caught.` and `  Cards can be in reach.`
  - **The check** (§7.B, §14.B.2, §17.B.3, rulings 5, 11, R2). Right after the `Open to audit:` section add:

```text
Ghost progress:
  Only if it is stalled.
  Only if one of:
    Its new blue cubes are more than 0.
    Its new red cubes are more than 0.

Sources:
  A card's sources is the number of the cards in each operations that are in reach and whose tag is its requires.

Second sources:
  A card's second sources is the number of the cards in each operations that are in reach and whose tag is its also requires.

Requires missing:
  Only if it is not a Tier 1 card.
  Only if its sources are 0.

Also requires met:
  Only if one of:
    It has no also requires.
    Its second sources are more than 0.

Also requires missing:
  Only if it is not also requires met.

Illegal:
  Only if one of:
    It is ghost progress.
    It is requires missing.
    It is also requires missing.
```

  - **Secured Access marked at the step** (§7.B.2, §17.B.3, ruling 11). In `Phase: audit`:
    - Under `  When this phase starts:`, after `    They are under audit.`, add:

```text
    Every card in their operations is in reach.
    For each card in their portfolio, every card in its founder's operations is in reach.
    For each card in each portfolio whose founder is them, every card in its owner's operations is in reach.
```

    - Under `  When they have a card in their development that is open to audit:`, before its first line, add `    Only if no card in their development is caught.`
    - Under the step's `  When no player is invited:`, after `    Only if they have no card in their development that is open to audit.`, add `    Only if no card in their development is caught.`; and right before its `    Go to commit.` add `    No card is in reach.`
  - **The verdict** (§7.C). In `A player may audit a card in another player's development.`:
    - `      The whistleblower pays the high bid to its owner.` and `      No player is the whistleblower.` become:

```text
      If it is illegal, it is caught.
      If it is not illegal, the whistleblower pays the high bid to its owner.
      If it is not illegal, no player is the whistleblower.
```

  - **The Fold** (§7.C Option A, ruling 9, the slice's R4). In `Phase: audit`, after its last rule, add the lines below. Its lines down to `      Move it to the open idea pool.` are the Pivot's as it reads at HEAD, with the changes the copy test names.

```text
  A player may fold a card in their development.
    Only if it is caught.
    Then:
      Every card on it that is egotistic is fired.
      Every card on it whose trait is Ego goes to the open job market.
      For each card on it, it loses its pending blue.
      For each card on it, it loses its pending red.
      For each card on it, it loses its pending green.
      Every card on it goes to their bench.
      It loses its blue cubes.
      It loses its red cubes.
      It loses its new blue cubes.
      It loses its new red cubes.
      It loses its cut blue cubes.
      It loses its cut red cubes.
      It loses its bugs.
      It is not caught.
      The other players' cards on it go to their owners' portfolio.
      Move it to the open idea pool.
      They pay up to 4 to the whistleblower.
      They pay up to 1.
      No player is the whistleblower.
```

  - Its Hint: `  Hint:` of `Phase: audit` becomes `  Hint: Your rivals may audit your Face-Down projects now, before your new cubes commit. A project caught bluffing must Fold: $5, $4 of it to the Whistleblower.`
  - **Append these 7 examples.**

```text
Example: a bluff is caught at its Audit: a Tag the owner neither provides nor has from a Partner is a Missing Dependency; the bid comes back, and a Fold scraps the project and all its cubes, sends its staff to the bench with no Onboarding, and costs $5, $4 to the Whistleblower and $1 to the bank (section 7, ruling 21)
  Given 3 players
  And the phase is actions
  And p1's operations has a Tech Blog
  And p0's development has a Search Engine and a To-Do List
  And the Search Engine in p0's development has 4 blue cubes
  And the Search Engine in p0's development has the Architect on it
  And the Search Engine in p0's development is face down
  When p0 ends their actions
  And p1 audits the Search Engine in p0's development
  And p2 raises 4
  Then the phase is audit
  And it is p0's turn
  And the Search Engine in p0's development is caught
  And p2 is the whistleblower
  And p2 has 7 capital
  When p0 folds the To-Do List
  Then it is rejected because "it is caught"
  When p0 folds the Search Engine
  Then the open idea pool has a Search Engine
  And the Search Engine in the open idea pool has 0 blue cubes
  And the Search Engine in the open idea pool has 0 new blue cubes
  And the Search Engine in the open idea pool is not caught
  And p0's bench has the Architect
  And the Architect in p0's bench is not onboarding
  And p0 has 2 capital
  And p1 has 7 capital
  And p2 has 11 capital
  And p2 is not the whistleblower

Example: Ghost Progress, new cubes on a Tier 2 project with no Lead, is illegal too; it never happens in play, since a Stalled project makes nothing, so the cubes are arranged; a second Fold the owner can't cover pays the Whistleblower what is left (section 7, ruling 24, the slice's R2)
  Given the phase is actions
  And p0's operations has a Tech Blog
  And p0's development has a Blockchain Ledger and a Server Farm
  And the Blockchain Ledger in p0's development has a Junior Software Dev on it
  And the Blockchain Ledger in p0's development has 2 new blue cubes
  And the Server Farm in p0's development has 2 new red cubes
  And the Blockchain Ledger in p0's development is face down
  And the Server Farm in p0's development is face down
  When p0 ends their actions
  Then the Blockchain Ledger in p0's development has 2 new blue cubes
  When p1 audits the Blockchain Ledger in p0's development
  Then the Blockchain Ledger in p0's development is caught
  When p0 folds the Blockchain Ledger
  Then p0 has 2 capital
  And p1 has 11 capital
  When p1 audits the Server Farm in p0's development
  Then the Server Farm in p0's development is caught
  When p0 folds the Server Farm
  Then the Server Farm in the open idea pool has 0 new red cubes
  And p0 has 0 capital
  And p1 has 13 capital

Example: Secured Access is the owner's own Tag or a Partner's, whichever of the two holds the other's Equity, so a project relying on them is clean (section 7, section 17, ruling 11)
  Given 3 players
  And the phase is actions
  And p0's operations has a Server Farm
  And p0's portfolio has an Equity whose founder is p1
  And p1's operations has a Tech Blog
  And p2's portfolio has an Equity whose founder is p0
  And p2's operations has a Smart Lock
  And p0's development has a Search Engine and a Planetary Wi-Fi
  And the Search Engine in p0's development is face down
  And the Planetary Wi-Fi in p0's development is face down
  When p0 ends their actions
  And p1 audits the Search Engine in p0's development
  And p2 passes the bid
  Then the Search Engine in p0's development is face up
  And p0 has 10 capital
  When p1 passes the audit
  And p2 audits the Planetary Wi-Fi in p0's development
  And p1 passes the bid
  Then the Planetary Wi-Fi in p0's development is face up
  And p0 has 13 capital
  And p1 has 4 capital
  And p2 has 4 capital

Example: a product switched off still provides its Tag, so a project relying on it is clean (section 7, ruling 5)
  Given the phase is actions
  And p0's operations has a Tech Blog
  And the Tech Blog in p0's operations is offline
  And p0's development has a Search Engine
  And the Search Engine in p0's development is face down
  When p0 ends their actions
  And p1 audits the Search Engine in p0's development
  Then the Search Engine in p0's development is face up
  And p0 has 10 capital

Example: a Fold fires the Diva as a Pivot does, sends the rest of the staff to the bench without their Pending tokens, and returns an Investor's Consultant to their portfolio on no card; a missing second Tag is caught as the first is (section 7, section 17, ruling 9, the slice's R4)
  Given 3 players
  And the phase is actions
  And p0's operations has a Server Farm
  And p2's operations has a Smart Lock
  And p0's development has a Planetary Wi-Fi
  And the Planetary Wi-Fi in p0's development has the Diva and a Junior Software Dev on it
  And p1's portfolio has an Equity whose founder is p0
  And the Equity whose founder is p0 in p1's portfolio is on the Planetary Wi-Fi in p0's development
  And the Equity whose founder is p0 in p1's portfolio is blue consultant
  And the Planetary Wi-Fi in p0's development is face down
  When p0 ends their actions
  Then the Junior Software Dev in p0's development team has 1 pending blue
  When p1 passes the audit
  And p2 audits the Planetary Wi-Fi in p0's development
  And p1 passes the bid
  Then the Planetary Wi-Fi in p0's development is caught
  When p0 folds the Planetary Wi-Fi
  Then the open idea pool has a Planetary Wi-Fi
  And the open job market has the Diva
  And p0's bench has a Junior Software Dev
  And the Junior Software Dev in p0's bench has 0 pending blue
  And the Equity whose founder is p0 in p1's portfolio is on no card
  And p0 has 2 capital
  And p2 has 11 capital

Example: a Tier 1 project needs no Tag, so a Face-Down one is always clean (section 7, the spec's call)
  Given the phase is actions
  And p0's development has a To-Do List
  And the To-Do List in p0's development is face down
  When p0 ends their actions
  And p1 audits the To-Do List in p0's development
  Then the To-Do List in p0's development is face up
  And p0 has 10 capital
  And p1 has 4 capital

Example: what a player may rely on is worked out afresh at each Audit, so a rival's Tag never covers a bluff (section 7, section 17)
  Given the phase is actions
  And p0's operations has a Tech Blog
  And p1's development has a Search Engine
  And the Search Engine in p1's development is face down
  When p0 ends their actions
  And p1 ends their actions
  Then the phase is declaration
  And it is p0's turn
  When p0 audits the Search Engine in p1's development
  Then the Search Engine in p1's development is caught
```

  **How the numbers come** (§7.B–C, §11.B, §17.B.3–4, §20.B, §20.C, rulings 5, 9, 11, 21, 24, R2, R4):
  - **The checklist** (§7.B).
    - Ghost Progress: new cubes on a Tier 2/3 project with no matching Lead. A hybrid with one Lead is legal, which is `Stalled:`'s own test.
    - Missing Dependency: a Tag the owner neither provides nor gets from a Partner.
    - Tags: the Search Engine and the Blockchain Ledger need Platform, the Server Farm needs Platform, and the Planetary Wi-Fi needs Cloud and IoT (§20.C).
  - **Partners** (§17.B.3): either holds the other's Equity. In example 3, p0 holds p1's (Platform), and p2 holds p0's (IoT); Cloud is p0's own.
  - **Offline products provide their Tags** (ruling 5).
  - **A caught project** (§7.C Scenario 2): the bid comes back, so no capital moves at the reveal.
  - **The Fold** (§7.C Option A): $5, $4 to the Whistleblower first.
    - Example 1: 7 − 5 = 2 and 7 + 4 = 11.
    - Example 2: the second Fold finds 2 capital, all to the Whistleblower, the rest forgiven (ruling 24, the spec's call): 11 + 2 = 13.
    - Example 5: p2, the Whistleblower at $3, gets 7 + 4 = 11.
  - **What a Fold scraps:** the card to the Open Idea Pool, all cubes (Legacy and Transient) discarded, staff to the Bench with no Onboarding Token, Pending tokens lost, the Diva fired (ruling 9), Consultants returned (§17.B.4, R4).
    - Example 5's Junior gained a Pending Blue at the Engine, because the Diva leads the hybrid. The Consultant adds a Blue cube that stays new.
  - **Clean audits at $3** with two players: 7 + 3 = 10 and 7 − 3 = 4. In example 3, each of two $3 bids is paid to p0: 13.
  - **Lines each example pins:**
    - 1: `Requires missing:`'s `sources are 0`, `Sources:`, Illegal's requires line, `If it is illegal, it is caught.`, the catch guard in the step's end rule, the Fold's guard, the new-blue loss, the uncatch and the payments;
    - 2: `Ghost progress:`'s two cube lines, Illegal's Ghost line, the new-red loss, `They pay up to 1.`'s zero, the catch guard in the offer rule;
    - 3: the two Partner marks, `Second sources:` and Also requires met's second line;
    - 4: none; it guards ruling 5;
    - 5: `Also requires missing:`, Illegal's also line, the Fold's Diva, pending and return lines;
    - 6: `Requires missing:`'s Tier 1 line;
    - 7: `No card is in reach.`
    - The own mark, `Ghost progress:`'s `stalled` line, `Also requires met:`'s `no also requires` line and the two `If it is not illegal` lines are pinned by every clean example of Task 2. The copy test pins the Fold's Pivot lines.
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`, then the removal probe.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's Audit catches Ghost Progress and a Tag the owner neither provides nor has from a Partner; a caught owner Folds, scrapping the project as a Pivot does and paying $5, the Whistleblower's $4 first

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 4: Settle

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count)

**Interfaces:**
- Consumes: Tasks 1–3; 6-2b's `the license` and `the event in play has the …`; 9-1's `{holder} gets {int} {counter}`.
- Produces (rules): `Ghost only:`, `Trolled:`, `Tag fee:`, `Settlement:`; the button `settle a card in their development`.
- Produces (test file): `const SETTLE = 'settle a card in their development';`

- [ ] **Step 1: Change the tests.**
  - **Pins.** `results` is N₁₂ + 26; the designer page's count too.
  - **Settle pays as a Greenlight** (append to `describe('lines the rulebook asks the same of')`): `it('pays a Settlement’s Tag fees as a Greenlight pays its Licenses, and asks the same Tags somewhere (§7.C, ruling 11)')`.
    - `bare` of the two choice refs among `actionNamed(SETTLE).effects` (`choicesOf`) equals `bare` of the Greenlight's two;
    - `bare` of its two `Some player has …` groups equals the Greenlight's.
  - **Invariants (after every move):**
    - **Tag fee.** Once a round has started, `runtime.workedValue(state, id, 'tag fee')` of any card equals `the license` (Gap 3).
    - **A `SETTLE`:**
      - it moves exactly the card's `settlement` in `before` from the mover: 3 to the bank, `the license` to each payee chosen, 3 more to the bank when the card was `ghost only`;
      - the bank pays the Whistleblower 4, or 8 under Whistleblower Protection Act;
      - the card stays in the development row, face up and not `caught`, and the seats lose the `the whistleblower` flag.
  - **The auto-player.** In `audit`, as the active seat with a `caught` card: when `t % 2 === 0`, or the Event in play is Patent Trolls or Whistleblower Protection Act, it presses `SETTLE` if the rules allow it (answering the payee as any choice). Otherwise, or when refused, it presses `FOLD`.
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Change the rules text.**
  - **What a Settlement costs** (§7.C Option B, §20.D 3, rulings 11, 25, R4). Right after the `Illegal:` section add:

```text
Ghost only:
  Only if it is ghost progress.
  Only if it is not requires missing.
  Only if it is not also requires missing.

Trolled:
  Only if the event in play has the Patent Trolls.

Tag fee:
  A card's tag fee is 3.
  A trolled card's tag fee is 5.

Settlement:
  A card's settlement is 3.
  A requires missing card's settlement goes up by its tag fee.
  An also requires missing card's settlement goes up by its tag fee.
  A ghost only card's settlement goes up by 3.
```

  - **Settle** (§7.C Option B, §20.D 17). In `Phase: audit`, right after the Fold button and its lines, add:

```text
  A player may settle a card in their development.
    Only if it is caught.
    Only if one of:
      The card has no requires.
      Some player has a card in their operations whose tag is the card's requires.
    Only if one of:
      The card has no also requires.
      Some player has a card in their operations whose tag is the card's also requires.
    Only if they have at least the card's settlement in capital.
    Then:
      They pay 3.
      If it is ghost only, they pay 3.
      They pay the license to another player of their choice who has a card in their operations whose tag is the card's requires.
        Only if they have no card in their operations whose tag is the card's requires.
        Only if no other player tied to them by a card in their portfolio has a card in their operations whose tag is the card's requires.
      They pay the license to another player of their choice who has a card in their operations whose tag is the card's also requires.
        Only if they have no card in their operations whose tag is the card's also requires.
        Only if no other player tied to them by a card in their portfolio has a card in their operations whose tag is the card's also requires.
      It is not caught.
      The whistleblower gets 4 capital.
      If the event in play has the Whistleblower Protection Act, the whistleblower gets 4 capital.
      No player is the whistleblower.
```

  - `Phase: audit`'s Hint becomes: `  Hint: Your rivals may audit your Face-Down projects now, before your new cubes commit. A project caught bluffing must Fold ($5, $4 of it to the Whistleblower) or Settle ($3 to the bank and a License for each missing Tag, or $3 more for Ghost Progress alone).`
  - **Append these 6 examples.**

```text
Example: a caught owner may Settle instead: the project becomes legal and stays Face-Up, its cubes commit, and the owner pays the bank $3 and a provider of their choice the $3 License for the missing Tag, while the bank pays the Whistleblower a $4 bounty (section 7, ruling 11, ruling 25)
  Given 3 players
  And the phase is actions
  And p0 has 10 capital
  And p1's operations has a Tech Blog
  And p2's operations has a VPN Service
  And p0's development has a Search Engine and a To-Do List
  And the Search Engine in p0's development has the Architect on it
  And the Search Engine in p0's development is face down
  When p0 ends their actions
  And p1 audits the Search Engine in p0's development
  And p2 passes the bid
  Then the Search Engine in p0's development is caught
  When p0 settles the To-Do List
  Then it is rejected because "it is caught"
  When p0 settles the Search Engine
  Then it is rejected because "Pick who to pay the license to: p1 or p2."
  When p0 settles the Search Engine, paying p2
  Then the Search Engine in p0's development is not caught
  And the Search Engine in p0's development is face up
  And the Search Engine in p0's development has 3 blue cubes
  And p0 has 4 capital
  And p1 has 11 capital
  And p2 has 10 capital

Example: a Settlement costs a License for each missing Tag, and is refused when the owner's cash doesn't cover it (section 7, ruling 25, the spec's call)
  Given 3 players
  And the phase is actions
  And p0 has 8 capital
  And p1's operations has a Server Farm
  And p2's operations has a Smart Lock
  And p0's development has a Planetary Wi-Fi
  And the Planetary Wi-Fi in p0's development is face down
  When p0 ends their actions
  And p1 audits the Planetary Wi-Fi in p0's development
  And p2 passes the bid
  And p0 settles the Planetary Wi-Fi
  Then it is rejected because "they have at least the card's settlement in capital"
  Given p0 has 9 capital
  When p0 settles the Planetary Wi-Fi
  Then p0 has 0 capital
  And p1 has 14 capital
  And p2 has 10 capital

Example: Ghost Progress alone may Settle too, for $3 more to the bank in place of a License: $6 in all, and the cubes commit (section 7, ruling 25, the slice's R2)
  Given the phase is actions
  And p0 has 5 capital
  And p0's portfolio has an Equity whose founder is p1
  And p1's operations has a Tech Blog
  And p0's development has a Blockchain Ledger
  And the Blockchain Ledger in p0's development has 2 new blue cubes
  And the Blockchain Ledger in p0's development is face down
  When p0 ends their actions
  And p1 audits the Blockchain Ledger in p0's development
  And p0 settles the Blockchain Ledger
  Then it is rejected because "they have at least the card's settlement in capital"
  Given p0 has 6 capital
  When p0 settles the Blockchain Ledger
  Then p0 has 0 capital
  And p1 has 11 capital
  And the Blockchain Ledger in p0's development has 2 blue cubes

Example: a missing Tag that no player provides leaves the owner no choice but to Fold (section 7, ruling 21)
  Given the phase is actions
  And p1's operations has a Server Farm
  And p0's development has a Search Engine and a Planetary Wi-Fi
  And the Search Engine in p0's development is face down
  And the Planetary Wi-Fi in p0's development is face down
  When p0 ends their actions
  And p1 audits the Search Engine in p0's development
  And p0 settles the Search Engine
  Then it is rejected because "the card has no requires or some player has a card in their operations whose tag is the card's requires"
  When p0 folds the Search Engine
  And p1 audits the Planetary Wi-Fi in p0's development
  And p0 settles the Planetary Wi-Fi
  Then it is rejected because "the card has no also requires or some player has a card in their operations whose tag is the card's also requires"
  When p0 folds the Planetary Wi-Fi
  Then p0 has 0 capital
  And p1 has 13 capital

Example: during Patent Trolls a Settlement's Tag fee is $5 (section 20, section 7, the slice's R4)
  Given the event deck has the Patent Trolls
  And p1's operations has a Tech Blog
  And p0's development has a Search Engine
  And the Search Engine in p0's development is face down
  And it is p1's turn
  When p1 ends their actions
  Then the event in play has the Patent Trolls
  And the license is 5
  When p0 ends their actions
  And p1 audits the Search Engine in p0's development
  And p0 settles the Search Engine
  Then it is rejected because "they have at least the card's settlement in capital"
  Given p0 has 8 capital
  When p0 settles the Search Engine
  Then p0 has 0 capital
  And p1 has 16 capital

Example: during Whistleblower Protection Act the bank's bounty for a Settlement is $8 (section 20, section 7)
  Given the event in play has the Whistleblower Protection Act
  And the phase is actions
  And p1's operations has a Tech Blog
  And p0's development has a Search Engine
  And the Search Engine in p0's development is face down
  When p0 ends their actions
  And p1 audits the Search Engine in p0's development
  And p0 settles the Search Engine
  Then p0 has 1 capital
  And p1 has 18 capital
```

  **How the numbers come** (§7.C, §20.C, §20.D 3 and 17, rulings 11, 21, 24, 25, R4):
  - **Settle** (§7.C Option B): $3 to the bank, a $3 License to a Tag Owner of the owner's choice for each missing Tag, and $3 more to the bank when Ghost Progress is the only fraud; the bank pays the Whistleblower $4. A Partner's Tag is never missing (ruling 25's contradictions), so the License lines skip it as the Greenlight's do.
    - Example 1: 10 − 3 − 3 = 4; p1, the Whistleblower at $3, gets the bid back and 4: 11; p2 7 + 3 = 10.
    - Example 2: 3 + 3 + 3 = 9 > 8, refused; at 9, 0 left; p1 7 + 4 + 3 = 14; p2 10.
    - Example 3: p0 holds p1's Equity, so Platform is secured and only Ghost Progress is caught. 3 + 3 = 6 > 5, refused; at 6, 0 left; p1 7 + 4 = 11. The two new cubes commit.
  - **Cover** (the spec's call before slice 10): Settle needs the cash itself. No owner here has a Maintenance product, so cash plus Fire Sale value is cash too (§7.C), and slice 10 keeps these examples.
  - **The forced Fold** (§7.C, ruling 21): with no Platform and no IoT anywhere, Settle is refused. The first Fold is 7 − 5 = 2 (p1 + 4); the second pays the 2 to p1: 7 + 4 + 2 = 13.
  - **Patent Trolls** (§20.D 3, R4): the Tag Owner's share of a Settlement is $5. 3 + 5 = 8 > 7, refused; at 8, 0 left; p1 7 + 5 + 4 = 16.
  - **Whistleblower Protection Act** (§20.D 17): the bounty doubles to $8. p0 7 − 6 = 1; p1 7 + 3 + 8 = 18.
  - **Lines each example pins:**
    - 1: the button, its guard on `caught`, `They pay 3.`, `It is not caught.`, the bounty, `No player is the whistleblower.`;
    - 2: `Settlement:`'s first three lines, `Tag fee:`'s first line and the cover guard;
    - 3: `Ghost only:`, `If it is ghost only, they pay 3.` and Settlement's Ghost line;
    - 4: both `Some player has …` groups;
    - 5: `Trolled:` and `Tag fee:`'s Patent Trolls line;
    - 6: the Whistleblower Protection Act line.
    - The copy test pins the License lines.
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`, then the removal probe.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's caught owner may Settle when cash covers it, paying the bank $3 and a provider of their choice a License for each missing Tag ($5 under Patent Trolls), or $3 more for Ghost Progress alone, while the bank pays the Whistleblower $4 ($8 under Whistleblower Protection Act)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 5: Voluntary Disclosure, the Face-Down Launch and the Stealth Bonus

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count); `playtest-fitted.test.tsx` and `tableaux.test.ts` where they pin the actions phase's offered buttons or the players' counters

**Interfaces:**
- Consumes: Tasks 1–4; 6-2b's round-start lines; 5-1's `If <a> and <b>, …`; 7-2b's Veto.
- Produces (rules): the counter `stealth bonus`; the game number `late license`; the button `disclose a card in their development`; Launch's two lines; the score line.
- Produces (test file): `const DISCLOSE = 'disclose a card in their development';`

- [ ] **Step 1: Change the tests.**
  - **Pins.**
    - `results` is N₁₂ + 33; the designer page's count too.
    - The actions phase's offered buttons gain `DISCLOSE` right after `GREENLIGHT_FACE_DOWN`.
    - The players' counters gain `stealth bonus` right after `market share`.
    - `scoreOf` adds 1 point for each `stealth bonus` (§12.7).
  - **Disclosure asks as a Greenlight** (append to `describe('lines the rulebook asks the same of')`): `it('asks a Voluntary Disclosure’s Late Licenses as a Greenlight asks its Licenses, at the late license, and marks Secured Access as the Audit does (§6, ruling 11)')`.
    - `bare` of `actionNamed(DISCLOSE).conditions` after its first group equals `bare` of the Greenlight's two `Some player has …` groups, then its three License groups. In the last three, read the Greenlight's `JSON.stringify` with the game number's value `"license"` replaced by `"late license"`.    - `bare` of its choice refs equals the Greenlight's.
    - `bare` of its first three effects equals `bare` of the three marks in `Phase: audit`'s `onEnter`, and its sixth equals the end rule's `No card is in reach.`
  - **A Veto prompt names no Face-Down card** (`it('shows a rival’s Veto prompt for a Face-Down Launch with no name and no id (the slice’s R3)')`). Take the table of example 5 below, with p1's portfolio holding an Equity whose founder is p0.
    - p0 presses `LAUNCH` of the Search Engine.
    - p1's `seatExtras(…).waiting.cards` is `['a face-down card']`, its `JSON.stringify` holds no id and no `Search Engine`, and p0's names it.
    - After p1's `VETO`, the Search Engine is still face down in p0's development, and p0's `stealth bonus` is 0.
  - **Invariants (after every move):**
    - **The Stealth Bonus.** A seat's `stealth bonus` rises only in a `LAUNCH` (judged `own` or `ahead`) of a card that lay face down in `before`: by 5 for Tier 2, 10 for Tier 3 and 0 for Tier 1. Nothing else lowers or raises it.
    - **A `DISCLOSE`:**
      - it turns exactly its card face up and leaves no card `in reach`;
      - for each Tag the mover lacks Secured Access to in `before` (`securedFor` per Tag), it moves `the license` to one provider and 1 to the bank, and no other capital.
    - **Late license.** Once a round has started, `late license` is 6 under Patent Trolls and 4 otherwise.
  - **The auto-player** (free moves). Once a turn, when `t % 7 === 5`, it discloses the first face-down project of its development the press allows, answering payees as any choice. Launches are unchanged: a face-down project launches like any other.
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Change the rules text.**
  - **The counter and the number** (§2, §6, §20.D 3).
    - After `  Each player has 0 market share that everyone can see.` add `  Each player has 0 stealth bonus that everyone can see.`
    - After `  The game has a high bid of 0.` add `  The game has a late license of 4.`
    - In `  When a round starts:`, right after `    If the event in play has the Patent Trolls, the license is 5.`, add:

```text
    The late license is 4.
    If the event in play has the Patent Trolls, the late license is 6.
```

  - **Voluntary Disclosure** (§6 Voluntary Disclosure, §17.B.3, rulings 11, 25). In `Phase: actions`, right after the `A player may greenlight face down a card in their backlog.` button and its lines, add the lines below. Its guards and License lines are the Greenlight's; the copy test pins them.

```text
  A player may disclose a card in their development.
    Only if it is face down.
    Only if one of:
      The card has no requires.
      Some player has a card in their operations whose tag is the card's requires.
    Only if one of:
      The card has no also requires.
      Some player has a card in their operations whose tag is the card's also requires.
    Only if one of:
      The card has no requires.
      They have a card in their operations whose tag is the card's requires.
      Another player tied to them by a card in their portfolio has a card in their operations whose tag is the card's requires.
      They have at least the late license in capital.
    Only if one of:
      The card has no also requires.
      They have a card in their operations whose tag is the card's also requires.
      Another player tied to them by a card in their portfolio has a card in their operations whose tag is the card's also requires.
      They have at least the late license in capital.
    Only if one of:
      The card has no requires.
      The card has no also requires.
      They have a card in their operations whose tag is the card's requires.
      They have a card in their operations whose tag is the card's also requires.
      Another player tied to them by a card in their portfolio has a card in their operations whose tag is the card's requires.
      Another player tied to them by a card in their portfolio has a card in their operations whose tag is the card's also requires.
      They have at least 2 times the late license in capital.
    Then:
      Every card in their operations is in reach.
      For each card in their portfolio, every card in its founder's operations is in reach.
      For each card in each portfolio whose founder is them, every card in its owner's operations is in reach.
      If it is requires missing, they pay 1.
      If it is also requires missing, they pay 1.
      No card is in reach.
      They pay the license to another player of their choice who has a card in their operations whose tag is the card's requires.
        Only if they have no card in their operations whose tag is the card's requires.
        Only if no other player tied to them by a card in their portfolio has a card in their operations whose tag is the card's requires.
      They pay the license to another player of their choice who has a card in their operations whose tag is the card's also requires.
        Only if they have no card in their operations whose tag is the card's also requires.
        Only if no other player tied to them by a card in their portfolio has a card in their operations whose tag is the card's also requires.
      Turn it face up.
```

  - **The Face-Down Launch** (§6 Launch, ruling 17). In `A player may launch a card from their development to their operations.`, right after its `    Then:`, add as its first two lines:

```text
      If it is face down and it is a Tier 2 card, they get 5 stealth bonus.
      If it is face down and it is a Tier 3 card, they get 10 stealth bonus.
```

  - **The score** (§12.7). Right after `  Each player scores 2 points for each market share.` add `  Each player scores 1 point for each stealth bonus.`
  - **Append these 7 examples.**

```text
Example: Voluntary Disclosure turns a Face-Down project Face-Up for free with Secured Access, the owner's own Tag or a Partner's either way, and costs no action (section 6, section 17, ruling 11)
  Given 3 players
  And the phase is actions
  And p0 has 0 capital
  And p0's operations has a Server Farm
  And p0's portfolio has an Equity whose founder is p1
  And p1's operations has a Tech Blog
  And p2's portfolio has an Equity whose founder is p0
  And p2's operations has a Smart Lock
  And p0's development has a Search Engine and a Planetary Wi-Fi
  And the Search Engine in p0's development is face down
  And the Planetary Wi-Fi in p0's development is face down
  When p0 discloses the Search Engine
  And p0 discloses the Planetary Wi-Fi
  Then the Search Engine in p0's development is face up
  And the Planetary Wi-Fi in p0's development is face up
  And p0 has 0 capital
  And p0 has 3 actions

Example: without Secured Access a Voluntary Disclosure pays a $4 Late License for the Tag, $3 to a provider of the owner's choice and $1 to the bank (section 6, ruling 11)
  Given 3 players
  And the phase is actions
  And p1's operations has a Tech Blog
  And p2's operations has a VPN Service
  And p0's development has a Search Engine
  And the Search Engine in p0's development is face down
  When p0 discloses the Search Engine
  Then it is rejected because "Pick who to pay the license to: p1 or p2."
  When p0 discloses the Search Engine, paying p2
  Then the Search Engine in p0's development is face up
  And p0 has 3 capital
  And p1 has 7 capital
  And p2 has 10 capital

Example: during Patent Trolls a Late License is $6 for each Tag, $5 to a provider and $1 to the bank, and the next round $4 again (section 20, section 6)
  Given 3 players
  And the event deck has the Trade Show and the Patent Trolls
  And p0 has 12 capital
  And p1's operations has a Server Farm
  And p1's ops team has the Engineer
  And p2's operations has a Smart Lock
  And p2's ops team has a Junior Hardware Eng
  And p0's development has a Planetary Wi-Fi
  And the Planetary Wi-Fi in p0's development is face down
  And it is p2's turn
  When p2 ends their actions
  Then the event in play has the Patent Trolls
  And the late license is 6
  When p0 discloses the Planetary Wi-Fi
  Then p0 has 0 capital
  And p1 has 12 capital
  And p2 has 12 capital
  When p0 ends their actions
  And p1 pays salaries
  And p1 ends their actions
  And p2 ends their actions
  Then the event in play has the Trade Show
  And the late license is 4

Example: Voluntary Disclosure is for the Action phase only, for a Face-Down project, and impossible when no player provides a Tag it needs (section 6, ruling 25)
  Given the phase is actions
  And p0's development has a Search Engine and a To-Do List
  And the To-Do List in p0's development has the Architect on it
  And the Search Engine in p0's development is face down
  When p0 discloses the To-Do List
  Then it is rejected because "it is face down"
  When p0 discloses the Search Engine
  Then it is rejected because "the card has no requires or some player has a card in their operations whose tag is the card's requires"
  Given the To-Do List in p0's development is face down
  And the phase is income
  When p0 discloses the To-Do List
  Then it is rejected because "You can't disclose a card in their development during income."

Example: a Face-Down project launches with no Tag check, turning Face-Up, and its owner takes a +5 Stealth Bonus for a Tier 2 card (section 6, ruling 17, ruling 25)
  Given the phase is actions
  And p0's development has a Search Engine
  And the Search Engine in p0's development has 12 blue cubes
  And the Search Engine in p0's development has the Architect on it
  And the Search Engine in p0's development is face down
  When p0 launches the Search Engine
  Then it is accepted
  And p0's operations has a Search Engine
  And the Search Engine in p0's operations is face up
  And p0 has 5 stealth bonus
  And p0 has 2 actions

Example: a Tier 3 project launched Face-Down earns a +10 Stealth Bonus, and a Tier 1 project none (section 6, ruling 17)
  Given the phase is actions
  And p0's development has a Quantum Computer and a To-Do List
  And the Quantum Computer in p0's development has 18 red cubes
  And the Quantum Computer in p0's development has the Engineer on it
  And the To-Do List in p0's development has 4 blue cubes
  And the Quantum Computer in p0's development is face down
  And the To-Do List in p0's development is face down
  When p0 launches the To-Do List
  Then p0 has 0 stealth bonus
  And the To-Do List in p0's operations is face up
  When p0 launches the Quantum Computer
  Then p0 has 10 stealth bonus

Example: Stealth Bonus markers score their face value at the end, kept whatever became of the product (section 12, ruling 17)
  Given the crash pile has the Market Crash
  And it is p1's turn
  And p0 has 15 stealth bonus
  When p1 ends their actions
  Then the game is over
  And p0 scores 16
  And p1 scores 1
```

  **How the numbers come** (§2, §6, §12, §20.C, §20.D 3, rulings 11, 17, 25):
  - **Voluntary Disclosure** (§6). It costs 0 AP and may be made only in your Phase C (ruling 25). It is free with Secured Access, else a $4 Late License per Tag ($3 to a Tag Owner of your choice + $1 to the bank). It can't be made when no player has a Tag the card needs.
    - Example 1: the Search Engine's Platform is p1's, and p0 holds p1's Equity. The Planetary Wi-Fi's Cloud is p0's own, and its IoT p2's, who holds p0's Equity. 0 capital, nothing paid.
    - Example 2: 7 − 4 = 3; p2 7 + 3 = 10.
    - Example 4: the Architect's unpaid $2 salary keeps the turn in `income`, where no Disclosure is offered.
  - **Patent Trolls** (§20.D 3): $5 + $1 to the bank for each Tag. The Planetary Wi-Fi lacks Cloud and IoT: 12 − 12 = 0; p1 and p2 7 + 5 = 12. Trade Show is revealed next, and the Late License is $4 again (§5 Phase A).
  - **The Face-Down Launch** (§6 Launch). The card turns Face-Up and its Tags are not checked: no one provides Platform or AI here. The Stealth Bonus is +5 for Tier 2 and +10 for Tier 3, and none for Tier 1, which §6 doesn't list (the spec's call). A Launch costs 1 action: 3 − 1 = 2.
  - **The score** (§12.7, ruling 17): the markers' face value. 7 capital is 1 point (§12.2): 1 + 15 = 16.
  - **Lines each example pins:**
    - 1: the button and `Turn it face up.`;
    - 2: `If it is requires missing, they pay 1.`;
    - 3: `If it is also requires missing, they pay 1.` and the two round-start lines;
    - 4: `Only if it is face down.` and the button's phase;
    - 5: the Tier 2 Launch line;
    - 6: the Tier 3 Launch line;
    - 7: the score line.
    - The copy test pins the guards, the marks, `No card is in reach.` and the License lines.
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`, then the removal probe.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx \
  src/pages/designer/playtest-fitted.test.tsx src/pages/designer/tableaux.test.ts README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator discloses a Face-Down project in Phase C, free with Secured Access or for a $4 Late License per Tag ($6 under Patent Trolls), and a Face-Down Launch earns a +5 or +10 Stealth Bonus that scores at the end

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 6: Long runs: every slice-9 path tallied, whole games replayed; the README and the checks

**Files:**
- Modify: `src/games/startup-simulator.test.ts`, `README.md`

**Interfaces:**
- Consumes: every constant, helper and policy above and in plans 4-2 to 8-2b; `faceDownCards`, `securedFor`, `tiedTo`, `askOf`, `windowJudge`, `turnOf`, `dealtIdOf`.
- **`happenings` gains these keys** (on judged moves, read through the runtime on `before` and `after`):
  - **Face-Down Greenlights** (`GREENLIGHT_FACE_DOWN`):
    - `a Face-Down Greenlight with Secured Access` and `a Face-Down Greenlight bluffing`, by `securedFor(before, …)`;
    - `a Face-Down Greenlight of a Tier 1 card`;
    - `a Face-Down Greenlight cut by Domain Expertise`, when the card has cut cubes in `after`.
  - **The window:**
    - `an Audit declared`, and `an Audit declared after a pass` when a `PASS_THE_AUDIT` came earlier in the same offer;
    - `an Audit offer passed by every rival`, for the move that leaves `declaration` with no `AUDIT` in that offer;
    - `a rival short of $3 passed over`, for a move that ran the offer rule while a rival held less than 3 capital;
    - `an Audit refused by the Audit Shield`, from the `refused` callback with that reason;
    - `an Audit won by a raise` and `an Audit won at the opening bid`, by whether the Whistleblower is the declarer at the reveal;
    - `a second Audit in one window`, for a reveal in a turn that already had one.
  - **The verdict:**
    - `a clean Audit`; `an Audit caught a Missing Dependency`;
    - `Ghost Progress`, for a reveal of a card that is `ghost progress` in `after`.
  - **The Fold:**
    - `a Fold`, `a Fold paid short` (the mover had less than 5);
    - `a forced Fold`, when `SETTLE` of the card was refused for a `Some player has …` group in `before`;
    - `a Fold that fired the Diva`, `a Fold that returned a Consultant`.
  - **Settle:** `a Settle`, `a Settle for two Tags`, `a Settle for Ghost Progress alone`, `a Settle under Patent Trolls`, `a bounty under Whistleblower Protection Act`, and `a Settle refused for want of cash`, from `refused`.
  - **Disclosure:** `a free Voluntary Disclosure`, `a Voluntary Disclosure with a Late License`, `a Late License under Patent Trolls`.
  - **Launches:** `a Face-Down Launch of a Tier 2 card`, `… of a Tier 3 card`, `… of a Tier 1 card`, and `a Face-Down Launch vetoed`, for a `VETO` of a waiting `LAUNCH` whose card lay face down.
- **At each run's result** the long-run `it.each` also sums `stealth bonus at the score`, every seat's counter, as it sums `marketShare`.

- [ ] **Step 1: Write the tests.**
  - **`'made every move in those runs …'`** also expects `GREENLIGHT_FACE_DOWN`, `AUDIT`, `PASS_THE_AUDIT`, `RAISE`, `PASS_THE_BID`, `FOLD`, `SETTLE` and `DISCLOSE` above 0.
  - **Append `it('played slice 9’s Stealth and Audits in those runs: …')`**, its title naming the paths the keys name. It expects every key above above 0, except `Ghost Progress`, and the stealth sum above 0.
    - `Ghost Progress` must be exactly 0. The comment says why: R2, the engine never generates on a Stalled project. Examples pin the check and its Settle. It is on the owner's list.
  - **Append `it('takes back the last move and rebuilds whole games from their logs, through Face-Down Greenlights, Audits, Folds, Settles and Disclosures (Review Focus: 4 players, seeds 1 to 5)')`.**
    - Play each game to its result, keeping the state before each move.
    - A fresh engine given `loadLog(log)` equals the final state, and `engine.undo()` gives the state before the last move.
    - Across the five logs, some log holds a `GREENLIGHT_FACE_DOWN`, an `AUDIT`, a `RAISE`, a `FOLD`, a `SETTLE` and a `DISCLOSE`.
    - For the first `GREENLIGHT_FACE_DOWN`, `engine.undo()` to the state before it gives back the old ids: no card of it carries a `RENAMED_KEY` id made by that press.
  - **The view check (Review Focus 5),** in the runs through the view:
    - for each move that opens `bidding`, every rival's `waiting` has `cards: ['a face-down card']` and no id, and the owner's names the card;
    - for each `AUDIT` the view offered, its card's entry was named `a face-down card`.
  - **Kept as they are:** `'plays the same game through the page’s view as without it'`, now through offers and bids answered by other seats, and every earlier tally.
- [ ] **Step 2: Run** `bunx vitest run src/games/startup-simulator.test.ts`.
  - If a required key stays at 0, print the tally and change the auto-player, never the rules (P14). Ways to reach each:
    - **the Audit Shield:** in `declaration`, the invited seat first tries `AUDIT` with a card the view refuses for `no card on it is shielding`, at no cost, as the Diva's reassign is tried; and `promoting()` prefers lead material on a face-down project;
    - **a Settle for two Tags, a Face-Down Launch of a Tier 3 card:** the Greenlight free move tries `GREENLIGHT_FACE_DOWN` first for a Tier 3 card whenever the press allows it;
    - **Patent Trolls and Whistleblower Protection Act:** Task 4's settle rule already prefers them; under Patent Trolls the disclosure cadence also fires;
    - **a forced Fold:** a Tag leaves play only by a Fire Sale (8-2a). The seller's policy offers its only provider of a Tag when `t % 11 === 7`, and seats decline to buy it then;
    - **a Fold that fired the Diva or returned a Consultant:** face-down Greenlights when the Diva is on the bench, and the Consultant placement policy puts tokens on a face-down project first;
    - **a Face-Down Launch vetoed:** none needed beyond 7-2b's cadence; report if it stays at 0.
  - Report a key that stays unreachable, with the tally, and pin its path with an arranged auto-player test in the shape of 6-2b Task 5's.
- [ ] **Step 3: Write the README.**
  - **The Startup paragraph** becomes "**Startup Simulator (slice 9)**". After plan 8-2b's sentence, add:
    - projects may be Greenlit Face-Down for no License whenever some player provides their Tags, and rivals see only their staff;
    - in the owner's Engine phase, rivals with $3 may Audit one unless a working CTO shields it, bidding once around;
    - a project caught bluffing a Tag (or making cubes with no Lead) must Fold or Settle;
    - an owner may disclose a Face-Down project in Phase C, paying Late Licenses;
    - a Face-Down Launch earns a +5 or +10 Stealth Bonus.
    - Its rulings list adds 4, 17 and 21 where missing.
  - **"It still leaves out"** becomes: Bankruptcy and the Broken Chain, with Come Clean, Legacy Status and Settle's cover by Fire Sale value (slice 10).
  - **Plan 9-1's README paragraph** gains a Startup bullet naming these lines:
    - `Each player has a development row that everyone can see, where cards may lie face down.`;
    - `No other player can tell it from the cards in their backlog.`;
    - `Each other player has the bidding, in turn from their left.` with `Only if they are not under audit.`;
    - `They pay up to 4 to the whistleblower.`;
    - `The whistleblower pays the high bid to its owner.`.
- [ ] **Step 4: Run** `bun run test` and `bun run typecheck`. The passing count is the starting count plus this plan's new tests.
- [ ] **Step 5: Run the checks.** The first three print nothing. The fourth prints only the Startup count line in `designer-page.test.tsx` and the pins the tasks reported.

```bash
# no shared code and no page code changed
git diff --stat "$BASE" -- src/engine src/utils
git diff --stat "$BASE" -- src/pages ':!src/pages/designer/*.test.tsx' ':!src/pages/designer/*.test.ts'
# protected files
git diff --stat "$BASE" -- src/engine/core/game-state.ts src/engine/core/flow.ts src/engine/core/game-engine.ts src/pages/hearts-demo
# the page tests' changed lines
git diff "$BASE" -- src/pages/designer | grep -E '^[-+][^-+]'
```

  Also:
  - read every number in the new examples against each task's "How the numbers come";
  - check that no example arranges more than 3 Equity tokens naming one player;
  - run the removal probe once more over every line this plan added or changed.
- [ ] **Step 6: Run the games alone.** `bunx vitest run src/games/hearts.test.ts src/games/color-match.test.ts src/games/venom.test.ts src/games/rent-day.test.ts src/pages/hearts-demo` passes, and Rent Day still has 108 examples.
- [ ] **Step 7: Commit**

```bash
git add src/games/startup-simulator.test.ts README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's long runs greenlight Face-Down, audit, bid, Fold, Settle, disclose and launch for the Stealth Bonus at 2 to 5 players, every path tallied but Ghost Progress, which never fires, and whole games rebuilt from their logs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

## Forward notes

- **Plan 9-3 (the page):**
  - a Face-Down project as a card back with its staff hung under it, `a face-down card` on rivals' Board lines, and the owner's own canvas marking it from `SeatExtras.faceDown`;
  - the Face-Down Greenlight's renamed backlog: new ids on the owner's canvas, so decide how they appear rather than animate from the old;
  - the offer (`declaration`) and the bid (`bidding`) in the deciding seat's strip, from 7-3's waiting line; the audited card shown by its place, never its name;
  - `caught`, Fold and Settle on the owner's strip, with the Settlement shown before pressing;
  - the `stealth bonus` counter drawn as +5 / +10 markers on the tableau;
  - `in reach` is a working mark that lasts only through an Audit step: don't label it.
- **Slice 10:**
  - Fold and Settle are built for the active player with a Whistleblower. Slice 10 generalises them to any owner with no Whistleblower: `They pay up to 5.` for the whole fine, and no bounty line.
  - Settle's cover becomes cash plus the Fire Sale value of the owner's products; `settlement` is already the number to compare.
  - A Come Clean checks Missing Dependency only: `requires missing` and `also requires missing` after marking Secured Access, the sold Tag excused.
  - The Audit holds an interrupt (`declaration`) and an ask (`bidding`) at once; slice 10's stack of interrupts must keep both working.

## Gaps against plan 9-1

1. **Two reads of where a target lies are not `faceBlind`.**
   - `the target card's owner is its {cardplayer}` (7-1) and `it is (not) on the target card` (4-1) read only whose zone the target is in and what sits on it, never its face.
   - 9-1 Task 4 marks neither `faceBlind`. Once the development row carries the mark, its check would refuse them in 7-2a's two placing buttons and 7-2b's `take … to a card in another player's development or another player's operations`. That would stop Consultants going onto Face-Down projects, which §17.B.4 allows.
   - Plan 9-1 should mark both `faceBlind`; Task 1 stops and reports if it hasn't.
2. **No line reads a Partner tie about a card.** 7-1's tie is `another player tied to them …`, about a player, so no worked flag can say whether a project's owner has Secured Access, and the verdict runs in the declarer's press.
   - So the owner marks Secured Access at the step's start (`in reach`), and the project counts marked providers (`sources`, `second sources`) with 5-1's count. The marks are cleared after.
   - It needs no new phrase. Voluntary Disclosure marks and clears in its own press.
3. **No value line reads a number of the game.** The Settlement's Tag fee is written as a card value `tag fee` (3, or 5 under Patent Trolls) beside `the license`, which 6-2b sets each Round Start. An invariant keeps them equal once a round has started.
   - An example that arranges Patent Trolls must reach it through a Round Start, as Task 4's does.
   - The Late License likewise is a second game number, `late license`, since no guard reads "the license plus 1".
4. **No lines can be shared between buttons.** The Greenlight's cut and Tag guards, the Pivot's lines and the License lines are copied into the Face-Down Greenlight, the Fold, Settle and Disclosure. Each copy is pinned by a test comparing it with its source, compiled and without line numbers.
5. **Ghost Progress never fires (R2).** It is written, pinned by arranged examples, asserted never to hold in the long runs, and tallied as 0. On the owner's list.
6. **Recorded limits, none blocking:**
   - the bid's waiting line says only `a face-down card` when the owner has two (9-1's recorded limit; 9-3 may show the place);
   - the Stealth Bonus is one counter of points, not separate markers (9-3 draws markers);
   - Settle's cover by Fire Sale value waits for slice 10 (the spec's call).
