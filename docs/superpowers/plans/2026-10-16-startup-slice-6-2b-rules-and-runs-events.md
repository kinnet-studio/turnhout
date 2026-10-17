# Startup Simulator Slice 6-2b (Rules text and long runs: Events) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Startup Simulator plays slice 6's Events: all 18 in a deck shuffled at Setup, one revealed at each Round Start before the Start Player's turn and in effect for everyone until the next, the discard reshuffled when the deck runs out and none revealed after the last round; the fourteen whose systems exist act (revenue, decay, output and bandwidth, hiring, Training, TechCrunch and License prices, Crunch Time, and Angel Investors' and Regulation Audit's one-off effects taken in turn from the Start Player), and the four whose systems come later are revealed and do nothing yet. The long runs play all of it at 2 to 5 players.

**Architecture:**
- **This is plan 6-2b, the second half of slice 6's rules plan** (it grew past eight tasks, so it is two plans). Plan 6-2a (`docs/superpowers/plans/2026-10-16-startup-slice-6-2a-rules-and-runs-attributes-and-utility.md`, Attributes and Utility cards) is built first; plan 6-3 (the page) comes after. This plan writes only the rules text, its examples and the long runs. It adds no phrase and changes no shared code.
- **Six tasks:**
  1. the Event deck: one revealed at each Round Start, reshuffled when empty, none after the last round;
  2. round-long modifiers: Tech Bubble, Legacy Code, Open Source Boom, Hardware Hackathon, Server Crash, Supply Chain Logjam;
  3. prices: Patent Trolls, Chip Shortage, Intern Season, Online Course Boom, Trade Show;
  4. Crunch Time;
  5. the reveal step: Angel Investors and Regulation Audit;
  6. long runs: every Event tallied, whole games replayed; the README and the checks.
- **Phases.** Task 5 adds `event check`, a phase of steps each player takes in turn from the Start Player at a Round Start (plan 6-1's Task 4), written last, after `Phase: final check`. Phase order after this plan: `modes`, `ops check`, `income`, `actions`, `research`, `sourcing`, `graduation`, `brainstorm`, `engine`, `commit`, `bench cleanup`, `strategy cleanup`, `backlog cleanup`, `final check`, `event check`.
- **Builder calls this plan makes** (recorded for the owner):
  - **The reveal is two round-start lines** (6-1's Task 5 pattern): the Event in play moves to the discard, then one card is dealt from the deck, the discard shuffled in when the deck is empty. The Event just ended is therefore in that reshuffle (suwa's `reveal_event` also discards before it draws). A round start never runs after the last round (slice 1a's R1.3), so the Crash round ends with its Event still in play, and the game-end Ops check sees it (§12.2).
  - **Round-long effects are lines a flag turns on**, each flag reading `the event in play has the …` (the overview's "conditions on the Event in play"). They can't outlast the round: the next reveal changes what the flags read. Prices that are numbers of the game (the License, the University's two prices) are set again by every round's start lines, then changed by the Event (6-1's call).
  - **The Events' output lines go before the mode lines and after Workaholic's**, so they reach only the colour a unit works in, and Burnout stays last (R3). Supply Chain Logjam needs no floor: every unit working in Red makes at least 1 before it (§20.B). Server Crash acts on Blue bandwidth, where a unit in another mode has 0, so `A card's blue bandwidth is at least 0.` follows it (spec call: no unit below 0). Toxic Personality's cube comes after all of them (R1), since it reads the team values the outputs make.
  - **Chip Shortage reaches every source** (§20.D): the University through the `hardware junior price`, the agency row and a scouting hire through a worked `cost`, the open job market through a worked `rehire price` that is $1 for any card. Flex staff have the skill `flex`, so they are untouched.
  - **Crunch Time's cube is the project's, added after Toxic Personality's cube is taken** (R1 takes the cube from the team's output; §20.D: "staffed or not"), so Toxic never takes it. "Blue if it still needs Blue" counts the cubes on the track and those this turn's team makes (suwa's `apply_crunch_time_bonus`): `blue reached` is `blue made` plus `blue cubes`. Its Bug comes right after the new cubes and before the Pending lines and Development QA, so QA can clean it the same turn (spec call), and the Junior who does learns Green (ruling 1).
  - **Angel Investors and Regulation Audit share one step phase, `event check`**, called by one round-start line that reads a flag `acting once` on the Event in play (6-1: one set of steps per round, as the last round-start line; `If` can't say "or"). Each step's start line pays Angel Investors' $3; a rule pays Regulation Audit's tax as soon as the player can pay it and passes the step on; until then the player lets go of taxed staff, choosing whom (spec call). A player who can pay can't let staff go instead: §20.D lets only "a player who can't pay" do so. Letting go fires the staff member, so its tokens and Attributes go as at Income (R2).
  - **"At least one Tier 1 product and no Tier 2/3"** is "some product, and none of Tier 2 or 3" (`angel funded`, `past tier 1`), since every card in a development or an operations is a product of Tier 1, 2 or 3.
- **Names.**
  - Zones: `event deck` (pile, secret), `event in play` (row, public), `event discard` (pile, public).
  - Game numbers: `junior price`, `hardware junior price`.
  - Worked flags: `bubbly`, `legacy`, `open source boosted`, `hackathon boosted`, `server crashed`, `logjammed`, `chip short`, `course priced`, `show priced`, `blue covered`, `crunching blue`, `crunching red`, `crunched`, `acting once`, `angel funded`, `past tier 1`, `taxed`.
  - Worked numbers: new `rehire price`, `blue reached`, `blue added`, `red added`, `payroll tax`; refined `cost`, `price`, `rev`, `bug decay`, `blue output`, `red output`, `blue bandwidth`.

**Tech Stack:** TypeScript (strict), Bun, Vitest + happy-dom.

**Spec:** `docs/superpowers/specs/2026-10-16-startup-slice-6-attributes-utility-events-design.md` is binding; its "Builder-check rulings" R1–R3 win over its body. It sits under `docs/superpowers/specs/2026-10-16-startup-simulator-overview-design.md`, also binding, with its rule "every number comes from the rulebook, and examples say where" and its anti-goals. The other inputs:
- plan 6-2a, whose Global Constraints, names and test helpers this plan builds on;
- plan 6-1 (`docs/superpowers/plans/2026-10-16-startup-slice-6-1-language.md`), whose Interfaces blocks are the phrases this plan writes with, and whose "Left to 6-2" list is this plan's floor (with 6-2a);
- plans 4-2, 5-2a and 5-2b, whose rules text this plan edits;
- `builder-check-startup-6.md` in the session scratchpad;
- `suwa/rulebook.md` v6.0 §4.1, §5 Phase A and B, §6 Greenlight, §12, §13, §15.D, §20.A, §20.D, Rulings #1, #8, #13, #25;
- where those are silent, suwa's `event_effects.rs`, `phases/income.rs` (`reveal_event`, `apply_angel_investors`, `apply_regulation_audit`), `phases/engine.rs` (`apply_crunch_time_bonus`) and `ops_bandwidth.rs`.

## Global Constraints

- **Branch and commits.** Develop on `claude/peaceful-curie-rdfkow`. Commit by pathspec, never `git add -A`. Every commit message ends with these two lines and contains no model identifiers:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC`
- **Protected files never change:** `src/engine/core/game-state.ts`, `src/engine/core/flow.ts`, `src/engine/core/game-engine.ts`, `src/pages/hearts-demo/**`.
- **The core stays pure:** no pixi/react/DOM in `src/engine/core/**`, no `Math.random` or `Date.now`.
- **State is Json-only, under `lang:*` keys.** This plan adds no key: plan 6-1's `lang:round-steps` is the only one the round's steps use.
- **No Startup Simulator words in shared code.** The banned list is plan 6-1's (its Global Constraints), slice 6's words included: workaholic, clean coder, visionary, toxic, burnout, flight risk, techcrunch, design sprint, cease, desist, hype, utility, buff, debuff, venture capital, bubble, patent, troll, angel, investor, legacy, regulation, audit, open source, hackathon, chip shortage, crunch, server crash, logjam, frenzy, intern, headhunter, course boom, whistleblower, trade show, event; and "Attribute" in the game's sense. This plan touches no shared code.
- **The other games.** Hearts, Color Match, Venom and Rent Day stay unchanged. Rent Day keeps its 108 examples.
- **Files this plan changes:** `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md`, and test-file pins under `src/pages/designer/**` that read the rules text (the Startup example count in `designer-page.test.tsx`; any pinned zone list, Board text or bank line in `tableaux.test.ts` and `playtest-fitted.test.tsx` that the three Event zones, the two game numbers or the `event check` buttons change), each pinned as the view now says it and reported. No page source changes, and nothing under `src/engine/**`.
- **Every number comes from the rulebook, and examples say where:** a section or ruling in each title, and each task's "How the numbers come".
- **Anti-goals (spec and overview):** Startup words in shared code; an Event's effect leaking past the next Round Start; a rule approximated without a recorded call; a game that can't end; an auto-player that hides a rule that never fires.
- **Every rules line is pinned.** Each line this plan adds or changes, other than `Hint:` lines, table rows and `The game has …` declarations, fails some example when it alone is removed, or is named in its task as pinned by a test instead. Each task's Step 4 runs plan 5-2a's removal probe. Never leave a rulebook line out because no example fails without it: show it is redundant, or reach it with an example.
- **Example counts.** N₇ is the count the committed test pins when Task 1 starts: plan 6-2a's N₆ + 31, plus whatever fix waves add. The tasks end at N₇ + 4, + 9, + 14, + 17 and + 19. Each task updates `results` in `startup-simulator.test.ts`, the Startup test in `designer-page.test.tsx` and the README's "Its N examples".
- **The seeded games change.** `Shuffle the event deck.` (Task 1) draws from the state's random numbers at Setup, and the reshuffle draws again in play, so every seeded game plays differently from Task 1 on. Pins that read a seeded game by position rather than by rule are read again from the new games, and the change reported; a long-run tally that drops to 0 is handled as below.
- **Earlier examples meet Events.** An example that arranges no Event starts with none in play and its Event deck in table order, the last row on top (`topCard` is the last card in slot order): each Round Start it crosses reveals Trade Show, then Whistleblower Protection Act, then Online Course Boom. They must pass unchanged. If one fails once a later task turns an Event on, add `  And the event deck has the Whistleblower Protection Act` after its first Given (an Event that does nothing, reshuffled onto itself) and report it.
- **Commands.**
  - Single file: `bunx vitest run src/games/startup-simulator.test.ts`. Full suite: `bun run test`. Types: `bun run typecheck`.
  - Before Task 1: record `BASE=$(git rev-parse HEAD)`; run `bun run test` once for the passing count and the long runs' time; note N₇.
- **Existing tests.** Only the lines each task names change. If any other existing test fails, stop and report it.
- **Long runs.** If an invariant shows a wrong rule, fix the rules text. If a required tally stays at 0, change the auto-player (cadences, targets), never the rules; report a key that stays unreachable. If a rule can't be written with plans 4-1, 5-1 and 6-1's phrases, report it. If the long runs take more than a third longer than at BASE, report the timing.
- **Pre-flight notes carried from plans 4-2 and 5-2:** take every `shownFlags` / `standIns` / `shownPlayerValues` pin from HEAD and apply only the change named; never write `For each card … that is X`; read counts as numbers with missing as 0, never with `hasOwn`.
- **Style.**
  - 2-space indent, single quotes, comments that say why.
  - Commit prefix `feat(games):` (`docs:` for a README-only commit).
  - TDD every task: change the test first, watch it fail, then the rules, pass, `bun run typecheck`, commit.
  - Every rules line below is exact copy. Insertion points name a line or section by its text, never by a line number. **Re-read the committed rules file before each task:** plans 4-2, 5-2a, 5-2b and 6-2a's text is the base. If a named anchor line is missing or worded otherwise, stop and report it.

## Review Focus

- **A Round Start with an empty Event deck, with an empty discard as well, and at the end of the last round.**
  - Expected: the Event just ended goes to the discard before the draw, so a reshuffle may reveal it again; no reveal, no price reset and no step after the last round; exactly one Event in play after every Round Start.
  - Tests: Task 1, examples 2–4, and the long-run Event invariant.
- **The event check when every seat can pay at once, when the Start Player is short, and when a seat holds only exempt staff.**
  - Expected: the steps pass at once and the Start Player's turn starts in the same move, with no second round; a short seat waits for its let-gos, and a let-go of an exempt Junior is refused; the next turn's Income and salaries run as usual.
  - Tests: Task 5, examples 1–2, and the arranged auto-player test.
- **An Event's effect at the next Round Start.**
  - Expected: the License and both University prices go back to $3 and $2; no modifier of the old Event acts in the new round.
  - Tests: Task 2 example 1, Task 3 examples 1 and 3, and the long-run price invariant.
- **An Event's output line on a unit that makes nothing in that colour.**
  - Expected: Open Source Boom gives nothing to a Red-mode flex Senior, an onboarding unit or a burned-out one; Server Crash leaves a Red-mode unit's Blue bandwidth at 0; Logjam leaves a Junior at 0.
  - Tests: Task 2, examples 3–5, and 6-2a's long-run "no output below 0" invariant.
- **Undo and replay across a reveal, a reshuffle and an event check that waited.**
  - Expected: the log alone rebuilds the finished game (the reshuffle uses the state's random numbers), and undo of the last move gives the state before it.
  - Test: Task 6.

## Assumed from earlier plans (check before Task 1)

Re-read each item at HEAD by name. If one is missing or differs, stop and report it.

- **Plan 6-2a, built:** the counts and the `attributes in play`; the worked sections `Overworked:`, `Clean coding:`, `Pool losing qa:`, `Pitched:`, `Price:` (`  A pitched card's price is 2.`), `Blue made:`, `Red made:`, `QA made:`; `Blue output:` with `  An overworked card's blue output goes up by 2.` and `Red output:` with `  An overworked card's red output goes up by 2.`; the Engine's `its new blue cubes go up by its blue made.` and `its new red cubes go up by its red made.`; in the test file `PLAY_DEBUFF`, `PLAY_TO_PRODUCT`, `PLAY_ALONE`, `ATTRIBUTES`, `isPlayable`, `techCrunchPrice`, `MADE`, `POOL`, `debuffing()`, `utility()`, the slice-6 Strategy tallies.
- **Plan 6-1, built (its Interfaces):** `Each player has the {phase}, in turn from the start player.` under `When a round starts:` (with `If …,` around it), `ROUND_STEPS_KEY` (`lang:round-steps`), `roundStepsOf`, `The {phase} passes to the left.` in a step phase; `the {gamenumber} goes up by {int}`; the flagged value lines and `a card's {attribute} is {int}`; `{sharedzone} has {card}` read by a flag.
- **Plan 5-2b, built:** the milestones table and `  The milestone row is a row in the center that everyone can see.`; Setup's `  Shuffle the strategy deck.`; the Training button's price lines; `Phase: final check` as the last phase.
- **Plan 5-2a, built:** `Bug decay:` (`  A decaying card's bug decay is its bugs.`); the four let-go and dismiss buttons' `It is fired.`; the Pending lines of the Engine.
- **Plan 4-2, built:** `Rev:` starting `  A card's rev goes up by the total rev bonus of the cards on it.`; `Blue bandwidth:` (`  A card's blue bandwidth is its blue output.`); `Phase: engine`'s start lines; Income's let-go buttons.
- **Plans 1a–3:** `  The game has a license of 3.`; the three recruit buttons with `    Only if they have at least 2 capital.` and `      They pay 2.`; `A player may hire a card from the open job market to their bench.` with `    Only if they have at least 1 capital.` and `      They pay 1.`; `In every phase:` starting `  When a player's turn starts:`; the example "you can't pay, so you can't act (section 6)".
- **Plans 4-1 and 5-1:** `deal up to {int} card(s) from {zone} to {zone}, shuffling {zone} into it when it runs out`; `move {zone} to {zone}`; `the {gamenumber} is {int}`; `they have at least the {gamenumber} in {counter}`; `they pay the {gamenumber}`; `If <condition> and <condition>, <effect>`; `some card in {zones} is {cardflag}`; `each {cardflag} card in {zone} gains {int} {attribute}`; `they have at least the total {attribute} of {cardgroup} in {counter}`; `they pay the total {attribute} of {cardgroup}`; the expect `the {gamenumber} is {int}`.
- **The test file:** `ROUND_KEY`, `startPlayerOf`, `gameNumber`, `keepsTheRules`' money check (`paid`, `earned`, `enteredIncome`), `RECRUITS`, `AGENCY_HIRES`, `HIRE_MARKET`, `SOURCE_HIRES`, `LET_GO`, `PHASES`, the setup and table tests.

---

### Task 1: The Event deck: one revealed at each Round Start, reshuffled when empty, none after the last round

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count); `tableaux.test.ts` and `playtest-fitted.test.tsx` only if they pin the shared zones

**Interfaces:**
- Consumes: 5-1's reshuffling deal; 4-1's `move {zone} to {zone}`.
- Produces (rules): the Event table; the zones `event deck`, `event in play`, `event discard`; Setup's shuffle; `When a round starts:` with the reveal.
- Produces (test file):

```ts
/** The 18 Events of §20.D, in its order. */
const EVENTS = [
  'Venture Capital Rain', 'Tech Bubble', 'Patent Trolls', 'Angel Investors', 'Legacy Code', 'Regulation Audit', 'Open Source Boom',
  'Hardware Hackathon', 'Chip Shortage', 'Crunch Time', 'Server Crash', 'Supply Chain Logjam', 'Recruiter Frenzy', 'Intern Season',
  'Headhunter Holiday', 'Online Course Boom', 'Whistleblower Protection Act', 'Trade Show',
] as const;
/** The name of the Event in play, or null before the first Round Start (§5 Phase A). */
const eventOf = (state: GameState): string | null;
```

- [ ] **Step 1: Change the tests.**
  - **Pins.**
    - `results` is N₇ + 4; the designer page's count too.
    - `'has 123 cards …'` becomes `'has 141 cards: 22 talent, 30 seed products, 34 growth products with the Market Crash, 30 Strategy cards, 6 Milestones and 18 Events'`, adding `expect(inZone(cards, 'event-deck')).toHaveLength(18)`.
    - The Juniors are made after the 141 dealt cards, c141 to c149 at 3 players, and `NEXT_CARD_KEY` is 150.
    - `'lays out the table …'`: after `['milestone-row', false, 'row', 'public']` add `['event-deck', false, 'pile', 'secret']`, `['event-in-play', false, 'row', 'public']` and `['event-discard', false, 'pile', 'public']`.
    - The setup test (`sets up a table of %i players at every seed`) also expects 1 card in the event in play, 17 in the event deck and the event discard empty: Setup ends by starting the first round.
  - **Append `it('has the Event deck of §20.D: 18 cards, one of each')`:** `nameCounts` of the event deck in `fresh()` is each of `EVENTS` once.
  - **Invariants (Review Focus 1, the spec's Proof 2)**, after every move:
    - the 18 Events are conserved: by name, the event deck, the event in play and the event discard together hold each of `EVENTS` once;
    - the event in play holds exactly one card once a round has started (`ROUND_KEY` at 1 or more);
    - the event in play changes only in a move in which `ROUND_KEY` rose, and then the Event in play before is in the event discard or, after a reshuffle, the event deck or in play again;
    - the event deck gains cards only in such a move, and only when it was empty in `before`.
  - **The game's end** (in the long-run game test): the Event in play at the result is the one revealed at the last Round Start (no reveal after the last round).
- [ ] **Step 2: Run** `bunx vitest run src/games/startup-simulator.test.ts`. Expected: FAIL.
- [ ] **Step 3: Change the rules text.**
  - Before anything else, a throwaway probe (never committed) confirms the deck's top in an example that arranges no Event is the table's last row (see the Global Constraints). Report it if not.
  - **Cards** (§20.D). Right after the milestones table add:

```text
  A deck called events, starting in the event deck:
    | name                         | copies |
    | Venture Capital Rain         | 1      |
    | Tech Bubble                  | 1      |
    | Patent Trolls                | 1      |
    | Angel Investors              | 1      |
    | Legacy Code                  | 1      |
    | Regulation Audit             | 1      |
    | Open Source Boom             | 1      |
    | Hardware Hackathon           | 1      |
    | Chip Shortage                | 1      |
    | Crunch Time                  | 1      |
    | Server Crash                 | 1      |
    | Supply Chain Logjam          | 1      |
    | Recruiter Frenzy             | 1      |
    | Intern Season                | 1      |
    | Headhunter Holiday           | 1      |
    | Online Course Boom           | 1      |
    | Whistleblower Protection Act | 1      |
    | Trade Show                   | 1      |
```

  - **Table** (§15.D). After `  The milestone row is a row in the center that everyone can see.` add:

```text
  The event deck is a pile in the center that no one can see.
  The event in play is a row in the center that everyone can see.
  The event discard is a pile in the center that everyone can see.
```

  - **Setup** (§4.1). After `  Shuffle the strategy deck.` add `  Shuffle the event deck.`
  - **The reveal** (§5 Phase A, §15.D, ruling 13). At the start of `In every phase:`, right before `  When a player's turn starts:`, add:

```text
  When a round starts:
    Move the event in play to the event discard.
    Deal up to 1 card from the event deck to the event in play, shuffling the event discard into it when it runs out.
```

  - **Append these 4 examples.**

```text
Example: Setup shuffles the 18 Events, and the first round reveals one before the Start Player's turn (section 4, section 5, ruling 13)
  Given the game is set up
  Then the event in play has 1 card
  And the event deck has 17 cards
  And the event discard is empty

Example: each Round Start discards the Event in play and reveals the next before the Start Player's turn; an Event whose system comes later does nothing yet (section 5, section 15, ruling 13, the spec's call)
  Given the event in play has the Venture Capital Rain
  And the event deck has the Headhunter Holiday and the Recruiter Frenzy
  And it is p1's turn
  When p1 ends their actions
  Then it is p0's turn
  And the event in play has the Recruiter Frenzy
  And the event discard has the Venture Capital Rain
  And the event deck has the Headhunter Holiday
  And p0 has 7 capital

Example: an empty Event deck shuffles its discard, the Event just ended included, to form a new deck at the Round Start (section 15, section 20)
  Given the event in play has the Whistleblower Protection Act
  And the event deck is empty
  And it is p1's turn
  When p1 ends their actions
  Then the event in play has the Whistleblower Protection Act
  And the event deck is empty
  And the event discard is empty

Example: no Event is revealed after the last round: the Crash round ends the game with its Event still in play (section 12, section 5)
  Given the crash pile has the Market Crash
  And the event in play has the Venture Capital Rain
  And the event deck has the Headhunter Holiday
  And it is p1's turn
  When p1 ends their actions
  Then the game is over
  And the event in play has the Venture Capital Rain
  And the event deck has the Headhunter Holiday
```

  **How the numbers come** (§4.1, §5 Phase A, §12, §15.D, §20.D):
  - **The deck:** 18 Events, one of each (§20.D); shuffled at Setup (§4.1); the Start Player reveals one at each Round Start, in effect until the next (§5 Phase A); the revealed one is replaced and discarded at the next Round Start, and an empty deck at a Round Start is made from the shuffled discard (§15.D).
  - **A Given lists a pile bottom first,** so the last Event named is revealed first.
  - **The Crash** finishes the round, then the game-end Ops check and the score (§12); no Round Start comes between.
  - **Lines each example pins:** 1 Setup's shuffle and the deal; 2 the move to the discard and the deal; 3 the reshuffle (the deal's last words) and the move's place before the deal. 4 is a guard (§12; slice 1a's R1.3).
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`, then the removal probe (plan 5-2a's: a throwaway script compiles the rules once without each line this task added or changed, alone, and runs the examples; every removal must fail an example or give a diagnostic).
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator shuffles the 18 Events at Setup and reveals one at each Round Start before the Start Player's turn, reshuffling the discard when the deck runs out and revealing none after the last round

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 2: Round-long modifiers: Tech Bubble, Legacy Code, Open Source Boom, Hardware Hackathon, Server Crash, Supply Chain Logjam

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count)

**Interfaces:**
- Consumes: Task 1's Event in play; 6-1's flagged `goes up by {int}`, `goes down by {int}` and `goes up by its {attribute}`; 4-1's `a card's {attribute} is at least {int}`.
- Produces (rules): worked flags `bubbly`, `legacy`, `open source boosted`, `hackathon boosted`, `server crashed`, `logjammed`; refined `rev`, `bug decay`, `blue output`, `red output`, `blue bandwidth`.

- [ ] **Step 1: Change the tests.**
  - **Pins.** `results` is N₇ + 9; the designer page's count too. The values test adds the six flags. `shownFlags(game)` and `standIns(game)` are unchanged: each flag reads the Event in play, so it fails closed. Pin what the view says if it differs, and report it.
  - **Invariants** (Review Focus 4), after every move: every card on a Board has worked `blue output`, `red output`, `qa output` and `blue bandwidth` of 0 or more, or none; a card's `blue output` or `red output` differs from what it was in `before` only in a move that changed the Event in play, its counts, its mode flags, its onboarding or its zone (a modifier never acts outside its round).
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Change the rules text.**
  - **The flags.** Right after the `Pitched:` section add:

```text
Bubbly:
  Only if the event in play has the Tech Bubble.

Legacy:
  Only if the event in play has the Legacy Code.

Open source boosted:
  Only if the event in play has the Open Source Boom.

Hackathon boosted:
  Only if the event in play has the Hardware Hackathon.

Server crashed:
  Only if the event in play has the Server Crash.

Logjammed:
  Only if the event in play has the Supply Chain Logjam.
```

  - **Tech Bubble** (§20.D 2, §5 Phase B step 2: Events are among a product's bonuses, before Decay). In `Rev:`, right after `  A card's rev goes up by the total rev bonus of the cards on it.`, add `  A bubbly card's rev goes up by 1.`
  - **Legacy Code** (§20.D 5). In `Bug decay:`, right after `  A decaying card's bug decay is its bugs.`, add `  A legacy card's bug decay goes up by its bugs.`
  - **Open Source Boom** (§20.D 7). In `Blue output:`, right after `  An overworked card's blue output goes up by 2.`, add `  An open source boosted card's blue output goes up by 1.`
  - **Hardware Hackathon and Supply Chain Logjam** (§20.D 8, 12). In `Red output:`, right after `  An overworked card's red output goes up by 2.`, add:

```text
  A hackathon boosted card's red output goes up by 1.
  A logjammed card's red output goes down by 1.
```

  - **Server Crash** (§20.D 11). In `Blue bandwidth:`, right after `  A card's blue bandwidth is its blue output.`, add:

```text
  A server crashed card's blue bandwidth goes down by 1.
  A card's blue bandwidth is at least 0.
```

  - **Append these 5 examples.**

```text
Example: Tech Bubble adds $1 to each Active product's revenue at every Income of its round, and ends at the next Round Start (section 20, section 5, ruling 13)
  Given the event in play has the Tech Bubble
  And the event deck has the Whistleblower Protection Act
  And p0's operations has a To-Do List
  And p0's ops team has a Junior Software Dev
  And p1's operations has a Dating App and a Smart Lock
  And p1's ops team has a Junior Software Dev and a Junior Hardware Eng
  And it is p1's turn
  Then p1 has 12 capital
  When p1 ends their actions
  Then the event in play has the Whistleblower Protection Act
  And p0 has 8 capital

Example: Legacy Code makes each Bug cost $2 of revenue, still never below $0 (section 20, section 5)
  Given the event in play has the Legacy Code
  And p1's operations has a Payment Gateway and a Dating App
  And p1's ops team has a Junior Software Dev and a Junior Software Dev
  And the Payment Gateway in p1's operations has 1 bug
  And the Dating App in p1's operations has 1 bug
  And the turn passes to the left
  Then p1 has 8 capital
  And p1 has 1 market share

Example: Open Source Boom gives every staff member working in Blue 1 more, on a project and in the ops team, but a burned-out one still makes nothing, learns nothing and is no teammate for Synergy (section 20, the slice's R3)
  Given the event in play has the Open Source Boom
  And p1's development has a Dating App
  And p1's operations has a To-Do List and a Mobile Wallet
  And p1's ops team has a Junior Software Dev
  And the Dating App in p1's development has a Junior PM, a Junior Software Dev and a Firmware Specialist on it
  And the Junior Software Dev in p1's development team has 1 burnout
  And the turn passes to the left
  Then the phase is modes
  When p1 confirms their modes
  Then the phase is income
  And p1's blue supply is 2
  And p1 has 10 capital
  When p1 pays salaries
  And p1 ends their actions
  Then the Dating App in p1's development has 4 blue cubes
  And the Junior Software Dev in p1's development team has 0 pending blue

Example: Hardware Hackathon gives every staff member working in Red 1 more, and Supply Chain Logjam 1 less, on a project and in the ops team (section 20)
  Given the event in play has the Hardware Hackathon
  And the event deck has the Supply Chain Logjam
  And p1's development has a Smart Lock
  And p1's operations has a Smart Thermostat and a Smart Toy
  And p1's ops team has a Junior Hardware Eng
  And the Smart Lock in p1's development has a Junior Hardware Eng on it
  And the turn passes to the left
  Then p1's red supply is 2
  And p1 has 11 capital
  When p1 ends their actions
  Then the Smart Lock in p1's development has 2 red cubes
  When p0 ends their actions
  Then it is p1's turn
  And the event in play has the Supply Chain Logjam
  And the phase is ops check
  And p1's red supply is 0
  When p1 switches off the Smart Thermostat
  And p1 switches off the Smart Toy
  And p1 confirms the products online
  And p1 ends their actions
  Then the Smart Lock in p1's development has 2 red cubes
  And p1 has 11 capital

Example: Server Crash takes 1 off the Blue bandwidth of each ops staff member, never below 0, and leaves development alone (section 20, the spec's call)
  Given the event in play has the Server Crash
  And p1's development has a Dating App
  And p1's operations has a Smart Lock and a To-Do List
  And p1's ops team has a Junior Software Dev, a Firmware Specialist and a Junior Hardware Eng
  And the Firmware Specialist in p1's ops team is red mode
  And the Dating App in p1's development has a Junior Software Dev on it
  And the turn passes to the left
  Then the phase is modes
  When p1 confirms their modes
  Then the phase is ops check
  And p1's blue supply is 0
  And p1's red supply is 3
  When p1 switches off the To-Do List
  And p1 confirms the products online
  And p1 pays salaries
  And p1 ends their actions
  Then the Dating App in p1's development has 1 blue cube
  And p1 has 7 capital
```

  **How the numbers come** (§5 Phase B, §20.B, §20.C, §20.D, ruling 13, R3):
  - **Tech Bubble:** +$1 on every Active product this round (§20.D 2). p1: Dating App 1 + 1 and Smart Lock 2 + 1, 7 + 5 = 12, with Blue 1 and Red 1 for maintenance 1/0 and 0/1. The next round's Whistleblower Protection Act does nothing yet: p0's To-Do List earns its 1, 7 + 1 = 8.
  - **Legacy Code:** −$2 per Bug, each product at least $0 (§20.D 5, §5 Phase B): Payment Gateway 3 − 2 = 1, Dating App 1 − 2 → 0; 7 + 1 = 8, and only the Payment Gateway earns Market Share.
  - **Open Source Boom:** +1 to every staff member working in Software, in Development and in Ops (§20.D 7). Ops: the Junior's 1 + 1 = 2 runs the To-Do List and the Mobile Wallet (maintenance 1 each): 7 + 1 + 2 = 10. Salaries: Junior PM $1, Firmware Specialist $2: 10 − 3 = 7. Development: the Firmware Specialist 2 + 1 = 3, the burned-out Junior 0 (R3), Synergy 1 for the one working Blue teammate: 4; the burned-out Junior earns no Pending token.
  - **Hardware Hackathon / Logjam:** ±1 to every staff member working in Hardware (§20.D 8, 12). Ops Red 1 + 1 = 2 runs the Smart Thermostat and the Smart Toy (rev 2 each): 7 + 4 = 11; the project's Junior makes 2 Red. Under Logjam the Junior makes 0, so both products go offline and earn nothing, and the Smart Lock stays at 2.
  - **Server Crash:** −1 Bandwidth to Software staff in the Ops Zone (§20.D 11): the Junior 1 − 1 = 0, the Red-mode Firmware Specialist 0, kept at 0 (spec call); Red 2 + 1 = 3. The To-Do List (1/0) goes offline; the Smart Lock earns 2 and the Firmware Specialist's $2 is paid: 7. Development is untouched: 1 Blue.
  - **Lines each example pins:** 1 the Tech Bubble line and Bubbly; 2 the Legacy Code line and Legacy; 3 the Open Source Boom line and its flag, and Burnout's place after it; 4 the Hackathon and Logjam lines and their flags; 5 the Server Crash line, its flag and the floor.
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`, then the removal probe.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's Tech Bubble, Legacy Code, Open Source Boom, Hardware Hackathon, Server Crash and Supply Chain Logjam change revenue, decay, output and bandwidth for the round they are in play

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 3: Prices: Patent Trolls, Chip Shortage, Intern Season, Online Course Boom, Trade Show

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count); `tableaux.test.ts` only if it pins the bank line's game numbers

**Interfaces:**
- Consumes: Task 1's round start; 6-1's `the {gamenumber} goes up by {int}` and `a card's {attribute} is {int}`; 6-2a's `Price:`; 4-1's game-number phrases.
- Produces (rules): game numbers `junior price`, `hardware junior price`; worked flags `chip short`, `course priced`, `show priced`; worked `cost` (refined), `rehire price`; the round's price lines; the recruit and open-job-market buttons read them.

- [ ] **Step 1: Change the tests.**
  - **Pins.** `results` is N₇ + 14; the designer page's count too. The values test adds `cost` (`refines: true`) and `rehire price` (numbers) and the three flags; `shownFlags(game)` and `standIns(game)` are unchanged.
  - **Money (`keepsTheRules`):** a recruit pays the game number `junior price`, or `hardware junior price` for `recruit a junior hardware eng`, read in `before`; an agency hire pays the card's worked `cost`, a hire from the open job market its worked `rehire price`, a scouting hire the total worked `cost` of the picked cards, all read in `before` with `runtime.workedValue`.
  - **Invariant (Review Focus 3, the spec's anti-goal)**, after every move once a round has started: `license` is 5 when the Event in play is Patent Trolls and 3 otherwise; `junior price` is 0 under Intern Season and 2 otherwise; `hardware junior price` is 0 under Intern Season, 5 under Chip Shortage and 2 otherwise.
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Change the rules text.**
  - **The game's numbers.** After `  The game has a license of 3.` add:

```text
  The game has a junior price of 2.
  The game has a hardware junior price of 2.
```

  - **The round's prices** (§20.D 3, 9, 14; §13.A). In `  When a round starts:`, after the deal line, add:

```text
    The license is 3.
    If the event in play has the Patent Trolls, the license is 5.
    The junior price is 2.
    The hardware junior price is 2.
    If the event in play has the Intern Season, the junior price is 0.
    If the event in play has the Intern Season, the hardware junior price is 0.
    If the event in play has the Chip Shortage, the hardware junior price goes up by 3.
```

  - **The University.** In `A player may recruit a junior software dev.` and `A player may recruit a junior qa tester.`, `    Only if they have at least 2 capital.` becomes `    Only if they have at least the junior price in capital.` and `      They pay 2.` becomes `      They pay the junior price.` In `A player may recruit a junior hardware eng.`, they become `    Only if they have at least the hardware junior price in capital.` and `      They pay the hardware junior price.`
  - **The open job market.** In `A player may hire a card from the open job market to their bench.`, `    Only if they have at least 1 capital.` becomes `    Only if they have at least the card's rehire price in capital.` and `      They pay 1.` becomes `      They pay the card's rehire price.`
  - **The flags.** Right after the `Logjammed:` section add:

```text
Chip short:
  Only if the event in play has the Chip Shortage.
  Only if it is a hardware card.

Course priced:
  Only if the event in play has the Online Course Boom.
  Only if it is a Training card.

Show priced:
  Only if the event in play has the Trade Show.
  Only if it is a TechCrunch Feature card.
```

  - **Cost and rehire price** (§20.D 9, §13.A). Right after the `Price:` section add:

```text
Cost:
  A chip short card's cost goes up by 3.

Rehire price:
  A card's rehire price is 1.
  A chip short card's rehire price goes up by 3.
```

  - **Price** (§20.D 16, 18). At the end of `Price:` add:

```text
  A course priced card's price is 1.
  A show priced card's price is 2.
```

  - **The University's refusal.** In "you can't pay, so you can't act (section 6)", `  Then it is rejected because "they have at least 2 capital"` becomes `  Then it is rejected because "they have at least the junior price in capital"`. Re-read the file for any other example quoting one of the four changed guards, apply the same change and report it.
  - **Append these 5 examples.**

```text
Example: during Patent Trolls a Greenlight License costs $5, and the next round it is $3 again (section 20, section 6, section 14)
  Given the event deck has the Venture Capital Rain and the Patent Trolls
  And p1's operations has a Dating App
  And p1's ops team has a Junior Software Dev
  And p0's backlog has a Streaming Service and an Esports League
  And it is p1's turn
  When p1 ends their actions
  Then the event in play has the Patent Trolls
  And the license is 5
  When p0 greenlights the Streaming Service
  Then p0 has 2 capital
  And p1 has 13 capital
  When p0 ends their actions
  And p1 ends their actions
  Then the event in play has the Venture Capital Rain
  And the license is 3

Example: during Chip Shortage Hardware talent costs $3 more from the University, the agency row and the open job market, and a flex Firmware Specialist its printed price (section 20, section 13)
  Given the event deck has the Chip Shortage
  And the agency row has the Engineer, a Firmware Specialist, the Hacker and the Veteran
  And the open job market has the Diva
  And it is p1's turn
  When p1 ends their actions
  Then the event in play has the Chip Shortage
  And the hardware junior price is 5
  And the junior price is 2
  Given p0 has 30 capital
  And p0 has 4 actions
  When p0 recruits a junior hardware eng
  Then p0 has 25 capital
  When p0 hires the Engineer to p0's bench
  Then p0 has 16 capital
  When p0 hires the Diva
  Then p0 has 12 capital
  When p0 hires the Firmware Specialist to p0's bench
  Then p0 has 6 capital

Example: during Intern Season recruiting from the University costs $0, and the next round $2 again (section 20, section 13)
  Given the event deck has the Venture Capital Rain and the Intern Season
  And it is p1's turn
  When p1 ends their actions
  Then the junior price is 0
  And the hardware junior price is 0
  Given p0 has 0 capital
  When p0 recruits a junior software dev
  And p0 recruits a junior hardware eng
  And p0 recruits a junior qa tester
  Then it is accepted
  And p0 has 0 capital
  And p0's bench has a Junior Software Dev, a Junior Hardware Eng and a Junior QA Tester
  When p1 ends their actions
  Then the event in play has the Venture Capital Rain
  And the junior price is 2
  And the hardware junior price is 2

Example: during Online Course Boom every Training card costs $1, and other Strategy cards their printed price (section 20)
  Given the event in play has the Online Course Boom
  And p0 has 2 capital
  And p0's strategy hand has a Full Stack Bootcamp, a Leadership Masterclass and a Workaholic
  And p0's bench has a Junior Software Dev
  When p0 plays the Full Stack Bootcamp to the Junior Software Dev
  Then p0 has 1 capital
  When p0 plays the Leadership Masterclass to the Junior Software Dev
  Then p0 has 0 capital
  When p0 plays the Workaholic to the Junior Software Dev
  Then it is rejected because "they have at least the card's price in capital"

Example: during Trade Show TechCrunch Feature costs $2, and with a Sales Rep on the product still $2, as the discounts don't stack (section 20, ruling 23)
  Given the event in play has the Trade Show
  And the phase is actions
  And p0 has 4 capital
  And p0's strategy hand has a TechCrunch Feature and a TechCrunch Feature
  And p0's operations has a Dating App and a To-Do List
  And the To-Do List in p0's operations has a Sales Rep on it
  When p0 plays a TechCrunch Feature to the Dating App
  Then p0 has 2 capital
  When p0 plays the TechCrunch Feature to the To-Do List
  Then p0 has 0 capital
  And the To-Do List in p0's operations has 1 hype
```

  **How the numbers come** (§6, §13.A, §14.B, §20.A, §20.B, §20.D):
  - **Patent Trolls:** the Tag Owner's share of a Greenlight License is $5 instead of $3 this round (§20.D 3); the Streaming Service requires Social, which p1's Dating App provides (§20.C): p0 7 − 5 = 2; p1 7 + 1 (its Income) + 5 = 13.
  - **Chip Shortage:** +$3 for talent whose native skill is Hardware, from any source; flex staff untouched (§20.D 9). Junior Hardware Eng 2 + 3 = 5; the Engineer 6 + 3 = 9; the Diva from the open job market 1 + 3 = 4; the Firmware Specialist (flex) 6. So 30 − 5 − 9 − 4 − 6 = 6.
  - **Intern Season:** University $0 this round (§20.D 14); $2 again after (§13.A.1).
  - **Online Course Boom:** every Training card $1 (§20.D 16): Bootcamp (Red, the colour a Junior Software Dev lacks) and Masterclass $1 each; Workaholic keeps its $2.
  - **Trade Show:** TechCrunch Feature $2; it doesn't stack with the Sales Rep's $2 (§20.D 18, §20.A): 4 − 2 − 2 = 0.
  - **Lines each example pins:** 1 the two License lines; 2 Chip short's lines, the Chip Shortage price line, `Cost:`'s line, both `Rehire price:` lines and the open job market's two lines; 3 the four University price lines and the three recruit buttons' lines; 4 Course priced's lines and its `Price:` line; 5 Show priced's lines and its `Price:` line.
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`, then the removal probe.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's Patent Trolls, Chip Shortage, Intern Season, Online Course Boom and Trade Show set the License, hiring, Training and TechCrunch prices for their round, back to printed at the next Round Start

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 4: Crunch Time

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count)

**Interfaces:**
- Consumes: 6-2a's `blue made`, `red made`, `clean coding`; 3-1's `stalled` and `blue need`; 5-1's `goes up by its {attribute}`.
- Produces (rules): worked `blue reached`, `blue added`, `red added`; flags `blue covered`, `crunching blue`, `crunching red`, `crunched`; the Engine reads the added values and adds Crunch Time's Bug.

- [ ] **Step 1: Change the tests.**
  - **Pins.** `results` is N₇ + 17; the designer page's count too. The values test adds `blue reached`, `blue added`, `red added` (numbers) and the four flags. `standIns(game)` gains `'blue made': 'blue reached'` (no card keeps `blue made`, so no face changes); `shownFlags(game)` is unchanged. Pin what the view says if it differs, and report it.
  - **Append `it('adds exactly one Crunch Time cube to a project that isn’t Stalled, Blue while the project still needs Blue, else Red (§20.D, suwa’s apply_crunch_time_bonus)')`.** On `setUp(2, 1)` with S its start player and the Crunch Time moved to the event in play, read with `runtime.workedValue`:
    - an unstaffed Dating App in S's development: `blue added` 1, `red added` 0;
    - a Smart Lock with 1 blue cube: `blue added` 0, `red added` 1;
    - a Cloud Storage with 3 blue cubes and a Junior Software Dev on it: `blue added` 1, `red added` 1 (its made Blue 1 plus none);
    - a Neobank with no lead (Stalled): both 0;
    - with the Event moved to the event discard: each project's added values equal its made values.
    This test pins `Only if it is not blue covered.` in `Crunching blue:`, whose extra Blue cube would be lost at commit in any example.
  - **Invariant:** in a move that ran the Engine for the mover under Crunch Time, each project of the mover that was not `stalled` gained exactly 1 Bug more than it would without (read as: its `bugs` after commit equal `bugs` before, plus 1 unless a card on it was `clean coding`, less its `qa made`, at least 0).
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Change the rules text.**
  - **The flags.** Right after the `Show priced:` section add:

```text
Blue covered:
  Only if its blue reached is at least its blue need.

Crunching blue:
  Only if the event in play has the Crunch Time.
  Only if it is not stalled.
  Only if it is not blue covered.

Crunching red:
  Only if the event in play has the Crunch Time.
  Only if it is not stalled.
  Only if it is blue covered.

Crunched:
  Only if the event in play has the Crunch Time.
  Only if it is not stalled.
  Only if no card on it is clean coding.
```

  - **The values.** Right after the `QA made:` section add:

```text
Blue reached:
  A card's blue reached is its blue made.
  A card's blue reached goes up by its blue cubes.

Blue added:
  A card's blue added is its blue made.
  A crunching blue card's blue added goes up by 1.

Red added:
  A card's red added is its red made.
  A crunching red card's red added goes up by 1.
```

  - **The Engine** (§20.D 10, §5 Phase D steps 1–2). In `Phase: engine`'s `When this phase starts:`:
    - `    For each card in their development, its new blue cubes go up by its blue made.` becomes `    For each card in their development, its new blue cubes go up by its blue added.`;
    - `    For each card in their development, its new red cubes go up by its red made.` becomes `    For each card in their development, its new red cubes go up by its red added.`;
    - right after that line add `    Each crunched card in their development gains 1 bug.`
  - **Append these 3 examples.**

```text
Example: Crunch Time gives each project that isn't Stalled 1 more cube, staffed or not, Blue while it still needs Blue and else Red, and a Bug unless a working Clean Code unit is on it (section 20, the spec's call)
  Given the event in play has the Crunch Time
  And the phase is actions
  And p0's development has a Dating App, a Smart Lock and a Cloud Storage
  And the Smart Lock in p0's development has 1 blue cube
  And the Cloud Storage in p0's development has 3 blue cubes
  And the Cloud Storage in p0's development has a Junior Software Dev on it
  And the Dating App in p0's development has the Architect on it
  When p0 ends their actions
  Then the Dating App in p0's development has 4 blue cubes
  And the Dating App in p0's development has 0 bugs
  And the Smart Lock in p0's development has 1 red cube
  And the Smart Lock in p0's development has 1 bug
  And the Cloud Storage in p0's development has 4 blue cubes
  And the Cloud Storage in p0's development has 1 red cube
  And the Cloud Storage in p0's development has 1 bug

Example: Crunch Time skips Stalled projects, and Development QA can clean the Bug it adds the same turn, its Junior learning Green (section 20, section 5, ruling 1)
  Given the event in play has the Crunch Time
  And the phase is actions
  And p0's development has a Neobank, a Server Farm and a To-Do List
  And the To-Do List in p0's development has a Junior QA Tester on it
  When p0 ends their actions
  Then the Neobank in p0's development has 0 blue cubes
  And the Neobank in p0's development has 0 bugs
  And the Server Farm in p0's development has 0 red cubes
  And the Server Farm in p0's development has 0 bugs
  And the To-Do List in p0's development has 1 blue cube
  And the To-Do List in p0's development has 0 bugs
  And the Junior QA Tester in p0's development team has 1 pending green

Example: Toxic Personality takes its cube from the team's output before Crunch Time adds the project's, so the Crunch cube stays (section 20, the slice's R1)
  Given the event in play has the Crunch Time
  And the phase is actions
  And p0's development has a Smart Lock
  And the Smart Lock in p0's development has the Engineer on it
  And the Engineer in p0's development team has 1 toxic personality
  When p0 ends their actions
  Then the Smart Lock in p0's development has 1 blue cube
  And the Smart Lock in p0's development has 2 red cubes
  And the Smart Lock in p0's development has 1 bug
```

  **How the numbers come** (§3, §5 Phase D, §20.B, §20.C, §20.D 10, ruling 1, R1):
  - **Crunch Time:** every Development project that isn't Stalled makes +1 Cube, Blue if it still needs Blue, otherwise Red, staffed or not, and must add 1 Bug unless a Clean Code unit works on it (§20.D 10, §20.B). "Still needs" counts the track and this turn's cubes (suwa's `apply_crunch_time_bonus`).
  - **Dating App** (6 Blue): the Architect's 3 + 1 = 4, Clean Code: no Bug. **Smart Lock** (1 Blue / 5 Red), its Blue full on the track: 1 Red, 1 Bug. **Cloud Storage** (4 / 4), 3 Blue on the track and the Junior's 1 this turn: Blue full, so 1 Red, 1 Bug.
  - **Stalled:** the Neobank (Tier 2 Software) and the Server Farm (Tier 2 Hardware) have no lead (§3): no cube, no Bug. The To-Do List's Junior QA Tester cleans the Crunch Bug in Clean & Learn and gains a Green Pending token (§5 Phase D step 2, ruling 1).
  - **Toxic Personality:** the Engineer's 3 Red − 1 = 2 (R1); the Smart Lock still needs its 1 Blue, so Crunch Time's cube is Blue; the Engineer has no Clean Code: 1 Bug.
  - **Lines each example pins:** 1 Crunching blue's and Crunching red's event lines and `Only if it is blue covered.`, Blue covered, both Blue reached lines (the Smart Lock by its track, the Cloud Storage by its made Blue), Blue added's and Red added's lines, the Engine's two changed lines, the Bug line and Crunched's event and Clean Code lines; 2 the three `Only if it is not stalled.` lines and the Bug line's place before Development QA and the Green Pending line. 3 is a guard of the call. `Only if it is not blue covered.` is pinned by the test above.
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`, then the removal probe (`Only if it is not blue covered.` excepted, which the added-values test fails without).
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's Crunch Time gives each project that isn't Stalled one more cube, Blue while it still needs Blue, and a Bug unless working Clean Code is on it, before Development QA

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 5: The reveal step: Angel Investors and Regulation Audit

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count); `playtest-fitted.test.tsx` only if it pins phases or offered lists the step phase changes

**Interfaces:**
- Consumes: 6-1's round steps; Task 1's round start; 5-1's `If … and …`; 6-2a's strip (a let-go here fires).
- Produces (rules): worked flags `acting once`, `angel funded`, `past tier 1`, `taxed`; worked `payroll tax`; the phase `event check` with its two let-go buttons; the round's last line.
- Produces (test file): `PHASES` gains `'event check'` last; `const EVENT_CHECK = 'event check';`; `payrollTaxOf(runtime, state, seat): number` (the total worked `payroll tax` of the seat's development team and ops team).

- [ ] **Step 1: Change the tests.**
  - **Pins.** `results` is N₇ + 19; the designer page's count too. `PHASES` gains `'event check'` last. The values test adds `payroll tax` (number) and the four flags; `shownFlags(game)` and `standIns(game)` are unchanged (each flag reads the Event in play, or no value line reads it).
  - **Money (`keepsTheRules`, Review Focus 2).** A move in which `ROUND_STEPS_KEY` is set in `before` or `after`, or in which a round started with Angel Investors or Regulation Audit revealed, is checked as a whole rather than press by press: each seat's capital changes by
    - +3 when the Angel Investors were revealed in the move and the seat, in `before`, had a card in its development or operations and none of Tier 2 or 3;
    - −`payrollTaxOf(runtime, after, seat)` when the seat's event check step ended in the move (it had not passed in `before`, and has in `after`): its Board can change only by its own let-gos until the steps end;
    - plus `earned(seat)`, as today.

    A let-go press in `event check` changes no capital.
  - **Invariants:**
    - the phase is `event check` only while `roundStepsOf(state)` is a `RoundSteps` whose phase it is, and the Event in play is Angel Investors or Regulation Audit;
    - a let-go press in `event check` moves a card that was `taxed` in `before`, and the card is fired (6-2a's strip invariant applies);
    - a seat whose step ended under Regulation Audit has at least 0 capital after it.
  - **The auto-player in `event check`:** it lets go, one press at a time, of the `taxed` card at `t % n` among its taxed Board cards (its development team's first, then its ops team's, in slot order).
  - **Append `it('lets go of the staff the auto-player picks when a Regulation Audit finds it short, through the page’s view and without it (§20.D, the spec’s call)')`.** From `setUp(2, 1)` with S its start player and O the other seat: the Regulation Audit on top of the event deck; O with the Engineer and the Diva on a project of its development and 1 capital; S ending its turn. For t = 0 and t = 1, `playTurn` for O in `event check` lets go of a different card first; O then pays its $1 and the steps end; the logs with and without the view are equal.
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Change the rules text.**
  - **The flags.** Right after the `Crunched:` section add:

```text
Acting once:
  Only if one of:
    It is an Angel Investors card.
    It is a Regulation Audit card.

Angel funded:
  Only if the event in play has the Angel Investors.

Past tier 1:
  Only if one of:
    It is a Tier 2 card.
    It is a Tier 3 card.

Taxed:
  Only if the event in play has the Regulation Audit.
  Only if its salary is more than 0.
```

  - **The tax.** Right after the `Rehire price:` section add:

```text
Payroll tax:
  A taxed card's payroll tax is 1.
```

  - **The step at the reveal** (§5 Phase A, §20.D 4 and 6). As the last line of `  When a round starts:` add:

```text
    If some card in the event in play is acting once, each player has the event check, in turn from the start player.
```

  - **The phase.** After the `Phase: final check` block (the last phase) add:

```text
Phase: event check
  Players take turns.
  Hint: The Regulation Audit taxes you $1 for each employee on your Board who draws a salary, and you can't pay it all. Let staff go, as you choose, until you can.
  When this phase starts:
    If they have a card in their development and their operations that is angel funded and they have no card in their development and their operations that is past tier 1, they get 3 capital.
  A player may let go of a card in their development team.
    Only if it is taxed.
    Then:
      It is fired.
      Move it to the open job market.
  A player may let go of a card in their ops team.
    Only if it is taxed.
    Then:
      It is fired.
      Move it to the open job market.
  When they have at least the total payroll tax of the cards in their development team and their ops team in capital:
    They pay the total payroll tax of the cards in their development team and their ops team.
    The event check passes to the left.
```

  - **Append these 2 examples.**

```text
Example: Angel Investors, as it is revealed, gives $3 to each player with a Tier 1 product and none of Tier 2 or 3, in development or in operations, and nothing to a player with no product (section 20, the spec's call)
  Given 5 players
  And the event deck has the Angel Investors
  And p0's development has a To-Do List
  And p1's development has a Neobank
  And p1's operations has a Dating App
  And p2's development has a Quantum Computer
  And p2's operations has a Mobile Wallet
  And p3's operations has a Smart Lock
  And the Neobank in p1's development has the Architect on it
  And it is p4's turn
  When p4 ends their actions
  Then the event in play has the Angel Investors
  And it is p0's turn
  And the phase is actions
  And p0 has 10 capital
  And p1 has 7 capital
  And p2 has 7 capital
  And p3 has 10 capital
  And p4 has 7 capital

Example: Regulation Audit, as it is revealed, taxes each player $1 for each Board employee who draws a salary, in turn from the Start Player, and one who can't pay lets staff go, choosing whom, until they can (section 20, the spec's call)
  Given 3 players
  And the event deck has the Regulation Audit
  And p0's development has a Dating App
  And p1 has 1 capital
  And p1's development has a Smart Lock
  And p1's ops team has the Diva
  And the attributes in play has a Workaholic and a Burnout
  And the Dating App in p0's development has the Architect, a Junior Software Dev and a Junior PM on it
  And the Smart Lock in p1's development has the Engineer, a Junior Hardware Eng and a Junior QA Tester on it
  And the Junior Hardware Eng in p1's development team has 2 red xp
  And the Engineer in p1's development team has 1 workaholic
  And the Diva in p1's ops team has 1 burnout
  And it is p2's turn
  When p2 ends their actions
  Then the event in play has the Regulation Audit
  And the phase is event check
  And it is p1's turn
  And p0 has 5 capital
  When p1 lets go of the Junior QA Tester
  Then it is rejected because "it is taxed"
  When p1 lets go of the Engineer
  Then the phase is event check
  And it is p1's turn
  When p1 lets go of the Diva
  Then it is p0's turn
  And p1 has 0 capital
  And p2 has 7 capital
  And the open job market has the Engineer and the Diva
  And the strategy discard has a Workaholic and a Burnout
  And the Smart Lock in p1's development has a Junior Hardware Eng and a Junior QA Tester on it
```

  **How the numbers come** (§3, §5 Phase A, §11.A.3, §20.B, §20.C, §20.D 4 and 6):
  - **Angel Investors:** when revealed, $3 to each player with at least one Tier 1 product and no Tier 2/3 product, counting Development and Maintenance; nothing for a player with no products (§20.D 4). p0's To-Do List (Tier 1, in development) and p3's Smart Lock (Tier 1, operations): 7 + 3 = 10. p1's Neobank and p2's Quantum Computer are Tier 2 and 3 (§20.C): 7. p4 has no product: 7. The Architect on p1's Neobank draws a salary but is not taxed (not a Regulation Audit).
  - **Regulation Audit:** when revealed, $1 for every Board employee with salary above $0; Juniors with 0–1 XP are exempt; a player who can't pay lets staff go, choosing who (§20.D 6). p0: the Architect ($2) and the Junior PM ($1), not its 0-XP Junior: 7 − 2 = 5. p1: the Engineer ($2 + $2 Workaholic), the Diva ($1), the 2-XP Junior Hardware Eng ($1, §11.A.3) = $3 against 1; the 0-XP Junior QA Tester can't be let go for it; after the Engineer and the Diva go, $1 is paid: 0. p2 has no Board: 7. Letting go fires (R2): Workaholic and Burnout go to the strategy discard.
  - **Order:** in turn order from the Start Player, p0 (§5 Phase A; the spec's call); then p0's turn starts, its salaries waiting at Income.
  - **Lines each example pins:** 1 Acting once's Angel line, the steps line, the phase's start line, Angel funded, both Past tier 1 lines, and Taxed's event line (the Architect); 2 Acting once's Regulation Audit line, Taxed's salary line (the exempt Juniors), Payroll tax, the pay-and-pass rule, both let-go buttons with their guard and `It is fired.`, and Angel funded's event line (p0 holds only a Tier 1 product).
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`, then the removal probe. 6-1's checks give no diagnostic: the phase passes on, has no go-to and no After line, and is reached.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's Angel Investors and Regulation Audit act once as they are revealed, each player in turn from the Start Player, a player short of the tax letting staff go as they choose

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 6: Long runs: every Event tallied, whole games replayed; the README and the checks

**Files:**
- Modify: `src/games/startup-simulator.test.ts`, `README.md`

**Interfaces:**
- Consumes: every constant and policy above and in plans 4-2, 5-2a, 5-2b and 6-2a; `eventOf`, `payrollTaxOf`, `techCrunchPrice`; `ranTheEngine`, `atTheEngine`, `enteredIncome`.
- **`happenings` gains these keys** (read through the runtime):
  - `an Event revealed: <name>`, for each move in which `ROUND_KEY` rose, the Event in play after it; `the event discard shuffled into the event deck`, for such a move whose `before` had an empty event deck;
  - `Angel Investors paid`, for each seat paid $3 at a reveal; `Regulation Audit paid`, for each seat whose step ended having paid above $0; `Regulation Audit: staff let go`, for each let-go press in `event check`;
  - `Tech Bubble at an Income` and `Legacy Code at an Income`, for the seat that reached its Income under that Event with an online product (with `bugs`, for Legacy Code that is `decaying`);
  - `Open Source Boom at work`, `Hardware Hackathon at work` and `Supply Chain Logjam at work`, in a move that ran the Engine for the mover under that Event, for each of its projects not `stalled` with a card on it whose `blue output` (Open Source Boom) or `red output` (the other two) was not null; `Server Crash at an Income`, for the seat that reached its Income under it with a card in its ops team whose `blue output` was above 0;
  - `Patent Trolls: a $5 License`, for a `GREENLIGHT` whose mover paid a License of 5; `Chip Shortage: a Hardware hire for $3 more`, for a recruit of a junior hardware eng or a hire of a `hardware` card under it; `Intern Season: a free recruit`; `Online Course Boom: a Training card for $1`; `Trade Show: a TechCrunch Feature for $2`, for a `PLAY_TO_PRODUCT` press under it;
  - `Crunch Time: a cube`, `Crunch Time: a Bug` and `Crunch Time: a Bug stopped by Clean Code`, in a move that ran the Engine for the mover under it, for each project not `stalled` by whether it was `crunched`.

- [ ] **Step 1: Write the tests.**
  - **`'made every move in those runs …'`** also expects above 0 a let-go in `event check` (counted as `Regulation Audit: staff let go`).
  - **Append `it('played slice 6’s Events in those runs: all 18 revealed, the discard reshuffled, Angel Investors and Regulation Audit paid and staff let go, every round-long effect at work, every price changed, and Crunch Time’s cubes and Bugs')`.** It expects every key above above 0, the 18 `an Event revealed: …` keys included.
  - **Append `it('takes back the last move and rebuilds whole games from their logs, through reveals, a reshuffle and an event check that waited (Review Focus: 4 players, seeds 1 to 5)')`.** Play each game to its result, keeping the state before each move; a fresh engine given `loadLog(log)` equals the final state, and `engine.undo()` gives the state before the last move. Across the five logs some log holds a reshuffle and a let-go in `event check` (count them through the watch).
  - **Kept as they are:** `'plays the same game through the page’s view as without it'` (now through round steps) and every earlier tally.
- [ ] **Step 2: Run** `bunx vitest run src/games/startup-simulator.test.ts`.
  - If a required key stays at 0, print the tally and change the auto-player, never the rules: spend down to a few dollars more often so a Regulation Audit finds a seat short; hold a TechCrunch Feature for a Trade Show; greenlight a card needing a rival's Tag under Patent Trolls; recruit a junior hardware eng under Chip Shortage and Intern Season; play Training under Online Course Boom.
  - Report a key that stays unreachable, with the tally, and pin its path with an arranged test in the shape of Task 5's.
- [ ] **Step 3: Write the README.**
  - **The Startup paragraph** becomes "**Startup Simulator (slice 6)**". After plan 6-2a's sentence, add: each round opens with an Event, revealed by the Start Player and in effect for everyone until the next Round Start, its deck reshuffled from its discard; fourteen Events act (revenue and decay, output and bandwidth, hiring, Training, TechCrunch and License prices, Crunch Time, and Angel Investors' and Regulation Audit's one-off effects taken in turn), and Venture Capital Rain, Recruiter Frenzy, Headhunter Holiday and Whistleblower Protection Act wait for their slices. Its rulings list adds 13.
  - **"It still leaves out"** becomes: Equity and the stock market (with Venture Capital Rain and the Non-Compete Suit), selling and poaching (with the Headhunter, Corporate Raider, Cease & Desist, Flight Risk's effect, Recruiter Frenzy and Headhunter Holiday), Hit Piece and Scandal, Integration, the CTO, Stealth and audits (with Whistleblower Protection Act and Patent Trolls' other fees), Bankruptcy and the Broken Chain, and the HR Manager's and the Director of QA's perks. Each comes in a later slice.
  - **Plan 6-1's README paragraph** ("Other players' cards, lines a flag turns on, the lower of two prices, and steps at the start of a round.") gains a last bullet, `- **Startup Simulator** plays slice 6 this way: …`, naming the Debuff button's `… to a card in another player's development team or another player's ops team.`, `A losing blue card's blue made goes down by 1.`, `They pay the lower of the card's price and the target card's price.`, `If the event in play has the Chip Shortage, the hardware junior price goes up by 3.` and `If some card in the event in play is acting once, each player has the event check, in turn from the start player.`
- [ ] **Step 4: Run** `bun run test` and `bun run typecheck`. The passing count is the starting count plus this plan's new tests.
- [ ] **Step 5: Run the checks.** The first three print nothing. The fourth prints only the Startup count line in `designer-page.test.tsx` and any pin a task reported.

```bash
# no shared code and no page code changed
git diff --stat "$BASE" -- src/engine src/utils
git diff --stat "$BASE" -- src/pages ':!src/pages/designer/*.test.tsx' ':!src/pages/designer/*.test.ts'
# protected files
git diff --stat "$BASE" -- src/engine/core/game-state.ts src/engine/core/flow.ts src/engine/core/game-engine.ts src/pages/hearts-demo
# the page tests' changed lines
git diff "$BASE" -- src/pages/designer | grep -E '^[-+][^-+]'
```

  Also read every number in the new examples against each task's "How the numbers come", and run the removal probe once more over every line plans 6-2a and 6-2b added or changed (the lines named as pinned by a test excepted).
- [ ] **Step 6: Run the games alone.** `bunx vitest run src/games/hearts.test.ts src/games/color-match.test.ts src/games/venom.test.ts src/games/rent-day.test.ts src/pages/hearts-demo` passes, and Rent Day still has 108 examples.
- [ ] **Step 7: Commit**

```bash
git add src/games/startup-simulator.test.ts README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's long runs reveal all 18 Events, reshuffle their discard, take Angel Investors' and Regulation Audit's steps and play every round-long effect and price at 2 to 5 players, every path tallied and whole games rebuilt from their logs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

## Forward notes

- **Plan 6-3 (the page):** the Event in play on the shared table with its text (a `text` column on the Event table, or the page's own words, is 6-3's call); the two University prices beside the License on the bank line; the event check's let-go buttons and the seat switcher following a round's steps (`turn.current`); whether to label Event-driven modifiers (every Event flag reads the Event in play, so `shownFlags` leaves it out).
- **Slice 7:** Consultants move at Round Start (§5 Phase A, §17.B.4). They join `event check`'s steps, so its calling line becomes unconditional or reads a flag covering both; Venture Capital Rain's +$3 reads the Event in play like Task 2's flags.
- **Slice 8:** Recruiter Frenzy (poach ×1) and Headhunter Holiday (no poaching) read the Event in play; Chip Shortage's `cost` already reaches a poach's printed cost.
- **Slices 9 and 10:** Whistleblower Protection Act's $8 and Patent Trolls' Late License, Settlement and Come Clean fees read the Event in play; the License number already holds $5 for the round.

## Gaps against plan 6-1

None that needs engine work: every line above is written with plans 4-1, 5-1 and 6-1's phrases. These calls follow from what the language reads, and are listed so a later plan can revisit them:
- **The steps line is conditional on a flag of the Event card** (`acting once`), since an `If` line can't say "or" and a game has one steps line (6-1). Slice 7 widens it.
- **Angel Investors' three tests fit `If … and …`** only because the Event's test rides on a card flag (`angel funded`) of the products.
- **`Only if it is not blue covered.` in Crunching blue changes nothing an example can see** (a covered colour's extra cube is lost at commit, §6); Task 4's added-values test pins it.
- **Plan 6-2a's Gap 1 still holds:** the bandwidth gauges are off the page until 6-3 (the ops pool's Toxic cube reads owner scope).
