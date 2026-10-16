# Startup Simulator, Slice 1a: Table, Money and Turns

**Date:** 2026-10-16
**Status:** Ready for its builder check. The user handed over every design call for the full implementation; the calls
below are the builder's.
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
- **Research is a private look.** The 3 drawn cards go to a "looking at" area only the drawing player sees. The player
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
  - #25's setup items (2–5 players, the Seed card dealt to the Backlog, no starting Strategy cards).
  - Rulings #2 and #23 have no play effect.

## What the designer writes (shape only)

The builder settles exact wording. This is how the text should read.

```text
Game: Startup Simulator
Players: 2 to 5

Cards:
  A deck called talent cards, starting in the talent deck:
    | name | role | cost | salary | output | skill | trait | copies |
    …22 Agency cards (§20.B.1)…
  A stack called junior software devs that never runs out:      (wording is the builder's)
    | name | cost | salary | output | skill |
  …junior hardware engineers, junior QA testers…
  A deck called seed products, starting in the seed deck:
    | name | sector | tier | blue cost | red cost | rev | val | blue maint | red maint | requires | tag | copies |
    …30 Tier 1 cards (§20.C.1, §20.F.1)…
  A deck called growth products, starting in the growth deck:
    …34 Tier 2/3 cards and the Market Crash (§20.C.2–3, §20.F.2–3)…

Table:
  The talent deck is a pile in the center that no one can see.
  The agency row is a row in the center that everyone can see, holding 4 cards.
  The open job market is a row in the center that everyone can see, holding the 5 newest cards.
  …seed deck, growth deck, seed market (2), growth market (2), open idea pool (5)…
  Each player has a bench that only they can see.
  Each player has a backlog that only they can see.
  Each player has a looking-at pile that only they can see.

Players:                                                         (counters without a board)
  Each player has 7 capital that everyone can see.
  Each player has 3 actions each turn.
  Players pay with capital.

Setup:
  The start player is chosen at random.
  …shuffle, deal, fill the rows…
  The market crash goes into the bottom fifth of the growth deck.

Phase: actions
  Hint: Spend 3 actions: recruit, draft ideas, or research.
  A player may recruit a junior software dev.
    Only if they have at least 2 capital.
    Then: They pay 2. They spend 1 action. …
  A player may hire a card from the agency row to their bench.
    …they pay its cost…
  A player may end their actions.
  …

Phase: cleanup
  …discard down to 5 on the bench, 3 in the backlog…

End:
  The game ends when the market crash has come out and the round is finished.
  Each player scores 1 point for every 5 capital.
  …vaporware…
  The highest score wins. Tied players share the win.
```

## What the language gains

These are general pieces. None of them mentions Startup Simulator.

1. **Counters and buttons in a game with no board.** A `Players:` section, or the builder's chosen home, declares
   counters ("Each player has 7 capital that everyone can see.") and what players pay with, with no board needed.
   Everything that reads counters today works in it. The seat view carries counters and buttons for any game that has
   them, and the page draws them.
2. **Rounds and a Start Player.**
   - "The start player is chosen at random." (seeded).
   - "When a round starts:", run once per round before the Start Player's turn.
   - "When a player's turn starts:".
   - A round is one turn for every player still in, starting with the Start Player and going to the left.
3. **A per-turn budget:** "Each player has 3 actions each turn." It resets at the start of each of their turns. The
   phrases are "they spend 1 action" and "they have at least 2 actions".
4. **Fixed turn steps:** a turn made of phases that follow one another with no button press. That includes passing the
   turn when the last step ends, and going straight on when the budget reaches 0.
5. **Card buttons that pay what the card says:** "its cost" read from the card's own column in a card move's lines. Card
   moves (drag a card from a zone to a zone) already exist.
6. **Infinite stacks:** a stack that makes a new card of its kind each time one is taken.
7. **Rows with capacity:** a row that refills from its deck when a card leaves, sliding toward one end. A queue that
   evicts its oldest card when a card beyond its capacity enters.
8. **Drawing up to N into a private zone,** and moving the rest of a zone elsewhere.
9. **Rules that fire in every phase,** for a set-aside card (the Market Crash) and refills.
10. **Game end after the round:** "the game ends when … and the round is finished".
11. **Tied winners.**
12. **Setup:** a card shuffled into the bottom fifth of a deck, and dealing face down into a hidden zone.
13. **Example vocabulary** for all of the above: "Given p0 has 2 actions", "Given the agency row has …", "Then the open
    job market has 5 cards", "Then the game is over and p0 and p1 win", and so on.

## The page

The overview's layout begins here:
- **A boardless mode.** The page draws counters, AP left and buttons for any game that has them.
- **The shared table:** the Talent Deck and the three University stacks, the Agency Row, the two Product Markets, the
  Open Job Market and Open Idea Pool, the Seed and Growth Decks, and the set-aside Market Crash.
- **Each player's tableau, public:** capital, AP left, the Bench size and the Backlog size. Their Development and Ops
  zones arrive in 1b.
- **The seat switcher with the private strip:** the Bench and Backlog face up for that seat, its buttons, the
  looking-at pile during Research, and the Cleanup discards. The switcher jumps to the seat that must act.
- **Moving cards:** dragging, as today, or clicking a card and then a destination. The builder check settles which comes
  first.

Card faces stay text in this slice: name and the key columns. Pips and badges come later.

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
| The score | cash/5 rounded down, Vaporware −2/−5/−10, a tie shares the win |

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

## Left to the builder

- Exact phrase wordings and the section name for boardless counters.
- The page's look within the overview's layout, and whether dragging or clicking moves cards first.
- The auto-player's choices.
