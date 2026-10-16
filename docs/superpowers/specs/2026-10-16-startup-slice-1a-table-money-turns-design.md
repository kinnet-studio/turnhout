# Startup Simulator, Slice 1a: Table, Money and Turns

**Date:** 2026-10-16
**Status:** Settled after its builder check (`builder-check-startup-1a.md`, M1–M11, every call adopted below). The
user handed over every design call for the full implementation; the calls below are the builder's.
**Part of:** `2026-10-16-startup-simulator-overview-design.md`. Its decisions, calls, anti-goals and constraints apply.
**Rulebook sections:** §2, §3 (zones and hands), §4 (setup), §5 (round and turn; Phases A–D only as far as this slice
goes), §6 (Recruit and Ideation), §12 (game end and the first two score lines), §13.A, §14.A, §15.A–B, §20.B.2,
§20.C (the Market Crash).

## What this slice is

The first playable Startup Simulator: the table, the money and the turn. Players can't build products yet; that is
slice 1b. A game of this slice is hiring and drafting until the Market Crash comes out of the Growth Deck, then a score.

The game after this slice:
- **Setup (§4):**
  - 2 to 5 players and a seeded random Start Player.
  - $7 each, and a starting Bench of one Junior from each University stack.
  - One Seed card dealt face down into each Backlog.
  - The Agency Row of 4 from the Talent Deck, and the Product Market of 2 Seed and 2 Growth cards.
  - The Market Crash shuffled into the bottom 20% of the Growth Deck.
- **Rounds (§5):**
  - Each round starts with the Start Player, and each player in turn takes a turn.
  - Phase A (Round Start) has nothing in it yet; the Event Deck arrives in slice 6.
  - Phase B (Income) has nothing in it yet; revenue and salaries arrive in slice 1b.
- **Each turn the player has 3 actions (§5 Phase C, §6).** Actions can be repeated. A player can only take an action
  they can pay for, and loses nothing by trying.
  - **Recruit (1 AP, §13.A):**
    - a Junior from the University for $2, to the Bench;
    - a card from the Agency Row for its printed cost, to the Bench (the Board option arrives with the Board in 1b);
    - a card from the Open Job Market for $1, to the Bench.
  - **Ideation (§14.A):**
    - a card from the Product Market for 1 AP, to the Backlog;
    - Research for 1 AP: draw 3 from the Seed or Growth Deck, keep 1, the other 2 go to the Open Idea Pool;
    - a card from the Open Idea Pool for 2 AP, to the Backlog.
- **The player ends their actions** with a free button when they are done. Unspent AP is lost.
- **Phase D (§5) in this slice is only Cleanup (step 7).** It enforces the Bench limit of 5 (overflow to the Open Job
  Market) and the Backlog limit of 3 (overflow to the Open Idea Pool). The owner chooses which cards go.
- **Markets refill at once (§13.A.2, §14.A.1).**
  - The Agency Row slides left and draws a new card into the empty slot.
  - Each Product Market half draws from its own deck.
  - Neither the Talent Deck nor the product decks reshuffle; empty slots stay empty.
- **The pools are FIFO queues of 5 (§15.A.4, §15.B.4).** The moment a 6th card enters, the oldest is removed from the
  game.
- **The Market Crash (§12, §20.C)** can turn up in a market refill or a Research draw. It is set aside, and a replacement
  is drawn. The round is finished, so every player has had the same number of turns, and then the game is scored.
- **The score in this slice:**
  - Cash: 1 VP per $5, rounded down.
  - Vaporware: −2 / −5 / −10 VP per Tier 1 / 2 / 3 card left in the Backlog.
  - Tied players share the win.

## Decisions

1. **The user handed over the full implementation** ("I'll leave this to you for the full rulebook implementation in
   turnhout version"). There was no question round.
2. **The overview's calls apply:**
   - the rulebook wins;
   - the Bench is hidden from rivals, who see only its size;
   - the Start Player is a seeded random seat;
   - the University stacks are truly infinite;
   - Ideation stops at a 4th Backlog card;
   - tied players share the win.

## Calls (the builder's)

- **Ending actions early.** The rulebook says "Spend 3 Action Points" and never says how a turn ends with AP left. A
  free "End my actions" button moves on to Phase D, and unspent AP is lost. The Rust engine also lets a player stop.
- **A turn moves on by itself after the third action.** When AP reaches 0, Phase D starts with no button press.
- **Research is a private look.** The 3 drawn cards go to a research row only the drawing player sees. The player
  picks 1 for the Backlog, and the other 2 go to the Open Idea Pool. A short deck gives fewer cards.
  - If the Market Crash is among them, it is set aside and replaced by the next card of that deck, so the player still
    sees up to 3 product cards.
- **The Agency Row slides left** after a hire (§13.A.2). The new card enters at the right end.
- **The Backlog stops at 4.** Ideation is allowed while the Backlog has fewer than 4 cards. The rulebook's "Overflow Flush"
  lets a 4th card in and Cleanup cuts back to 3. The Rust engine refuses a 5th.
- **Card counts follow §20, not the `.ron` files.** This slice needs the Talent cards' name, role, cost and native skill,
  and the products' name, tier and deck. Columns for other slices (Salary, Output, Rev, Val, Maint, Tags) go in the
  tables now, so the data is entered once.
- **The Junior stacks are three infinite stacks.** Taking a Junior makes a new card of that kind. A Junior that later
  goes to the Open Job Market is an ordinary card there.
- **Rulings pinned in this slice, as examples:**
  - #10 (the three hands and their limits);
  - #12 (instant FIFO eviction);
  - #13 (rounds and turns);
  - #18 (markets refill at once; Research);
  - #20's 1a part (University and Open Job Market hires go to the Bench only, §13.A);
  - #24's ties (tied players share the win);
  - #25's setup items (2–5 players, the Seed card dealt to the Backlog, no starting Strategy cards).
  - Rulings #2 and #23 have no play effect.
- **What this game omits in 1a** (the overview's rule): the game-end Ops check (§12.2) and the last Milestone check
  (§12.3). The Growth half of the Product Market is a dead draw for humans until slice 3 builds Tier 2/3 prerequisites.

## What the designer writes (shape only)

The builder settles exact wording within the rulings below. This is how the text should read.

```text
Game: Startup Simulator
Players: 2 to 5
  Each player has 7 capital that everyone can see.
  Each player has 3 actions each turn.
  Players pay with capital.

Cards:
  A deck called talent cards, starting in the talent deck:
    | name | cost | skill | output | salary | role | trait | copies |      (key columns first: faces show 3)
    …22 Agency cards (§20.B.1)…
  A stack called junior software devs that never runs out:
    | name | cost | skill | output | salary |
  …junior hardware engineers, junior QA testers (one row each)…
  A deck called seed products, starting in the seed deck:
    | name | tier | blue cost | red cost | rev | val | blue maint | red maint | sector | requires | also requires | tag | copies |
    …30 cards, tier "Tier 1" (§20.C.1, §20.F.1)…
  A deck called growth products, starting in the growth deck:
    …34 cards, tier "Tier 2" or "Tier 3" (§20.C.2–3, §20.F.2–3)…
  A deck called the market crash, starting in the growth deck:
    | name |
    | Market Crash |

Table:
  The talent deck is a pile in the center that no one can see.
  The agency row is a row in the center that everyone can see.
  The open job market is a row in the center that everyone can see.
  …seed deck, growth deck, seed market, growth market, open idea pool, crash pile…
  The box is a pile in the center that no one can see.                     (cards removed from the game)
  Each player has a bench row that only they can see.
  Each player has a backlog row that only they can see.
  Each player has a research row that only they can see.

Setup:
  The start player is chosen at random.
  Shuffle the talent deck. …
  The market crash goes into the bottom fifth of the growth deck.
  A new Junior Software Dev goes to each bench. …
  Deal 1 card from the seed deck to each backlog.

In every phase:
  When the agency row has fewer than 4 cards:
    Only if the talent deck is not empty.
    Move the top card of the talent deck to the agency row.
  When the growth market has the market crash:
    Move the market crash from the growth market to the crash pile.
  When the open job market has more than 5 cards:
    Move the bottom card of the open job market to the box.
  …the seed and growth markets refill from their decks; the open idea pool keeps 5…

Phase: actions
  Players take turns.
  Hint: Spend 3 actions: recruit, draft ideas, or research.
  A player may recruit a junior software dev.
    Only if they have at least 1 action.
    Only if they have at least 2 capital.
    Then: They pay 2. They spend 1 action. A new Junior Software Dev goes to their bench.
  A player may hire a card from the agency row to their bench.
    Only if they have at least 1 action.
    Only if they have at least the card's cost in capital.
    Then: They pay the card's cost. They spend 1 action.
  A player may research the seed deck.
    Only if they have at least 1 action.
    Only if their backlog has fewer than 4 cards.
    Then: They spend 1 action. Deal up to 3 cards from the seed deck to their research.
      The research phase starts with them.
  A player may end their actions.
    Then: Their actions go back to 0.
  When they have less than 1 action, go to bench cleanup.

Phase: research
  A player may keep a card from their research to their backlog.
    Then: Move their research to the open idea pool. Go back to the interrupted turn.
  When their research has the market crash: …set it aside, draw the next growth card into their research…
  When their research is empty: Go back to the interrupted turn.

Phase: bench cleanup
  A player may discard a card from their bench to the open job market.
    Only if their bench has more than 5 cards.
  When their bench has fewer than 6 cards, go to backlog cleanup.

Phase: backlog cleanup
  A player may discard a card from their backlog to the open idea pool.
    Only if their backlog has more than 3 cards.
  When their backlog has fewer than 4 cards: The turn passes to the left.

End:
  The game ends when the crash pile is not empty and the round is finished.
  Each player scores 1 point for every 5 capital.
  Each Tier 1 card in a player's backlog scores -2 points.
  …Tier 2 −5, Tier 3 −10…
  The highest score wins, and tied players share the win.
```

## What the language gains

These are general pieces. None of them mentions Startup Simulator. The rulings below say how each is built.

1. **Counters and buttons in a game with no board:** counter, fact and payment lines indented under `Players:` (R3).
2. **A per-turn budget:** "Each player has 3 actions each turn.", "they spend 1 action", "they have at least 1 action",
   "their actions go back to 0", and singular counter names (R3).
3. **Turn steps with no press:** "they" means the current player in a turn-taking phase; "The turn passes to the left."
   as an effect; a seeded Start Player; "When a round starts:" and "When a player's turn starts:" (R1).
4. **Game end after the round:** "The game ends when … and the round is finished." (R1.5).
5. **Tied winners:** "The highest score wins, and tied players share the win." (R11).
6. **Card moves that pay what the card says:** "they have at least the card's {attribute} in {counter}", "they pay the
   card's {attribute}" (R4).
7. **Endless stacks:** a set that never runs out, and "a new {card} goes to {zone}" (R5).
8. **Rows and queues:** "the bottom card of {zone}", "{zone} has {card}", "move {card} from {zone} to {zone}", "deal up to
   {int} cards", "deal 1 card", "{card} goes into the bottom fifth of {zone}" (R6).
9. **Rules that fire in every phase:** an `In every phase:` section (R6).
10. **A per-N score:** "Each player scores 1 point for every 5 capital." rounding down (R11).
11. **Blank card cells are absent** (R8).
12. **Example vocabulary** for all of the above: "Given p0 has 2 actions", "Given p1 is the start player", "Given the
    agency row has …", "Then the open job market has 5 cards", "Then the game is over and p0 and p1 win", and so on.

## The page

The overview's layout begins here (R9 has the detail):
- **A boardless mode.** The page draws counters, AP left and buttons for any game that has them.
- **The shared table:** the Talent Deck, the Agency Row, the two Product Markets, the Open Job Market and Open Idea Pool,
  the Seed and Growth Decks, and the set-aside Market Crash, wrapped to fit the table.
- **Each player's tableau, public:** capital, AP left, the Bench size and the Backlog size, and the Start Player. Their
  Development and Ops zones arrive in 1b.
- **The seat switcher with the private strip:** the Bench and Backlog face up for that seat, its buttons, the research
  row during Research, and the Cleanup discards. The switcher jumps to the seat that must act.
- **Moving cards: dragging.** Clicking a card comes in 1b with the card-pick buttons.

Card faces stay text in this slice: the name and the first three columns, with the whole card on hover. Pips and badges
come later.

## Examples to cover

| Example | Expect |
|---|---|
| Setup | $7, three Juniors on each Bench, one Seed card in each Backlog, 4 in the Agency Row, 2 + 2 in the markets, the Crash in the bottom fifth |
| A turn has 3 actions | after 3 Recruits, the turn moves to Cleanup without a press |
| You can't pay, so you can't act | Recruit from the Agency with too little capital is refused, and no AP is lost |
| University costs $2 | capital 7 → 5, a new Junior on the Bench |
| The Agency Row slides and refills | hire the 2nd card: cards 3 and 4 slide left and a new card fills slot 4 |
| The Open Job Market is $1 | — |
| A pool keeps the 5 newest | a 6th card in removes the oldest from the game (ruling #12) |
| Product Market refill | drafting a Seed card refills from the Seed Deck |
| Research keeps 1 | draw 3, keep 1, the other 2 go to the Open Idea Pool |
| The Idea Pool costs 2 AP | refused with 1 AP left |
| The Backlog stops at 4 | Ideation refused with 4 in the Backlog |
| Cleanup | Bench 6 → choose 1 for the Job Market; Backlog 4 → choose 1 for the Idea Pool |
| End my actions | moves to Cleanup with AP left, and the AP is lost |
| Rounds | the Start Player goes first each round |
| The Market Crash in a refill | set aside, replaced, and the game ends after the round's last player |
| The Market Crash in Research | set aside and replaced, so the player still sees 3 product cards |
| The Crash is the only card left | Research on a Growth Deck holding only the Crash: nothing to keep, and the turn goes on |
| Research leftovers | the two leftovers enter the Open Idea Pool in the order they sat in the row |
| The score | cash/5 rounded down, Vaporware −2/−5/−10, a tie shares the win |
| A round is finished | the Crash out mid-round: the game ends only after the last player before the Start Player |

## Goals

- Startup Simulator (slice 1a) compiles with no diagnostics, and its examples cover the table above and the pinned
  rulings.
- Long runs at 2, 3, 4 and 5 players reach the Market Crash and score. The auto-player recruits, drafts and Researches.
- Hearts, Color Match, Venom and Rent Day pass unchanged.
- The playtest page plays the slice in a browser check: the shared table, a tableau per player, the seat switcher,
  recruiting, Research and Cleanup.

## Non-goals (in the next slices)

- The Board: the Development and Ops zones, Assign, Greenlight, Launch, revenue and salaries (1b).
- Tiers, leads and Tags (slice 3); modes and bandwidth (slice 4); XP and Training (slice 5); Events (slice 6).
- Equity (slice 7), selling and poaching (slice 8), stealth and audits (slice 9), Bankruptcy (slice 10).
- Agency hires straight onto the Board, Source and Dismiss (1b).

## Anti-goals

- **No Startup Simulator words in shared code.** Capital, Talent, Agency, Junior, Backlog, Seed, Growth, Market Crash,
  Vaporware and the like stay in the rules text.
- **A Bench or Backlog visible to rivals,** or a Research look visible to rivals.
- **A round that skips or repeats a player,** or a game that ends before the round is finished.

## Proof (acceptance)

1. The examples above pass, with every number checked against the rulebook.
2. Long runs end at every player count. In every move:
   - money is conserved (paid to the bank only);
   - no zone exceeds its capacity after the move;
   - the pools hold the 5 newest cards;
   - each player takes exactly one turn per round, starting from the Start Player.
3. Each language piece has unit tests.
4. A browser check of the page, plus happy-dom tests.
5. Hearts, Color Match, Venom and Rent Day pass; `bun run typecheck` is clean.

## Builder-check rulings

The builder check (`builder-check-startup-1a.md`) found nothing that needs the user. Every call below is the builder's,
adopted from its recommendations M1–M11. No protected file changes: `flow.ts`, `game-state.ts` and `game-engine.ts`
stay as they are, and a prototype of the turn machine (`turns.ts` in the check's probes) ran with phrases alone.

### R1. The turn machine (M1)

1. **"They" in a turn-taking phase means the player whose turn it is.** This covers `go to` conditions, "When this
   phase starts:" lines and plain `When …:` rules in a phase that says "Players take turns", and in an interrupt
   phase, where the current player is the one it started with. The runtime passes `{player: turn.current}`. Existing
   games never wrote "they" there, because it didn't compile.
2. **"The turn passes to the left." is an effect.** It chooses the next seat in order and sets the phase to the game's
   first phase. The designer writes it as the last step's rule; the rule stops holding because the phase changes.
   Cleanup is two phases, bench cleanup then backlog cleanup (§5 D.7's order), one `go to` each. No `After a player …`
   line is used for the main turn.
3. **Turn start and round start are a built-in flow trigger** added in the rules compiler, not in `flow.ts`. It fires
   when no turn is interrupted and `data['lang:turn-of']` is not the current player. In order it:
   - if the current player is the Start Player, adds 1 to `data['lang:round']` and runs "When a round starts:";
   - resets the current player's per-turn counters;
   - runs "When a player's turn starts:";
   - sets `data['lang:turn-of']` to the current player.

   It stays a trigger, never part of the pass effect: End is checked before triggers, so after the last pass there is
   a window where the Start Player is current and their turn hasn't begun. The trigger exists only in games that
   declare a per-turn counter, a Start Player or a turn/round-start rule, so the four existing games are untouched.
4. **The Start Player:** "The start player is chosen at random." is a setup effect. It draws a seat from the seeded
   rng, stores it in `data['lang:start-player']` and makes that seat current. The seat view carries it for the page.
   It is not a designer-declared player flag.
5. **"The round is finished"** holds in exactly that window: at least one round has started, the current player is the
   Start Player, and their turn hasn't begun. "The game ends when X and the round is finished." compiles as a frame
   around X, like the If and For frames, since conditions have no "and". X here is `the crash pile is not empty`.
6. **Examples:** an arranged turn counts as already started. The example's initial table and "Given it is p1's turn"
   set the turn marker, so building the engine doesn't reset "Given p0 has 2 actions". New steps: "Given p1 is the
   start player" and a step that finishes the current turn.

### R2. Zones (M2)

- The Bench, the Backlog and the Research area are **rows**, so their owner can pick any card: "Each player has a bench
  row that only they can see." (the zone is "bench"), "backlog row", "research row".
- Table lines carry no capacity. Refills and evictions are explicit rules (R6). "No zone over its capacity" is a test
  invariant, not a language feature.

### R3. Counters without a board (M3)

- Counter, fact and payment lines go **indented under `Players: 2 to 5`**. The compiler reads them with the Board
  section's line reader, with no loop required, into a board with no spaces. Every counter, payment, debt and fact
  phrase then works unchanged, and the phrases that need spaces stay refused.
- Player facts and game numbers are accepted when the game has a `Board:` or a `Players:` block.
- **Page:** the board grid is drawn only when there are spaces; the money line when there are counters or facts; the
  buttons when there are actions.
- New phrases: `each player has {int} {name} each turn` (a public counter reset at each of their turns), "they spend
  {int} {counter}", singular counter names ("1 action"), and `their {counter} go back to {int}`.
- Rejected: `Board:` with no spaces (reads wrong in a card game and weakens the loop check), and a new section name.

### R4. Card moves that pay what the card says (M4)

- `they have at least the card's {attribute} in {counter}` (a condition) and `they pay the card's {attribute}` (an
  effect), both in a card move's lines. "Its" stays the space in board games.
- Agency and University pay their price; the Open Job Market pays a flat 1.
- **Forward note for 1b and slice 7 (the Veto):** 1a's Recruit and Ideation are card moves, and a card move relocates
  before its lines run. 1b re-expresses the AP-costing card moves as the card-pick buttons it builds anyway, in the
  overview's one shared shape. In 1a every AP cost is written `Only if they have at least N actions.` + `They spend N
  actions.`, so the change is mechanical.

### R5. Endless stacks (M5)

- A set "that never runs out" keeps its identity but puts no card on the table.
- `a new {card} goes to {zone}` makes a card with id `c{n}`, where `n` comes from `data['lang:next-card']`, which starts
  at the number of cards built. Undo and replay stay identical.
- Setup: "A new Junior Software Dev goes to each bench." Buttons: "A player may recruit a junior software dev."
- Cards removed from the game move to a declared box pile rather than being deleted, so ids are never reused.
- The example claimer makes a card of an endless kind when none is left to claim.

### R6. Rows, queues and every-phase rules (M6)

- **Refill and slide already work:** a `When the agency row has fewer than 4 cards:` rule with `Only if the talent deck
  is not empty.` fills the row at game start and after each hire, and a row keeps its order, so the remaining cards
  slide left and the new one enters at the right.
- **New phrases:** `move the bottom card of {zone} to {zone}` (the oldest card, for FIFO eviction); `{zone} has {card}`
  for a shared zone; `move {card} from {zone} to {zone}`; `deal up to {int} cards …` (a short source gives fewer);
  "deal 1 card"; `{card} goes into the bottom fifth of {zone}`.
- **An `In every phase:` section** holds `When …:` rules that fire whatever the phase, plus "When a round starts:" and
  "When a player's turn starts:". If plan 1a-1 must shrink, this section moves to 1b and the three rules it saves are
  copied into each phase that needs them.

### R7. Research (M7)

- The button deals up to 3 into the owner's research row and starts the research phase with them (the interrupt). A
  keep move takes 1 to the Backlog; the rest move to the Open Idea Pool in the order they sat in the row; then the turn
  goes back. The action is spent on the press; if it was the last one, the actions phase moves on on the way back.
- The Crash in the research row is moved to the crash pile and, if the Growth Deck isn't empty, the next card is drawn
  into the row. If the row ends up empty (the deck held only the Crash), the turn goes back with nothing kept.
- One interrupt at a time is enough in 1a.

### R8. Card data (M8)

- **A blank card cell is absent**, as in board tables. The rulebook's "None" and "--" are written as blanks.
- **Tier is text:** "Tier 1", "Tier 2", "Tier 3", so "Each Tier 1 card in a player's backlog scores -2 points." reads by
  value without clashing with the numbers.
- **Two requirements** use two columns, `requires` and `also requires`.
- **The Market Crash is the first row of the growth products table,** its other cells blank; a setup line moves it into
  the bottom fifth. (First written as its own one-row set; the 1a-1 final review found that a one-card set always gets the
  same card id, which told any seat view where the Crash sat in the hidden deck. In the growth table its id is shuffled
  with the others.)
- **Bottom fifth (a silent case, so the Rust engine decides):** with the deck at `n` cards, `window = max(1, ceil(n/5))`;
  the card goes in at a random position `0..=min(window, n)` counted from the bottom.
- **Faces** show the name and the first three columns; each table puts its key columns first; the whole card shows on
  hover.
- Counts follow §20: 22 Agency cards with copies, three one-row Junior sets, 30 Seed, 34 Growth and the Crash.

### R9. The page (M9)

- One canvas for the selected seat, with seat tabs that jump to the current player.
- A per-viewer layout that fits the fixed table world: shared zones wrapped onto two or three rows at the top, the
  viewer's bench, backlog and research rows as a strip at the bottom, and rivals' zones collapsed. Rivals' tableaux
  are DOM text: counters and hand sizes. The existing auto-layout stays unchanged for games that fit today.
- Dragging first; clicking comes in 1b (the overview is amended to match).
- Happy-dom tests and a browser check: recruiting from each source, drafting and Research (seen only by the
  researcher), a Cleanup discard, "End my actions", the switch to the next seat, the Crash and a tied game-over line.

### R10. Two plans (M10)

- **Plan 1a-1, language and rules** (about 10 tasks; the game is playable in the designer at the end): boardless
  counters; the per-turn budget; turn steps (they, the pass, the Start Player); the turn/round trigger and
  `In every phase:`; game end after the round and tied winners; the card's attribute; endless sets; rows and queues,
  the per-5 score and blank cells; the rules text and its examples; long runs at 2–5 players with the invariants.
- **Plan 1a-2, the page** (about 4 tasks): the fitting layout; the seat switcher, private strip and tableaux; faces;
  happy-dom tests and the browser check.

### R11. Smaller calls (M11)

- One tie phrase, "The highest score wins, and tied players share the win." The result gains `winners: [...]` and keeps
  `winner` as the first; the existing phrases keep their earlier-seat default, so Hearts is unchanged. The seat status
  names every winner, and examples say "Then p0 and p1 win".
- "Each player scores 1 point for every 5 capital." rounds down.
- The long-run auto-player has to dig the Growth Deck to reach the Crash (about 28 cards, about 10 turns of Research).

## Left to the builder

- Exact phrase wordings within the rulings above.
- The page's look within the overview's layout.
- The auto-player's choices.
