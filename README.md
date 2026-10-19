# turnhout

A rendering-and-interaction engine for **web-based card & board games**, built on the [@ue-too](https://www.npmjs.com/org/ue-too) PixiJS + React integration and driven by a declarative scene.

turnhout renders cards and zones, animates deals/flips/moves, and emits interaction *intents* (`onDrop`, `onCardClick`, `onHover`). It does **not** own your game rules — you describe a table as data, turnhout draws it and tells you what the player did.

> **Status:** grown from a card *visual engine* into a toolkit for card-game development: a game-state engine, a flow engine, per-player views, a server-authoritative sync core, and a plain-text language for designing games. Online play is next. See [Roadmap](#roadmap).

## Highlights

- **Declarative & serializable.** A table is plain JSON: a static `TableDef` (zones) plus a dynamic `Placement` (cards). Save it, load it, send it over the wire.
- **Semantic zones.** Zones carry `owner`, `visibility` (`public`/`owner`/`secret`), `capacity`, `ordering`, and serializable accept-rules — enough to express trick-takers, TCGs, solitaire, and hidden-role games.
- **Pluggable rules.** Drop-legality lives in a `RuleRegistry` of named, unit-testable predicates (`descAltColor`, `sameSuitAscending`, `matchRankOrSuit`, `byTag`, `emptyOnly`, …). Reference them by name from a `ZoneDef`.
- **Framework-free core.** All layout, geometry, hit-testing, tweening, and reconciliation live in a pure `core/` with no PixiJS/React/DOM imports and no `Math.random`/`Date.now` — deterministic and testable in isolation.
- **Thin adapters.** `pixi/` renders, `input/` handles pointers (a custom KMT stack), `react/` bridges via `<CardTable>`.
- **Game-state engine.** A `GameEngine` owns the full truth: a `GameState` changed only by registered, seeded, deterministic `Move`s, with a move log, undo and replay.
- **Flow engine.** Turn order, phases, triggers and end conditions are declarative data (`FlowDef`) with behavior registered by name in a `FlowRegistry`, so legality and consequences are not hand-rolled in game code.
- **Per-player views.** `deriveScene(tableDef, placement, viewer)` hides the faces a viewer may not see (private zones, face-down cards) while keeping card ids stable for animation.
- **Net layer.** A `GameServer` validates each move and sends every seat only its own projected view over a `Channel`; `GameSession` and the loopback channel run a whole table in one page. (The transport is in-process today; there is no online play yet.)
- **Designer language.** A game is written as plain, readable text (cards, table, setup, phases, moves, scoring and worked `Example:`s), checked against a phrase library with hints for anything it does not know, and playtested on every seat in the browser. See [Designing a game](#designing-a-game).

## Architecture

```
Consumer app  ──(TableDef + Placement)──►  turnhout
                                             │
        ┌────────────────────────────────────┼───────────────────────────────┐
        │  core/  (pure, no pixi/react/DOM)   │                               │
        │   scene · table-def · layout · zone-geometry · rules · diff         │
        │   tween · choreography · hittest · derive-scene · table-model       │
        │   game-state · game-engine · moves · rng · flow (+ registry)        │
        │   lang/  (designer language: outline · phrases · compile · runtime) │
        └───────┬───────────────┬───────────────┬───────────────────────────-┘
                │               │               │
            pixi/  (view)   input/ (KMT)    react/ (<CardTable>)

        net/  GameServer ──(per-seat projected views)──► GameSession / Channel
```

**The central idea:** the authoritative table state and what any one viewer *sees* are separate. The game-state engine holds the full truth; `deriveScene(tableDef, placement, viewer?)` projects it into a renderable `Scene` for one viewer, hiding what that viewer may not see (with no viewer it is the omniscient identity). The net layer sends each seat only its own projection, never the full state. Rendering and drop hit-testing both flow through the same layout math, so drop targets can't drift from what's drawn.

**Games as text.** `core/lang` reads a designer's rules into a compiled game, builds a `GameEngine` and `FlowDef` from it, and runs its `Example:` blocks on the real engine. It stays pure like the rest of `core/`; the designer page in `pages/designer/` is the view on top of it.

## Getting started

Requires [Bun](https://bun.sh).

```bash
bun install
bun run dev        # Vite dev server: the Hearts demo and the game designer
bun run test       # vitest (happy-dom)
bun run typecheck  # tsc --noEmit
bun run build      # tsc --noEmit && vite build
```

The app has two pages: the Hearts demo at `/` (four seats over loopback channels), and the game designer at `/#designer`.

## Designing a game

```bash
bun run dev        # then open http://localhost:5173/#designer
```

The designer page is a text editor for the rule language, with a line-numbered editor, a list of problems (each with a hint), and the results of the game's own `Example:`s. It checks the text as you type and keeps it in your browser.

- Start from a sample: **Load sample** has Hearts, Color Match, Rent Day, Startup Simulator and Venom (`src/games/hearts.rules`, `src/games/color-match.rules`, `src/games/rent-day.rules`, `src/games/startup-simulator.rules`, `src/games/venom.rules`).
- A phrase the language doesn't know yet is flagged with the closest phrases it does know. **Copy for developer** copies a stub for a developer to implement; designers don't write code.
- A name the rules never defined (a zone, phase, move, card value or attribute) is flagged with the closest names they do define, for the designer to fix.
- **Play** is available once the rules read cleanly. It puts every seat on one screen, or one seat at a time when the table is too big for one (see below), with undo and restart; pick the player count first when the game allows a range. Editing the rules ends the playtest; Play starts a fresh game under the new rules.
- **Download** and **Upload** move the text to and from a `.rules` file.

**Board games.** A game can have a `Board:` section: a table of spaces for the pieces to loop round (a `color` column is drawn as a band on the space), a piece for each player, numbers each player holds (money, say) and dice. In a phase, each `A player may …` line becomes a button on that seat's panel, greyed with the reason on hover while it is not allowed. `When a piece passes …` and `When a player lands on …` rules run as pieces move. Each seat's panel in the playtest draws the board with its pieces and owners, a line with everyone's numbers, and the seat's buttons. `src/games/rent-day.rules` is a 2 to 8 player property-trading game written this way, with 108 examples:

```
Phase: playing
  A player may roll the dice.
    Only if they have not rolled this turn.
    Then:
      Roll the dice.
      Their piece moves forward by the roll.
  When a player lands on a tax space:
    They pay its tax.
```

**Things that change during play.** A game can say what its spaces and cards may come to have, and then rules and examples can use it:

- `Spaces can have houses and a hotel.` A plural noun is a count that starts at 0; "a hotel", or an adjective such as "poisoned", is a yes or no that starts at no. On the board, a space's counts are drawn as small squares (up to 4, then one square and the number). A yes-or-no the bank holds, like the hotel, is drawn as a red block; a yes-or-no the bank has no supply of, like mortgaged (`Spaces can be mortgaged.`), is drawn as stripes across the space. Pointing at the space lists them all.
- `Cards can be poisoned.` The same for cards: a card's face shows what is set, so a card's health and "poisoned" show on it without anything else written. `src/games/venom.rules`, a two-player card game, is built on this: a Viper poisons the other camp, and a poisoned card loses health each time its owner plays.
- `The bank has 32 houses and 12 hotels.` Supplies the game takes from and gives back to; the playtest shows what is left (`bank: 31 houses, 12 hotels`).

**Facts about players.** A game can say what a player may come to be or have: `Players can be in jail.` is a yes or no (that starts at no), `Players can have jail turns.` is a count (that starts at 0), and rules and examples then use them like a space's facts. What is true of a player is public, so every seat sees it: after the player's numbers on the line under the board (`p0 1,450 money · in jail · 1 jail turn`), in the title of the space they stand on, and as a ring round their piece on the board while any of their yes-or-no facts is on. A player who is out shows only `out`.

**Doubles.** `There are two six-sided dice.` makes `they rolled a double` (their own last roll this turn) and `they have rolled 2 doubles this turn`, `3 doubles`, `fewer than 3 doubles` available to the rules. A double needs exactly two dice: a game with another number of dice that says "double" gets an error on that line. An example fixes the rolls to come with `the next roll is 3 and 3` and, after it, `the roll after that is 1 and 2`.

**Cards that say what they do.** A board game may have `Cards:` and `Table:` sections too. A deck's `says` column holds sentences, each a line about the player who draws the card; "it" is the space their piece is on, read again for each sentence. A sentence the library doesn't know is flagged on the card's row. `They draw from the chance pile and do what it says.` puts the card at the bottom of the pile afterwards, unless it said `They keep this card in their kept cards.` A button gives a kept card back with `A Get Out Of Jail Free from their kept cards goes to the bottom of the pile it came from.`, which means the pile its deck starts in. Moves: `Their piece moves forward to Go.` passes every space on the way, Go included; `Their piece moves forward to the nearest station.` goes to the first one ahead; `Their piece moves back 3 spaces.` passes nothing. Money between players: `They pay 50 money to each other player.`, `They get 50 money from each other player.` and `They pay 25 for each of their houses.` In the playtest, the last card drawn is shown in the middle of every board, and kept cards follow the player's numbers (`p0 1,500 money · Get Out Of Jail Free`). A board game whose phases move no cards by hand shows no card table.

**Raising money.** A game can let players raise money and settle debts at any time:

- **Buttons any player may press.** `Any player may …` makes a button that every seat still in may press, whoever's turn it is; its `Only if` lines still decide. A seat that is out can't press it.
- **The turn.** An "Any player may" button never passes the turn by itself: an After line can't name it, and `they have … this turn` never counts it. Giving up on your own turn does pass it, because the player is out (`They are out.`).
- **Debts.** A payment that leaves a player below 0 notes whom they owe, a player or the bank; the latest such payment wins, and the debt lasts while they are below 0. Rules and examples can ask `they have less than 0 money`, `no player has less than 0 money` (players who are out don't count) and `they owe the bank`, and an example says `p0 owes p1` or `p0 owes the bank`.
- **Giving everything up.** `Everything they own goes to the player they owe.` hands a player their spaces, facts and all, and the cards they keep in view. To the bank, spaces become unowned and cards go under their own piles.
- **Percentages and yes-or-no facts on spaces.** Percentages round down: `They get 50% of its price.`, `They pay 55% of its price.` and `they have at least 55% of its price in money`. After `Spaces can be mortgaged.`, rules say `It is mortgaged.`, `It is not mortgaged.` and `Their spaces are no longer mortgaged.`, and ask `it is mortgaged`; an example says `Rose Lane is mortgaged`.
- **The bank and buildings.** `the bank has at least 4 houses`, `it gets 4 houses from the bank`, `one of its houses goes back to the bank`, `its hotel goes back to the bank`, `it has a house` and `no street of its color is mortgaged`.
- **In the playtest.** A debt follows the player's numbers (`p0 -4 money · owes p1`). A yes-or-no the bank has no supply of, like mortgaged, is drawn as stripes on every board. An "Any player may" button is live on every seat that may press it.

**Auctions.** A game can let players bid for a space, with the turn going round the bidders and then back to the player whose turn it was:

- **Amount buttons.** A button whose wording ends in "an amount" (`A player may bid an amount.`) carries a whole number of 0 or more. It is labelled without those words ("Bid"), and the playtest gives it a number box. "the amount" reads it: `the amount is more than the high bid`, `they have at least the amount in money` and `The high bid is the amount.`; such a line anywhere else is reported. A missing or bad amount is refused with "Say how much to bid." The button is live before anything is typed, judged by its other lines. Examples say `When p1 bids 50`.
- **Game numbers.** `The game has a high bid of 0.` declares a number that belongs to the game and says where it starts. Rules say `The high bid is 0.` and `They pay the high bid.`; examples say `the high bid is 50`. The playtest shows the game's numbers that aren't 0 on the bank line. A game number can't be called "amount", which is the number a button's press carries.
- **Everyone's flags.** A flag is a yes-or-no, like bidding. `Every player is bidding.` and `No player is the high bidder.` set one on every player at once; `no player is bidding` and `no other player is bidding` ask about everyone. Players who are out never count.
- **The flagged space.** After `Spaces can be up for auction.`, `They own the space that is up for auction.` and `The space that is up for auction is not up for auction.` reach the one space with the flag; none, or more than one, is an error. `No space is up for auction.` clears it from every space. A rule can also ask `someone owns it` and `it has no price`.
- **Interrupting a turn.** `The auction phase starts with the player on their left.` keeps the turn (its phase, whose turn it is, what they did and what they rolled) and runs the new phase's start lines. `Go back to the interrupted turn.` restores all of it exactly; one turn at a time can be interrupted. `the turn passes to the next player on the left who is bidding` skips players who are out or not bidding. A phase entered this way is not reported as unreachable.
- **In the playtest.** While a turn is interrupted, the seat status puts the name of the phase that holds it before the phase's hint (`auction — Your turn — Bid more than the high bid, or drop out.`). Only a phase with a hint gets the name, since one without shows its name in place of a hint already. The high bid shows on the bank line (`bank: 32 houses, 12 hotels · high bid 120`).
- **Rent Day** auctions a space the lander doesn't buy. A turn can't end, and a double can't roll on, while the space is unbought and not yet auctioned. A space nobody bids on stays with the bank: the lander can no longer buy it.

**Trading.** A game can let players swap spaces, money and kept cards, with the other player answering:

- **Picking another player.** A button whose wording ends in "another player" (`A player may trade with another player.`) picks a seat still in, other than the presser's. The playtest lists them in a banner after the press. `That player is the trade partner.` reads the pick; such a line anywhere else is reported. A missing or wrong pick is refused with "Pick another player to trade with." Examples say `When p0 trades with p1`.
- **Picking a space without "on".** A wording whose last part reads as a target picks a space: `A player may offer a space they own.` is labelled "Offer". Examples say `When p0 offers Mill Lane`. Two buttons in one phase that would read the same label are reported. Words that start like a pick ("a space …", or "a" and a kind of space) and look like a target phrase (close to one, or misnaming a fact), as in `a space the trade partnr owns`, but read no target, are reported on the button's line, and no button is made. Other words stay a plain button (`A player may pay a tax bill.`).
- **The player who holds a flag.** "the player who is proposing", or the flag alone when its name starts with "the" ("the trade partner"). `a space the trade partner owns` and `They pay the cash request to the player who is proposing.` reach them. `For the player who is proposing, they own every space that is asked for.` runs the rest of the line as that player: "they" and "their" are them. No player, or two, holding the flag is an error that names it. A misspelt one (`the trade partnr`, `the player who is propsing`) is named, with the closest flag.
- **Every, no and some.** `They own every space that is offered.`, `Every card that is handed over goes to their kept cards.`, `No card is handed over.`, `some space is offered`, `some card is claimed` and `their kept cards are not empty`. A card's flags go with it from zone to zone.
- **Game numbers** work in conditions: `the cash offer is more than 0`, `they have at least the cash request in money`.
- **A phase that starts with them.** `The trade phase starts with them.` interrupts the turn as the auction does, and the player who pressed stays current.
- **In the playtest,** the player picker, a tag on each striped space, laid over its color band so a name of two lines still shows ("offered" with "mortgaged"), kept cards marked with their flags (`Get Out Of Jail Free (handed over)`), and the cash numbers on the bank line.
- **Rent Day** trades on the proposer's own turn, never while anyone owes. A street whose color has a building can't be traded, and a mortgaged space trades as it is.

**Card games with turns.** A card game can keep counters, give each turn a budget, and play in rounds from a start player:

- **Counters without a board.** Lines indented under `Players:` give each player a counter with no `Board:` section: `Each player has 7 capital that everyone can see.` and `Players pay with capital.` Facts and game numbers work there too.
- **A budget each turn.** `Each player has 3 actions each turn.` sets the counter back to 3 as each turn starts. `They spend 1 action.` takes from it and `Their actions go back to 0.` empties it. Counters can be named in the singular (`they have at least 1 action`).
- **Turns as steps.**
  - "they" is the player whose turn it is in a phase where players take turns, so `When they have less than 1 action, go to bench cleanup.` reads.
  - In a phase where players take turns, a plain rule or a start line that rolls the dice records the roll as the current player's.
  - `The turn passes to the left.` ends a turn with no press, and runs no `When this phase starts:` lines.
  - `The start player is chosen at random.` in Setup picks who starts; without it, p0 does.
  - Every turn starts by itself: counters for each turn are reset and the `When a player's turn starts:` lines run. Each round starts with the start player and runs the `When a round starts:` lines.
  - `When this phase starts:` under the first phase is flagged, since those lines run only on the game's first turn.
- **`In every phase:`** holds rules that fire whatever the phase, such as a market that refills whenever it runs short.
- **The End.**
  - `The game ends when the crash pile is not empty and the round is finished.` waits until the last player of the round has had their turn.
  - `Each player scores 1 point for every 5 capital.` rounds down.
  - `The highest score wins, and tied players share the win.` Examples say `Then p0 and p1 win`.
- **Cards.**
  - A button that picks a card can ask for and pay the number the card shows: `Only if they have at least the card's cost in capital.` and `They pay the card's cost.`
  - `A stack called junior software devs that never runs out:` makes a card each time one is wanted: `A new Junior Software Dev goes to their bench.`
  - A blank cell in a card table is left out, so the card has no value for that column.
  - Rows and queues: `Move the bottom card of the open idea pool to the box.`, `When the growth market has the market crash:`, `Move the market crash from their research to the crash pile.`, `Deal up to 3 cards from the seed deck to their research.` (it takes what's there), `Deal 1 card from the seed deck to each backlog.` and `The market crash goes into the bottom fifth of the growth deck.`
  - Examples check the order of a row with `…, in that order` and where a card lies with `the market crash is among the bottom 8 cards of the growth deck`.
- **Startup Simulator (slice 4)** plays the table, money and turns (recruiting, drafting, Research, Cleanup and the Market Crash), and builds products: the Board (Greenlight, Assign, Reassign, Recall and Dismiss), Income with Market Share and Salaries, the Engine, Launch, Pivot, Layoff / Source and the score's Val and Market Share. It also builds Tier 2 and 3 products, with their Tags and Licenses, Domain Expertise, Matching Leads, Stalled projects and the hybrid Launch, and hires the Diva and the Engineer with their traits. It now runs products with an ops team, whose Blue and Red bandwidth must cover their maintenance at Income or the player switches some off, earning nothing from them; flex Seniors and the Fixer work in a mode their owner declares; the Hacker and the Growth Hacker add Bugs, which cost $1 of revenue each and block a Launch, and QA staff clean them; the Growth Hacker sits on its product for $3 more, and the Architect stops its Bugs; and after the last round each player has a final Ops check before the score. Its 190 examples pin rulings 3, 4, 5, 7, 8, 9, 10, 12, 13, 14, 18, 19, 20, 21, 24 and 25.
  - It still leaves out XP and the Specialists' effects but the Growth Hacker's, the traits of the Veteran and the Full Stack Ninja, Face-Down Greenlight and the Audit, Partners' free License, Patent Trolls, badged Juniors and the Visionary as leads, the Events and Crunch Time, Dividends and the Consultant, Integration, selling and poaching, and Hype and Scandal. Each comes in a later slice.
  - The last Milestone check (§12.3) is still left out too.
  - No badge comes from slice 4's rules: the red labels on its cards are still only Stalled and Efficient in ops.

**Buttons that pick cards.** A button can ask the player for a card, for a card and the card it goes to, or for a set of cards, and can cost a number each player has each turn:

- **The forms.**
  - `A player may buy a card from the shop to their stash.` with a cost line under it is a button that asks for a card from the shop. The card moves to the stash before the `Then:` lines.
  - `… a card in their stash` picks one card and moves nothing by itself.
  - `… a card from their stash to a card in their case` picks a card and the card it goes to, and moves nothing by itself: its `Then:` lines say `Move it to their case.`
  - `… some cards from their stash` picks one or more. From a pile only the top card can be taken, so such a set is always one card.
- **What the lines call them.** The picked card is "it" and "the card", the card it goes to is "the target card", and a set is "the picked cards": `Move the picked cards to the pile.` and `Only if they picked at most 2 cards.` An `Only if` line can't read a card the player can't see, such as one in the other player's stash: a refused press would tell them what it is.
- **Card moves.** A line with no cost that reads exactly "a card from … to …" is still a card move, moved by dragging. A free button that moves a card is written `A player may sell a card in their stash.` with `Then: Move it to the pile.` under it. `It costs 0 actions.` under a "from … to …" line makes a button too, but one that counts as an action, which slice 7's Veto can answer.
- **Costs.** `It costs 1 action.` goes under any button:
  - it refuses with "they have at least 1 action" before every `Only if`;
  - it spends before the `Then:` lines;
  - only a number each player has each turn can be a cost.
- **Examples** name the card: `When p0 buys the Ruby`, `When p0 shows the Opal to the Ruby` and `When p0 trades the Ruby and the Opal`. When two buttons could take the card, the example says where it goes (`When p0 buys the Ruby to p0's case`) or where it comes from (`When p0 hires a Sales Rep from the open job market`), or which zone holds the card it goes to (`When p0 hires a Potter to the Vase in p0's shelf`), and the error says which would tell them apart.
- **In the playtest,** pressing the button lists the cards it may pick under the buttons, a refused one greyed with the reason on hover. A set ends with Confirm, and Cancel closes the list.
- **Clicking.**
  - Click a card on the table to see the buttons that take it.
  - A button that picks cards takes clicks on the table as well as on its list.
  - A set ends with Confirm, or with a click on the card they go to.
- **Startup Simulator** is played by picking cards.

**Cards on cards, values and totals.** A card can sit on another card, a section can work out a number or a yes-or-no for each card, and a rule can add a number up over cards or run once for each card:

- **Cards on cards.**
  - A zone line each player has that ends ", where every card is on a card" holds cards that each sit on a card: `Each player has a development team row that everyone can see, where every card is on a card.`
  - A button that picks a card and the card it goes to puts it there with `It goes to their development team, on the target card.` A set goes with `The picked cards go to their development team, on the target card.` Its `Only if` lines can ask `it is not on the target card`.
  - Every move takes a card off the card it sat on. A rule that moves a card says where the cards on it go: `Every card on it goes to their bench.` `Every card on it is onboarding.` sets a flag on each of them.
  - After every Setup line, press and rule, and every line that starts a phase or a turn, the table is checked. Each card in a marked zone must sit on a card, no card anywhere else may, and the card it sits on must still be in a zone of the same player's that everyone can see.
  - A rule that moves a card and forgets the cards on it is refused on the line that did it (the button, card move or rule, or a Setup or start line), and the game stays as it was before the press: `The Architect in p0's development team is on the Dating App, which is now in the open idea pool. Move the cards on a card along with it.` An example's `Given` that leaves the table like that is refused at that `Given`.
- **Numbers on cards.** `Cards can have blue cubes, red cubes, new blue cubes and new red cubes.` declares numbers that start at 0 on every card. Rules change them with `Its blue cubes go up by its new blue cubes, up to its blue cost.` (the cap is optional) and `It loses its new blue cubes.` Rules ask about any number on a card: `its blue cubes are at least its blue cost` and `its salary is more than 0`.
- **Values worked out for cards.** A section named after a value says what it comes to for each kind of card. Like `Rent:`, each line overrides the ones before it for the cards it fits:

  ```
  Blue output:
    A software card's blue output is its output.
    A flex card's blue output is its output.
    An onboarding card's blue output is 0.
  ```

  - A card that no line fits keeps what the value starts from: its own cell, under a section named after a column, and 0 for any other value, so a Junior QA Tester's blue output is 0.
  - A section of `Only if` lines works out a yes-or-no: under `Feature complete:`, `Only if its blue cubes are at least its blue need.` and `Only if its red cubes are at least its red need.` make `it is feature complete` true for a card that meets both. A card that lacks a number its lines read isn't that kind of card, so the answer is no.
  - A section named after a column, such as `Salary:`, refines that column.
  - Every rule that reads a card's number or yes-or-no reads the worked-out one. A value worked out from itself, directly or through another value, is reported on the line that asked. A rule or example that would change a worked-out value is refused on its line when the rules are read.
- **Totals.** `the total salary of the cards in their development team and their ops team`, `the total blue output of the cards on it` and `the total cost of the picked cards` add a number up. A card without that number counts as 0. `the cards in their operations whose rev is more than 0` keeps only some cards. Rules say:
  - `They get the total rev of the cards in their operations.` and `They pay the total cost of the picked cards.`;
  - `Only if they have at least the total cost of the picked cards in capital.`;
  - `A card's blue team output is the total blue output of the cards on it.` in a section that works out a value.
- **For each card.** `For each card in their development, its blue cubes go up by its new blue cubes.` runs the rest of the line once for each card that was there when it began, in order, as "it". `For each card in their operations whose rev is more than 0, they get 1 market share.` runs it once for each card that passes the filter. The rest of the line is one plain effect: no `If …` or `For each …` inside it.
- **Going to a phase.** `Go to commit.` moves on to the named phase and runs its `When this phase starts:` lines, so a phase that only works at its start can hand on to the next one. A chain of `Go to` lines that comes back to a phase it went through is refused, in words that name the phases.
- **Rows.**
  - `Deal up to as many cards as they picked from the talent deck to their scouting.` deals one card for each card the button picked, or what the deck has.
  - `Move their scouting to the left end of the agency row.` puts the cards at the row's left end, in the order they sat.
  - With `When the agency row has more than 4 cards: Move the top card of the agency row to the open job market.`, cards that come in push the rightmost cards out one at a time: two cards push out the old 4th, then the old 3rd.
- **The score.** `Each card in a player's operations scores its val.` (a card without one scores 0) and `Each player scores 2 points for each market share.`
- **Examples.**
  - `Given the Dating App in p0's development has a Junior Software Dev and the Architect on it` puts those cards on it, in the player's zone marked for cards on cards.
  - `Then the Dating App in p0's development has the Architect on it` and `… has no cards on it` check what sits on a card.
  - `the Dating App in p0's development has 4 blue cubes` sets or checks a number, and `the Architect in p0's bench is onboarding` a yes-or-no. A check reads a worked-out one too: `the Dating App in p0's development is feature complete`.
- **Startup Simulator** builds its Board this way.

**Choices and comparing cards.** A button's press can carry choices the presser makes, and a rule can compare a card with another card, in anyone's zones:

- **A player of their choice.** The `Then:` line `They pay the license to another player of their choice who has a card in their operations whose tag is the card's requires.` runs `They pay the license to that player` about a player the presser picks: one of the others still in who meets the clause after "who". The clause is read about each of them as "they", so "their operations" are theirs. `Only if` lines right under the line say when it is asked at all: `Only if they have no card in their operations whose tag is the card's requires.`
- **One of a block of options.** `They choose one:` starts a block. Its own `Only if` lines come first and say when it is asked at all. Then each option is a line ending in `:` (`Cut 2 blue:`), with the `Only if` lines that must hold for it and the lines it runs under it.
- **Filled in, or asked.**
  - A press is judged on its cost and its `Only if` lines first, then each choice on the state it is pressed in.
  - A choice with one player who qualifies, or one option that holds, is filled in.
  - One with several must be named, or the press is refused with its prompt: `Pick who to pay the license to: p1 or p2.` or `Choose one: cut 2 blue, cut 2 red or cut 1 of each.` A choice named with an answer that isn't one of its own is refused the same way, even when it has only one; an option's capitals don't matter.
  - A choice with no one who qualifies, or no option that holds, is not asked, and its line does nothing. So a rule that must refuse says so in an `Only if` line.
  - Replaying the log fills in the same choices.
- **Where a choice can sit.** Only in the `Then:` of a button that picks one card (alone, or with the card it goes to) or picks nothing. Never inside `If …,` or `For …,`: its condition goes under it as an `Only if` line.
- **Comparing cards.**
  - After "whose", a test compares a column with a value or with another card's: `whose trait is Ego`, `whose tag is the card's requires` and `whose sector is the card's sector`. A blank cell matches nothing, on either side, so a card that requires nothing is never given it by a card that provides nothing.
  - Rules ask `they have a card in their operations whose …` (the player the line is about), `some player has a card in their operations whose …` (any player still in) and `the card has no also requires` (a blank cell).
  - `Every card on it whose trait is Ego goes to the open job market.` moves only the cards on it that pass.
- **The card a rule is about.** A section that works out a value, or a button's `Only if` lines, can ask `it is a Senior Developer card`, `it is not a Tier 1 card`, `it is in an ops team`, `its blue need is 0`, `some card on it is leading software` and `no card on it is leading hardware`. A number can go down by another: `A card's blue need goes down by its cut blue cubes.`
- **Examples** name a press's choices after it: `When p0 greenlights the Server Farm, paying p2` names the players the press asks for among several, in line order, and `…, choosing cut 2 red` names an option. A player who alone qualifies is filled in and needs no name, though an example may name a player for every choice instead.
- **In the playtest,** a choice with one answer is filled in. A press whose choice has several answers opens it under the buttons, one question at a time:
  - `Pick who to pay the license to (requires Commerce)` with a button for each player; the bracket names the column of the picked card that the choice compares, and its value;
  - `Choose one` with a button for each option.

  The press goes once the last is answered. A greyed answer says why on hover. Cancel, another button or another tab sends nothing.
- **Startup Simulator** plays slice 3 this way: the Greenlight's License to a provider of each missing Tag and the cut Domain Expertise gives, which a hybrid's owner chooses; the sections that work out Matching Leads, Stalled and Fully led; and the Pivot that fires the Diva.

**Values about players, flags on groups, cards that join cards and steps before the score.** A section can work out a value for each player, a group of cards can keep only the ones that are so, a rule can run when a card joins a card, a zone can hold cards on cards and cards on none, and each player can take a step before the score:

- **Values about a player.** A section whose lines start "A player's" works out a value for each player, from 0: under `Red force:`, `A player's red force is the total red work of the cards in their crew.` adds up each card's red work as every rule reads it, and a card without one counts as nothing. Rules compare one of their values with another of theirs or with a whole number: `their red force is at least their red load`, `their red load is more than their red force`, `their red force is 2`, `… is at least 3` and `… is more than 1`. A section named after a number each player has, or a fact about players, is refused. Examples check one with `Then p0's red force is 2`, and a miss says `Expected p0's red force to be 3, but it is 2.`
- **Groups that are or are not so.** After a group of cards, `that are resting` or `that are not resting` keeps only those cards, and `and whose …` can follow it: `A player's red load is the total red need of the cards in their workshop that are not resting.` and `the cards on it that are tired and whose skill is more than 1`. The cards on a card and the picked cards take it too.
- **A card in a zone that is so.** Rules ask `they have a card in their workshop that is not resting` (with `and whose pay is the card's pay` after it if need be), `they have no card in their workshop that is resting`, `some card in their workshop is resting` and `no card in the hall is tired`. `Every card in their workshop is not resting.` takes the flag off each card there.
- **A rule about a card that is so.** `When a card in an idle is tired:` runs its lines once for each such card in any player's idle, as "it": `It is not tired.` `When a card in the hall is tired:` does the same for a zone in the center.
- **Going down.** `It loses 1 crack.` takes 1 off a number on the card. A number never goes below 0, and once it is 0 the card has none, as after `It loses its cracks.`, so rules ask `its cracks are 0`. A total can be shared among cards: `The cards in their workshop lose cracks between them, up to their mend, first card first.` reads the player's mend once, and each card in turn loses as many as it has, until the mend is used up.
- **Three value lines.** In a section that works out a value for each card, a value goes up by the total of the cards on it (`A card's worth goes up by the total skill of the cards on it.`), keeps a floor (`A card's worth is at least 0.`) or follows a flag with another of the card's numbers (`A tired card's rest work is its skill.`). A value with nothing so far stays nothing as it goes up or keeps a floor: a hand has no worth, and these lines don't give it one.
- **Joins.** `When a Smith card joins a card in a workshop:`, under a phase or under `In every phase:`, runs each time a line puts a Smith on a card in any player's workshop: "they" is the player whose zone the Smith went to, "it" the Smith and "the card it joins" the card it went on, so `The card it joins gains 1 dent.` The lines that put cards on a card tell one join for each card, in the order they put them there. A `Given` never tells one, and nor does "staying on it" below.
- **Some cards on cards.**
  - `Each player has a yard row that everyone can see, where some cards are on cards in their shelf.` holds cards that sit on a card or on none, and names the zone of the cards they sit on: a card in the yard may sit only on a card in the same player's shelf. `…, where some cards are on cards` names none, and `…, where every card is on a card in their shelf` names one for a zone whose cards all sit on cards. Only a zone everyone can see may say either, and the zone it names must be one each player has that everyone can see.
  - Lines place cards by a flag, not by a kind of card: `The picked cards that are clinging go to their yard, on the target card.`, `The picked cards that are not clinging go to their yard.`, `Every card on it that is clinging goes to their yard, staying on it.` (the card moves along, still on it) and `Every card on it that is not clinging goes to their yard.` A button can ask `it is on a card` and `no picked card is clinging`.
  - `Given the Vase in p0's shelf has a Smith on it` puts the Smith in the zone that names the shelf, the yard.
  - A `Given` puts a card on a card in a zone where only some cards are on cards only when that zone names the zone of the cards it sits on (`…, where some cards are on cards in their shelf`); without it the card goes to a zone where every card is on a card, or the `Given` is refused.
  - An example's press that names the card its cards go to presses the button whose zone holds that card: with a Vase in p0's workshop and a Statue in p0's shelf, `When p0 hires a Potter to the Vase` and `When p0 hires a Smith to the Statue` each press their own hire. When both zones hold a Vase, the example names the zone: `When p0 hires a Potter to the Vase in p0's shelf`, or `… from the hall to the Vase in p0's shelf`.
- **Steps before the score.**
  - `Before the score, each player has the final count, in turn from the start player.` in the End: once the End's condition holds, and before the game is scored, it goes to the final count phase, which must be a phase where players take turns. From the start player, each player still in takes the final count in turn: the phase's `When this phase starts:` lines run about them, and `The final count passes to the left.` hands it on. After the last player the game is scored.
  - No turn or round starts during the steps, so `When a player's turn starts:` lines don't run and no number is reset for a new turn.
  - The final count phase can't hand the game to another phase: a `Go to …` line under it, even inside an `If …` line or an option, and an After line are refused on their own line. While the steps run, `The turn passes to the left.` stops with a message that says to write `The final count passes to the left.` instead, and that line in turn works only during the steps. When no line passes the final count on, the End's line gets a warning, since the first player's step would never end.
  - An example reaches the steps as a game does, by playing to the end of the round: with the done pile not empty and p2 the last to play in the round, `When p2 stops` is followed by `Then the phase is final count` and `And it is p0's turn`. `Given the phase is final count` alone starts no steps.
- **In the playtest,** the values about players that add up cards in zones everyone can see go into every seat's view, and a pair of them that a button compares shows as a gauge under the player's line.
- **Startup Simulator** plays slice 4 this way: `A player's blue supply is the total blue bandwidth of the cards in their ops team.`, set against the maintenance of their products that are not offline; the ops check's `Every card in their operations is not offline.` as it starts; the Hacker's `When a Spaghetti Code card joins a card in a development:`; the ops team, `…, where some cards are on cards in their operations`, where the Growth Hacker sits on its product; Ops QA's shared total, `The cards in their operations lose bugs between them, up to their qa supply, first card first.`; and the final check before the score, `Before the score, each player has the final check, in turn from the start player.` The declaration (`Declare a card in your ops team`, then `Choose one`), the ops check (`Switch off …`, `Switch on …`, `Confirm the products online`), Ops QA's `Clean a card in your operations` and the final check are played under the seat's buttons, or by clicking the card.

**Counting, targets in several zones, decks that shuffle back, and rules about a player.** A value can count cards, a button's target card can be in one of several zones, a deal can shuffle a discard back into its deck, and a rule can be about a player:

- **Counting.** `A card's crew size is the number of the cards on it.` counts the cards on a card. `A player's craft kinds is the number of different craft values among the cards in their crew and their idle.` counts the kinds of one value among a player's cards. Rules ask `they have at least 2 cards in their workshop and their crew whose wage is more than 1` and `it is a card whose craft is gold` (a section named `Gilded:` with that `Only if` line makes a flag). Examples check them: `Then the Vase in p0's workshop has 2 crew size`, `And p0's craft kinds is 3` and `And the Smith in p0's crew is gilded`. The playtest does not show a player's counts.
- **A card's numbers.** In a section that works out a value for each card, a value goes up by another of the card's numbers (`A card's polish goes up by its worth.`) or by two of them multiplied (`A card's team red goes up by its boosters times its red makers.`, where a job's boosters are the gold hands on it and its red makers the cards on it that make red).
- **Beyond the card.** A section or an `Only if` line can ask about the player who owns the card and about the card it sits on: `Only if its owner has a card in their idle that is tired.` and `Only if the card it is on is a Statue card.` The playtest never shows either on a face.
- **A target in several zones.**
  - `A player may coach a card from their stash to a card in their workshop, their crew or their idle.` lets the target card be in any of the zones. The playtest offers each zone's cards in turn, and a zone written twice offers its cards once.
  - The lines read the target: `Only if the target card is not tired.`, `If some card on the target card is tired, the target card is tired.` and `The target card gains 1 drill.` (also `no card on the target card is tired`). `Every picked card is not tired.` takes a flag off each card picked.
  - An example names the target's zone when it must: `When p0 coaches the Vase to the Potter in p0's idle`. Without it the press takes the first of the zones, as written, that holds a match.
- **Decks that shuffle back.** `Deal up to 3 cards from the pile to their list, shuffling the done pile into it when it runs out.` deals as `Deal up to` does, a run of the deck at a time in slot order. Only when a card is still owed and the pile is empty does the whole done pile go back into it and get shuffled, in the game's own random order, so a replay deals the same cards. When both are empty it deals what it has and stops.
- **A number given to some cards.** `The cards on it that are tired gain 1 drill.` gives each of them one, and `Up to its cracks of the cards on it that are not tired gain 1 drill, first card first.` gives one to as many cards as the card has cracks, first card first.
- **Rules about a player.**
  - A rule asks each player in turn, starting with the player whose turn last started, in a game whose turns start by themselves: one with a start player, a number each player has each turn, lines that start a round or a turn, or an End that waits for the round. Before any turn has started, and always in a game whose turns never start by themselves (Rent Day's), it asks in seat order. `When a player has at least 3 coins:` and `When a player's list has fewer than 2 cards:` take any condition said of one player, read as "they have …" and "their …". A problem in one is reported with the designer's own `When` line, never the words said of "they".
  - The game waits for such rules in `In every phase:` before it is scored, as it waits for rules about a card: it is scored only once none of them has anything left to do. Until then no turn starts and no other rule runs, even when the move that decided the game also passed the turn, so a claim that move meets is made from the seat whose turn ended the game. One written under a phase is not waited for.
  - A line can test two conditions: `If it is a Vase card and the scrap is empty, they get 1 coin.`
- **A step of a choice for each card** needs one new line, `Every card on it that is … is …`; the rest is written with lines already there. The sorting step of the fixtures starts with `The sorting phase starts with them.`; `When a card in an idle is single:` settles a card with nothing to choose, and `Every card on it that is eager is keen.` sets a flag on the cards on a card that are so. `A player may keep red on a card in their idle.` is the choice for the rest, and `When no card in their idle is torn:` ends the step with `Go back to the interrupted turn.`

**A table too big for one screen.** When a game's zones don't fit the table, the playtest shows one seat at a time, with a tab for each seat:

- **The tabs.** A tab reads `p1`, or `p1 — to act` for the seat that must act. The tabs jump to the seat that must act when the turn moves on, Undo included; in between, any seat's tab can be opened to look at its table.
- **The table.** The shared zones wrap onto lines across the top, each named above it. The seat's own zones that only it can see run along the bottom, its public zones in the band between those and the shared zones, and the other seats' zones are left off. A row's cards stand side by side, so every face can be read; a longer row squeezes them to stay in its place.
- **The other seats.** Every player's line shows their numbers, how many cards each of their zones holds, and the start player: `p0 7 capital, 3 actions, 0 market share · bench 3 · backlog 1 · research 0 · development 0 · operations 0 · development team 0 · ops team 0 · scouting 0 · start player`. Under a player's line go their gauges: each pair of their values that a button waits on (`Only if their blue supply is at least their blue demand.`) reads `Blue supply 2 / demand 1`, and is marked `(short)` in orange while the first is below the second. Only values the rules add up over zones everyone can see are shown.
- **Faces.** A card face shows its name and its first three columns, so a card table puts its key columns first: Startup Simulator's product tables put tier, tag and requires first. Pointing at a card shows all of it under the table: `Architect — cost 7 · skill software · output 3 · salary 2 · role Senior Developer · trait Clean Code`.
- **The Board.**
  - The seat's cards that everyone can see sit in a band between the shared zones and the seat's own strip.
  - A card that sits on a card hangs under it.
  - In a zone where only some cards sit on cards (`…, where some cards are on cards in their operations`), a card that sits on one hangs under it, and the rest stay in the row: the Growth Hacker under its product.
  - A number kept on cards shows under a card against the column whose name starts with the same words: `blue cubes` against `blue cost` reads `Blue 3/6`. One named with words before another's shows beside it when it isn't 0: `Blue 3/6 +4 new`.
  - A value a section works out from a column (`A card's blue need is its blue cost.`) is read in that column's place: `Blue 3/4 +2 cut`.
  - A card read against columns also names its words, then its flags: `Neobank (tier Tier 2, tag Crypto, requires Commerce, sector FinTech, stalled)`.
  - A worked yes-or-no that a value line turns on (`A stalled card's blue team output is 0.`) shows in a red label on the card's corner and in the round brackets after its name, where it holds.
  - The corner label also names the flags a card keeps (`red mode`, `offline`), before the worked ones, and its counts that no column reads (`2 bugs`).
  - A card that a player's total leaves out by a flag (`… that are not offline`) is drawn faded.
  - Under each seat's line, its public cards are listed by zone, with what sits on each: `development: Dating App (tier Tier 1, tag Social, sector Consumer) [Blue 4/6, Red 0/0] with Junior Software Dev and Architect · operations: To-Do List (tier Tier 1, tag App, sector Concept) [Blue 0/4, Red 0/0] · ops team: QA Engineer`.
  - The counts that no column reads also go in a card's square brackets there: `[Blue 0/4, Red 0/0, 1 bug]`.
  - The bank line under the seats' lines shows the game's own numbers: Startup Simulator's `license 3` is the License price.
- **Startup Simulator** plays this way.

**Saying a button was pressed.** `they have rolled this turn` means any roll button was pressed, so a game with `A player may roll the dice.` and `A player may roll for a double.` reads "rolled" as either. To name one, write its whole wording in the past: `they have rolled for a double this turn`.

**Buttons that pick a space.** A button whose line ends in "on a …" (`A player may build a house on a street they own.`), or whose words after the verb are the pick themselves (`A player may offer a space they own.`), asks the player to pick a space. A target with a mistake in it is reported either way, never made a plain button. In the playtest, pressing it puts a banner with the question and a Cancel button above the board; the streets the player may pick are outlined, the ones the rules refuse are dashed (click one to see why) and the rest fade. A button with nothing to pick, because the player owns no street, say, stays greyed and says so on hover.

**Column sections.** A section named after a column of the board table (`Rent:`) says what "its rent" means for each kind of space, so a station's rent can grow with the stations its owner has while a street's comes from its houses:

```
Rent:
  A street's rent depends on its houses and hotel.
  A street in a full set with no buildings has double rent.
  A station's rent is 25, 50, 100 or 200 when its owner has 1, 2, 3 or 4 stations.
```

A taste of the language (from `src/games/color-match.rules`):

```
Game: Color Match
Players: 2 to 5

Phase: playing
  Hint: Play a card matching the color or number, or draw one.
  Players take turns.
  A player may play a card from their hand to the discard pile.
    Only if one of:
      the card has the same color as the top card of the discard pile
      the card has the same number as the top card of the discard pile
```

## Adding a phrase (developers)

A line the library doesn't know comes with **Copy for developer**, a stub ready to paste:

```ts
// Requested by a designer — game "Hearts", line 15:
//   "Shuffle the deck twice"
library.effect('shuffle {zone} twice', (env, [a1]) => {
  throw new Error('not implemented yet');
});
```

1. **Pick the file** in `src/engine/core/lang/library/`. Each has one `register…Phrases(lib)` function, a chain of `lib.<kind>(pattern, fn)` calls: `setup-phrases.ts` (`registerSetupPhrases`: Cards: and Table: lines), `flow-phrases.ts` (`registerFlowPhrases`: zones, effects, turn order, scoring, winners), `move-phrases.ts` (`registerMovePhrases`: the card being moved), `standard-deck.ts` (`registerStandardDeckPhrases`: suits and ranks), `example-phrases.ts` (`registerExamplePhrases`: Given/When/Then) or a game's own file such as `hearts.ts`. A new file's register function goes in `REGISTRARS` in `library/index.ts`.
2. **Paste the stub into the chain** as `.effect('shuffle {zone} twice', (env, [zone]) => …)` and write the body: a pure function of `env` (state, compiled game, seats) and the arguments, already resolved from `{zone}`, `{card}`, `{int}`…; callback types are in `lang/types.ts`. Randomness only through `state.rng`.
3. **`needsMove`.** A condition or effect that reads the move being judged (`env.move`, or `currentMove`/`movedCard` from `library/support.ts`) is registered with `{ needsMove: true }`, so the compiler only allows it under `A player may …`.
4. **Designer problems throw `RuleError`** (`lang/diagnostics.ts`) in plain words, like `throw new RuleError('There are no cards left in the deck.')`: the designer sees that message on the line. Anything else thrown is reported as a bug in the phrase.
5. **Add a unit test** in the file's `.test.ts`: set up cards with `fixtureCard`/`fixtureState`/`fixtureEnv` from `lang/testing.ts` and run the sentence as a designer writes it, `runPhrase(createDefaultLibrary(), 'effect', 'shuffle the deck twice', env)`.

## Describing a table

```ts
import type { TableDef, Placement } from '@/engine/core/table-def';

const table: TableDef = {
  players: ['me'],
  zones: [
    { id: 'deck',    layout: 'pile', transform: { x: -400, y: 0 }, visibility: 'secret' },
    { id: 'hand',    layout: 'fan',  transform: { x: 0, y: 300 }, owner: 'me', visibility: 'owner', ordering: 'free' },
    { id: 'discard', layout: 'pile', transform: { x: 400, y: 0 }, visibility: 'public' },
    // a solitaire foundation: only accepts a same-suit ascending run
    { id: 'foundation', layout: 'pile', transform: { x: 400, y: -300 },
      capacity: 13, accept: { rule: 'sameSuitAscending' } },
  ],
};

const placement: Placement = {
  cards: [{ id: 'AS', zoneId: 'deck', faceUp: false, faceKey: 'AS', data: { suit: 'S', rank: 1 } }],
};
```

Render it with the React bridge:

```tsx
<CardTable
  tableDef={table}
  placement={placement}
  onDrop={(intent) => { /* apply your rules; update state */ }}
  onCardClick={(id) => { /* e.g. flip */ }}
/>
```

turnhout emits a `DropIntent` when a card is released; **you** decide whether/how to mutate your state. Flip is declarative via `CardState.faceUp`.

## Zone layouts & rules

- **Layouts:** `pile`, `fan`, `row`, `grid`, `free` (per-card `data.x`/`data.y`).
- **Accept-rules:** reference a registered rule by name. Register the starter set (or your own) on a `RuleRegistry`:

```ts
import { RuleRegistry } from '@/engine/core/rules';
import { registerStarterRules } from '@/engine/core/rules-library';

const registry = registerStarterRules(new RuleRegistry());
registry.register('myRule', ({ card, top, zoneCards }) => /* boolean */ true);
```

Validate a table before use with `validateTableDef(tableDef, registry)`.

## Project layout

```
src/
  engine/
    core/     pure engine: scene/table-def types, layout, zone-geometry,
              rules(+library), hittest, tween, choreography, diff,
              derive-scene, table-model reconciler,
              game-state, game-engine, moves(+library), rng,
              flow(+registry, library, validation)
      lang/   designer rule language: outline parser, phrase library,
              compiler, example runner, engine build
    net/      GameServer, GameSession, Channel protocol, loopback channel
    pixi/     PixiTable view, card sprites, face-texture cache,
              standard and text card faces
    input/    pointer tracker, KMT state machine + parser (Pixi federation off)
    react/    <CardTable> declarative bridge
  games/              Hearts, Color Match, Rent Day, Startup Simulator and Venom, written in the designer language
  pages/
    table-demo/       deck + demo page
    hearts-demo/      four-seat Hearts over loopback channels
    net-demo/         net-layer demo game
    designer/         the designer page: editor, problems, examples, playtest
  utils/init-app.ts   app wiring (registry, camera, input, deriveScene)
docs/superpowers/      design specs & implementation plans
```

## Conventions

- **Card world size:** `CARD_WIDTH = 100`, `CARD_HEIGHT = 140` (world units).
- **`core/` is pure:** no `pixi.js`/`react`/`@ue-too/*`/DOM imports; no `Math.random`/`Date.now` (jitter uses an id-hash; time is injected).
- **Interaction contract:** the engine emits intents and never mutates consumer state.

## Roadmap

turnhout is built as dependency-ordered sub-projects, each with its own design spec and plan under `docs/superpowers/`:

1. **Semantic zone model + serializable table schema** — ✅ shipped (this is what the sections above describe).
2. **Authoritative game-state + move engine** — ✅ shipped: full-truth state, deterministic seeded moves, reducer, undo and replay.
3. **Per-player view projection** — ✅ shipped: `deriveScene(state, viewer)` hides unseen faces and private zones.
4. **Net sync core** — ✅ shipped: client move → server validation → per-player projected views, over a transport-agnostic channel (loopback in-process).
5. **Rule engine** — ✅ shipped: declarative turn/phase flow, triggers and end conditions.
6. **Designer rule language** — ✅ shipped: games written as readable text, example checks, and an in-browser playtest page (see [Designing a game](#designing-a-game)).
7. **Tokens and meeples** — ✅ shipped: non-card pieces, in the engine and in the designer language, in the seven slices of [the board games overview](docs/superpowers/specs/2026-10-15-board-games-overview-design.md): around the board, sets and buildings, doubles and jail, Chance and Treasury cards, raising money, auctions, and trading (buttons that pick another player, space picks without “on”, the player who holds a flag, and every, no and some over flags). Rent Day plays the whole game.

**Next:**

- **Online play** — a real transport and rooms on top of the net core (a Cloudflare Durable Object per room is the intended fit).

## Tech stack

TypeScript · Vite · React 19 · PixiJS 8 · Bun · vitest + happy-dom · `@ue-too/*`.
