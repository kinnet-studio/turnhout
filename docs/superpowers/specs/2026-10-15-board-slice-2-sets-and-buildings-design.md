# Board Games, Slice 2: Sets and Buildings

**Date:** 2026-10-15
**Status:** Draft, reviewed; pending the user's approval
**Part of:** `2026-10-15-board-games-overview-design.md`. Its decisions, calls, anti-goals and constraints
apply here.
**Builds on:** slice 1 (`2026-10-15-board-slice-1-around-the-board-design.md`), merged to `main` as PR #8.

## What this slice is

Rent Day gains its economy:

- Owning a full color set doubles a street's base rent.
- Players build houses, then hotels, on full sets, evenly, from a bank with a limited supply.
- Rent grows steeply with buildings.
- Stations and utilities charge more the more of them their owner has.

To get there, the language gains four general building blocks:

- **Facts that change during play,** shared by spaces, cards and players. A street's houses, a card's
  health or "poisoned", and later "in jail".
- **Buttons that pick a target on the board.** "Build a house on a street they own."
- **Numbers that belong to the bank.**
- **A section named after a table column** (`Rent:`) that says what "its rent" means for each kind of
  space.

The user asked that **cards carry facts too**, which was their very first question: a character card
gains an attribute that has an extra effect later. A small second sample game, **Venom**, proves it.

## Decisions (made by the user)

1. **Building:** once you own a full color set, a "Build a house" button lights up on your seat.
   Pressing it asks which street. You click one of your streets on the board, and a house appears on
   it. A street that would break even building is refused.
2. **The slice contents** below: building, hotels, the bank's supply, rent with sets and buildings,
   growing station and utility rents (accepted as played back).
3. **Cards carry facts that change during play,** in this slice.
4. **The user left everything else to the builder's judgment** ("I'll leave the rest to you, I trust
   your judgement"). Every call below is therefore the designer's (my) call, listed so the user can
   check them.

## Calls proposed in conversation and accepted

These were played back and accepted ("lgtm"):

- **Building happens any time during your own turn,** before or after rolling.
- **The button lights up when** you own every street of a color, you can pay that street's house
  price, and the bank still has a house (or a hotel) to give.
- **Picking:** pressing "Build a house" outlines the streets you may build on and fades the rest of
  the board. Cancel backs out. Clicking a refused street shows the designer's own sentence, as a
  greyed button does today.
- **Showing it:** houses appear on the street for every seat, and your money drops by the street's
  house price, a new `house` column in the board table (50 to 200 by color, as in the classic game).
- **Hotels:** once every street in the set has four houses, the same button builds a hotel. The four
  houses go back to the bank, and the hotel is drawn as one red block.
- **The bank** has 32 houses and 12 hotels. When it runs out, the button greys out with the reason.
- **Rent:**
  - A full set with no houses doubles base rent.
  - Houses and a hotel use their own columns in the table (classic values).
  - Stations charge 25, 50, 100 or 200 for 1, 2, 3 or 4 owned.
  - Utilities charge 4 times the roll, or 10 times if the owner has both.
- **A `Rent:` section** says what "its rent" means. The existing lands-on line, "They pay its rent to
  its owner.", stays a single line.

## Calls made while writing this (the user handed these to the builder)

- **One fact store for spaces, cards and players.** A fact is a named value on a thing: a number
  ("houses", "health") or yes/no ("hotel", "poisoned"). It has a starting value, and effects change it.
  - A table column is a fact whose starting value is its cell.
  - A declared fact starts at 0 or "no".
  - Facts are declared once ("Spaces can have houses and a hotel.", "Cards can be poisoned."), so a
    misspelt fact gets a hint like any other name.
  - Player facts ("in jail") are part of the design now, and are first used in slice 3.
- **The card-facts proof is a small two-player sample game, Venom.**
  - Character cards have health.
  - Playing a Viper poisons every card in the other player's camp.
  - Each time a player plays a card, their poisoned cards lose 1 health.
  - A card with 0 health goes to the discard pile.
  - When the deck and both hands are empty, the player with more cards in their camp wins.
  - It is small on purpose: it exists to show a card gaining a fact and that fact mattering later.
- **A card's face shows its current facts** ("health 2", "poisoned") on the text face. Facts of a card
  a viewer may not see are hidden, like its other attributes today.
- **A button is identified by its whole wording,** not its first word, so "build a house" and "build a
  hotel" could both exist. In slice 1, two buttons in a phase could not start with the same word.
  `After a player …` lines and examples name a button by its words, as today.
- **Targets are spaces only in this slice.** Picking a card as a target comes with the slice that needs
  it.
- **The bank's numbers show on every seat,** under the money line ("bank: 30 houses, 12 hotels").
- **Even building counts a hotel as five buildings,** as in the classic rules.
- **Three small leftovers from slice 1 are fixed here:**
  - The developer stub for a line such as "They go to jail." no longer turns "go to jail" into a space
    name.
  - A rule that runs as a piece passes a space may move that piece. The walk no longer puts it back.
  - Verbs with a doubled consonant ("they have stopped this turn") work.
- **Building stays on your own turn.** Building out of turn, selling buildings and mortgages are
  slice 5.
- **Games with more than two players still rarely end in slice 2, and the proof says so.** A simulation
  during review found that with 1500 money and the Go salary, an auto-player that buys and builds ends
  about 96% of 2-player games, 32% of 4-player games and 6% of 8-player games. With more players, full
  color sets rarely form until auctions (slice 6) and trading (slice 7) move streets around. So:
  - the 2-player game must end on its own, across ordinary seeds;
  - the building economy is proven at 4 and 8 players by a variant where every player starts with a
    full color set, rather than by hand-picking seeds that happen to end.
- **`Rent:` is a general kind of section, not a keyword.** Any section named after a column of the board
  table (`Rent:` after `rent`) defines what "its <column>" means for each kind of space. A later
  `Tax:` section works the same way. A misspelt section name gets suggestions from the fixed section
  names and the table's columns. The compiler never contains the word "rent".
- **The table's hotel rent column is called `with hotel`,** so it can't be confused with the yes/no
  `hotel` fact.
- **Double rent applies to a full set with no buildings,** so a hotel street isn't doubled.
- **A player who goes out gives their buildings back to the bank,** with one more line in the rule that
  puts them out.
- **Venom's rule covers cards in a camp** ("When a card in a camp has 0 health:"). A card in the discard
  pile keeps its 0 health, and the rule must stop matching once the card has moved.

## Goals

- The slice 2 Rent Day text compiles with no diagnostics, and its examples cover every rule below.
- A 2-player Rent Day game, with 1500 starting money and the Go salary, ends on its own: an auto-player
  that buys and builds whenever it can reaches a winner in ordinary seeded games. At 4 and 8 players,
  games where every player starts with a full color set end the same way.
- Venom compiles, its examples pass, and it plays to a winner, showing a card's fact changing and
  mattering later.
- On the playtest page you can build by picking a street, see houses and hotels on every seat's board,
  and see Venom's cards show their health and "poisoned".
- Hearts, Color Match and slice 1's behaviour are unchanged.

## Non-goals

- Selling buildings back, mortgages, real bankruptcy (slice 5); auctions (6); trading (7).
- Building out of turn.
- Picking a card or a player as a target.
- House rules: housing-shortage auctions, uneven building, Free Parking money.
- A visual or animated board beyond houses and hotels on the existing grid.

## Anti-goals

From the overview and slice 1, plus:

- **No Monopoly in the engine or language core.** Houses, hotels, rent tables and "even building" are
  general facts and phrases, or live in a Rent Day phrase file (`library/rent-day.ts`). Never in
  `core/` or the compiler.
- **A fact that silently means something else.** A misspelt fact name is an error with a hint, never a
  new fact.
- **A target the player is allowed to pick that the move then refuses,** or the other way round. The
  outlined streets are exactly the ones the move accepts.
- **Facts leaking from hidden cards** to a seat that may not see the card.

## What the designer writes

This is the shape, not a fixed grammar; the builder settles exact wording. Every line must compile once
the slice is done.

### Rent Day (slice 2 additions)

The board table gains a `house` column and the rent columns `1 house` to `with hotel`. Classic values:

| space | price | house | rent | 1 house | 2 houses | 3 houses | 4 houses | with hotel |
|---|---|---|---|---|---|---|---|---|
| Mill Lane | 60 | 50 | 2 | 10 | 30 | 90 | 160 | 250 |
| Ferry Row | 60 | 50 | 4 | 20 | 60 | 180 | 320 | 450 |
| Ash Street | 100 | 50 | 6 | 30 | 90 | 270 | 400 | 550 |
| Birch Street | 100 | 50 | 6 | 30 | 90 | 270 | 400 | 550 |
| Cedar Avenue | 120 | 50 | 8 | 40 | 100 | 300 | 450 | 600 |
| Dock Road | 140 | 100 | 10 | 50 | 150 | 450 | 625 | 750 |
| Quay Street | 140 | 100 | 10 | 50 | 150 | 450 | 625 | 750 |
| Harbour Way | 160 | 100 | 12 | 60 | 180 | 500 | 700 | 900 |
| Rose Lane | 180 | 100 | 14 | 70 | 200 | 550 | 750 | 950 |
| Lily Lane | 180 | 100 | 14 | 70 | 200 | 550 | 750 | 950 |
| Iris Road | 200 | 100 | 16 | 80 | 220 | 600 | 800 | 1000 |
| Market Square | 220 | 150 | 18 | 90 | 250 | 700 | 875 | 1050 |
| Guild Street | 220 | 150 | 18 | 90 | 250 | 700 | 875 | 1050 |
| Bell Square | 240 | 150 | 20 | 100 | 300 | 750 | 925 | 1100 |
| Linden Walk | 260 | 150 | 22 | 110 | 330 | 800 | 975 | 1150 |
| Elm Walk | 260 | 150 | 22 | 110 | 330 | 800 | 975 | 1150 |
| Oak Gardens | 280 | 150 | 24 | 120 | 360 | 850 | 1025 | 1200 |
| Crown Row | 300 | 200 | 26 | 130 | 390 | 900 | 1100 | 1275 |
| Bishop's Row | 300 | 200 | 26 | 130 | 390 | 900 | 1100 | 1275 |
| Castle Row | 320 | 200 | 28 | 150 | 450 | 1000 | 1200 | 1400 |
| Harbour Heights | 350 | 200 | 35 | 175 | 500 | 1100 | 1300 | 1500 |
| The Promenade | 400 | 200 | 50 | 200 | 600 | 1400 | 1700 | 2000 |

Stations and utilities keep their price. Their rent comes from the `Rent:` section, so their rent cells
may be blank.

```text
Board:
  The board is a loop of spaces, starting at Go:
    | space | kind | color | price | house | rent | 1 house | 2 houses | 3 houses | 4 houses | with hotel | tax |
    …
  Each player has a piece that starts on Go.
  Each player has 1500 money that everyone can see.
  Players pay with money.
  There are two six-sided dice.
  Spaces can have houses and a hotel.
  The bank has 32 houses and 12 hotels.

Rent:
  A street's rent is its "with hotel" column if it has a hotel, else the column for its number of houses.
  A street in a full set with no buildings has double rent.
  A station's rent is 25, 50, 100 or 200 when its owner has 1, 2, 3 or 4 stations.
  A utility's rent is 4 times the roll, or 10 times the roll when its owner has both utilities.

Phase: playing
  …
  A player may build a house on a street they own.
    Only if they own every street of its color.
    Only if it has no hotel.
    Only if no street of its color has fewer buildings.
    Only if they have at least its house price in money.
    Only if one of:
      it has fewer than 4 houses and the bank has a house
      it has 4 houses and the bank has a hotel
    Then:
      They pay its house price.
      If it has 4 houses, it gets a hotel from the bank and its houses go back to the bank.
      If it has no hotel, it gets a house from the bank.
  When a player lands on a space someone else owns:
    They pay its rent to its owner.
  When a player has less than 0 money:
    They are out.
    Their buildings go back to the bank.
    Their spaces go back to the bank.
  …
```

`Rent:` is a section named after the table's `rent` column. Its lines compile to the definition of
"its rent" for each kind of space. A space whose kind no rent
line covers uses its `rent` column, as in slice 1. Slice 1's separate utility line goes away, because
the lands-on line now covers every kind.

"Fewer buildings" counts a hotel as five. "One of" lines compare with "and" inside one condition line,
which is a single phrase. The builder may word these differently if the compiler rules (no "and"
parsing inside a line) call for it.

### Venom (new sample game)

```text
Game: Venom
Players: 2

Cards:
  A deck called creatures, starting in the deck:
    | name   | health | copies |
    | Knight | 3      | 6      |
    | Archer | 2      | 6      |
    | Viper  | 1      | 4      |
  Cards can be poisoned.

Table:
  The deck is a pile in the center that no one can see.
  The discard pile is a pile in the center that everyone can see.
  Each player has a hand that only they can see.
  Each player has a camp that everyone can see.

Setup:
  Shuffle the deck.
  Deal 4 cards from the deck to each hand.

Phase: playing
  Hint: Play a card to your camp, or draw one.
  Players take turns.
  A player may play a card from their hand to their camp.
    Then:
      Each poisoned card in their camp loses 1 health.
      If the card is a Viper, every card in the other player's camp is poisoned.
  A player may draw a card from the deck to their hand.
    Only if their hand is empty.
  When a card in a camp has 0 health:
    Move it to the discard pile.
  After a player plays or draws, the turn passes to the left.

End:
  The game ends when the deck and every hand are empty.
  The player with the most cards in their camp wins.
```

The intended order inside a play: poisoned cards in the player's camp lose health first, then a Viper
poisons the opponent's camp. A freshly poisoned card loses its first health on its owner's next play.

## Sections and what they compile to

| Designer says | Means |
|---|---|
| "Spaces can have houses and a hotel." / "Cards can be poisoned." / (later) "Players can be in jail." | Declares facts on that kind of thing. A plural noun is a number (starts at 0); "a hotel" or an adjective such as "poisoned" is yes/no (starts at "no"). |
| A table column (`health`, `price`) | A fact whose starting value is the cell. Effects may change it ("loses 1 health"). |
| "The bank has 32 houses and 12 hotels." | Numbers that belong to the bank (no player). Effects move them ("gets a house from the bank", "its houses go back to the bank"). |
| `<Column>:` + lines (`Rent:`) | A section named after a board-table column: what "its <column>" means for each kind of space (a value phrase per line). Kinds no line covers use the column's cell. |
| `A player may <verb> … on <target>.` | A button that picks a target: a space matching the target phrase ("a street they own"). Its conditions and effects see the target as "it". |
| `When a card in a camp has 0 health:` | A state rule bound to each card it matches, "it" being the card (as "When a player …" binds "they"). |
| "the other player's camp" | In a two-player game, the zone of the player who is not acting. |

## What the engine and language gain

All additive. Existing games compile and run unchanged.

1. **A fact store.**
   - Facts on spaces, cards and players live in `GameState.data` under `lang:*` keys, extending
     slice 1's store rather than adding one store per fact.
   - Spaces' owners and players' "out" may move into it or stay where they are; that is the builder's
     call.
   - Card facts must stay with the card through every move, and are hidden from seats that may not see
     the card: view projection drops them like other hidden attributes.
2. **Declared facts and bank numbers.**
   - New lines in `Board:` and `Cards:` declare them, and their names join the vocabulary for hints.
   - Bank numbers are visible to every seat.
3. **Phrases over facts.**
   - Conditions: "it has a hotel", "it has fewer than {n} houses", "no street of its color has fewer
     buildings", "the card is poisoned", "a card has 0 health".
   - Effects: "it gets a house from the bank", "its houses go back to the bank", "every card in the
     other player's camp is poisoned", "each poisoned card in their camp loses 1 health",
     "move it to the discard pile".
   - Counts: "they own every street of its color", "its owner has 2 stations".
   - Monopoly-specific ones ("fewer buildings" counting a hotel as five) go in `library/rent-day.ts`.
4. **Column sections.**
   - A section named after a board-table column (`Rent:`) compiles to one value per kind of space.
     "its rent" reads it, falling back to the cell for kinds no line covers.
   - Section names stop being only a fixed list: the compiler accepts the fixed names plus the columns
     of the board table, and suggests from both for a misspelt one. No section name is hard-coded
     beyond the existing fixed list.
   - A value phrase kind (returns a number) is new. It may be reused later (taxes as a percentage,
     Chance amounts).
5. **Targeted buttons.**
   - A button's words end with a target phrase ("on a street they own").
   - Its move carries the target, and "it" in its lines is the target.
   - The seat's view lists, for each targeted button, the targets it may pick and the reason each other
     candidate is refused.
   - Examples name the target ("When p1 builds a house on Iris Road").
6. **Button identity by wording,** replacing slice 1's "first word". `After a player …` lines, examples
   and the "two rules in this phase start…" check follow it.
7. **Card-bound state rules.** "When a card in a camp has 0 health:" runs for each matching card, in a
   fixed order, with "it" bound to the card. Its lines must make the condition false, as today.
8. **Other-player references** for two-player games: "the other player's camp". In a game with more
   than two players this is an error on the line.
9. **Views.**
   - Each space's view gains its facts (houses, hotel).
   - The seat's view gains the bank's numbers and each targeted button's pickable targets with reasons.
   - Card faces show their current facts.
10. **The three slice-1 leftovers** listed under *Calls*.

## The playtest screen

As slice 1 (layout B), plus:

- **Houses and hotels on the board.** Up to four small squares on a street's color band, or one red
  block for a hotel (mockup: https://claude.ai/artifact/Fu6EMbqUevoWsjthy32tKj).
- **Picking.** Pressing a targeted button puts that seat's board in picking mode:
  - a banner says what to pick, with Cancel;
  - pickable spaces are outlined and the rest fade;
  - a refused space is dashed, and clicking it shows the reason in the seat's notice line;
  - clicking a pickable space sends the move.
- **The bank's numbers** show under the money line.
- **Venom's cards** use the text face, showing current health and "poisoned".

## Proof (acceptance)

1. **Rent Day (slice 2)** compiles with no diagnostics. Its examples cover:
   - building needs a full set;
   - even building refuses a street with more buildings than another in its set, with that sentence;
   - building pays the house price;
   - the bank's last house, then the button refused when the bank is empty;
   - a hotel after four houses on every street of the set, with four houses going back to the bank;
   - rent with houses and with a hotel, and double rent for a full set with no houses;
   - station rent with two stations (50);
   - utility rent with both utilities (10 times the roll);
   - building is refused on someone else's street, and before you own the full set.
2. **Rent Day games end.**
   - **2 players, ordinary seeds.** With 1500 money and the Go salary, an auto-player that buys and
     builds whenever it can reaches a winner within a turn cap in at least 9 of 10 consecutive seeds
     (for example seeds 1 to 10). The test names any seed that doesn't end.
   - **4 and 8 players, full sets dealt.** A variant where every player starts owning one full color
     set (written as `Given` lines or setup lines, the builder's call) reaches a winner at 4 and 8
     players with fixed seeds.
   - The slice 1 money check is extended: building costs exactly the house price, buildings move
     between the bank and the board without being created or lost, and rent follows the `Rent:`
     section.
3. **Venom** compiles with no diagnostics. Its examples cover:
   - a Viper poisons the other camp;
   - a poisoned card loses health when its owner plays;
   - a card at 0 health goes to the discard pile;
   - an unpoisoned card keeps its health;
   - the winner has the most cards in their camp.
   - An auto-player plays seeded games to a winner.
4. **Hidden facts.** A card's facts are not in the view of a seat that may not see it (a hand card's
   "poisoned", if a rule poisons hands).
5. **The playtest page:**
   - you can build on Rent Day by picking a street;
   - a refused street shows its reason;
   - houses and hotels show on every seat;
   - Venom's cards show health and "poisoned".
   - A happy-dom test covers picking and refusal, plus a browser check.
6. Hearts, Color Match and every existing test pass; `bun run typecheck` is clean.

## Left to the builder

- Exact wording of new phrases and declarations, keeping the shapes above.
- How the fact store is laid out in `GameState.data`, and whether slice 1's owners and out-list move
  into it.
- How a target phrase is recognised in a button line, and how the move carries the target.
- How card faces are refreshed when facts change (a new face key, or an overlay).
- Venom's exact card counts and balance, as long as games end and examples cover the rules.
- The turn cap and seeds for the ending tests.

## Out of scope

Slices 3 to 7 (see the overview), online play, picking cards or players as targets, building out of
turn, selling or mortgaging, and house rules.
