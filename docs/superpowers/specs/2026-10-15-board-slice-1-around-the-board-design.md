# Board Games, Slice 1: Around the Board

**Date:** 2026-10-15
**Status:** Approved. Implementation plan: `docs/superpowers/plans/2026-10-15-board-slice-1-around-the-board.md`
**Part of:** `2026-10-15-board-games-overview-design.md` (read it first: the decisions, calls, anti-goals
and constraints there apply here).
**Builds on:** the designer rule language, merged to `main`.

## What this slice is

The first playable Monopoly-like game written in the rules language. Players roll two dice and their
piece moves itself around a loop of 40 spaces. Passing Go pays 200. A player who lands on an unowned
property may buy it; landing on someone else's property pays them its base rent; landing on a tax
space pays the bank. A player whose money goes below 0 is out, their properties go back to the bank,
and the last player left wins.

To get there, the language and engine gain their first non-card building blocks: a board, pieces,
numbers each player holds, dice, buttons, "passes" and "lands on" moments, memory of what a player did
this turn, owners that change during play, and players going out.

## Decisions (made by the user)

1. **The slice contents** above, with later rules left to later slices (see the overview's table).
2. **Playtest layout B:** every seat gets its own view of the board, a line with everyone's money, and its
   own buttons, like the Hearts and Color Match playtests today.
3. **A turn**, in order:
   1. The current player presses **Roll**. The dice are rolled with the seeded rng and their piece moves
      itself that many spaces. Nobody drags pieces.
   2. Passing or landing on Go pays them 200.
   3. Where they land decides what happens: on an unowned property they may buy it; on someone else's
      property they pay its rent automatically; on a tax space they pay it automatically; anything else
      (Chance, Treasury, the jail corners, Free Parking) does nothing yet.
   4. They press **End turn** and play passes to the left. End turn is an explicit button because later
      slices let a player build, mortgage and trade before ending.
   5. A player who owes more than they have is out, and their properties go back to unowned. The last
      player left wins.
4. **Buttons that can't be used right now are greyed out**, and the designer's "Only if" sentence is shown
   as the reason.
5. **The designer text has the shape of the sample below** (a `Board:` section with a table of spaces,
   declarations of pieces, money and dice, button actions with `Only if` and `Then:`, and `When a piece
   passes …` / `When a player lands on …` rules). The exact wording of phrases stays open, as in the
   language spec.
6. **The game names what players pay with, once.** A line under `Board:`, "Players pay with money.",
   says which of the players' numbers every "pay" line moves. Pay lines stay short ("They pay its rent
   to its owner"), and a second per-player number in a later slice (turns in jail, say) does not make
   them unclear.

## Calls made while writing this (the user has not weighed in)

- **What an action does is exactly its `Then:` lines.** "A player may roll the dice." declares the
  button; the dice are rolled by a `Roll the dice.` line under `Then:`. This keeps "a phrase does what it
  reads" true for actions, with no hidden effect behind the button's words. It adds one line to the
  sample the user saw. An action with no `Then:` lines is allowed: "A player may end their turn" only
  records that they did it, and the `After a player ends their turn, …` line passes the turn.
- **There is no "Don't buy" button.** Ending the turn without buying is declining. The mockup's "Don't
  buy" was a placeholder, and auctions on decline come in slice 6.
- **"Passes" includes landing on.** "When a piece passes Go" fires when the piece moves past Go or stops
  on it, matching the classic rule (collect 200 for passing or landing).
- **Stations and utilities pay single-owner rent**: stations use their `rent` column (25); a utility
  charges 4 times the roll. Rent that grows with how many you own is slice 2.
- **Going broke is simplified until slice 5.** Rent, tax and prices are paid in full even if that takes
  the payer below 0, and the receiver gets the full amount. A player below 0 is out. Slice 5 brings
  real bankruptcy (raise money first, assets to the creditor).
- **Every seat shows its own buttons, always.** On other players' turns they are greyed out with "It's
  p1's turn" as the reason, the same rule as any other unmet condition. (The mockup only drew buttons on
  the current seat.) When later slices allow out-of-turn actions, those buttons simply light up.
- **Numbers each player holds carry a visibility**, like zones: "that everyone can see" or "that only
  they can see". Monopoly money is public. A number only its owner can see is not sent to other seats.
- **Players are colored.** Each seat gets a fixed color (p0 to p7), used for its piece, its owner marks on
  the board, and its entry in the money line, on every seat's view.
- **The checked-in game is "Rent Day"** (working name, `src/games/rent-day.rules`), with made-up street,
  station, utility and deck names. Prices and rents are the classic values.

## Goals

- A designer can write the slice 1 game (the full text below) and press Play to play it at any count
  from 2 to 8, with every seat on one screen.
- Every new line in the text is a phrase from the library (or a built-in section keyword), with the same
  unknown-phrase hints and stubs as today.
- Examples for the new rules run in the editor and in `bun run test`, including control of the dice
  ("Given the next roll is 3 and 4").
- A greyed-out button tells the player why, in the designer's words.
- The new building blocks are general: nothing in the engine or the language core knows about money,
  rent or Monopoly.

## Non-goals

- Anything from slices 2 to 7: color sets, houses and hotels, growing station and utility rents,
  doubles, jail, Chance and Treasury cards, mortgages, real bankruptcy, auctions, trading.
- Actions that need a target picked on the board, an amount, or an offer (slice 2 onward).
- Out-of-turn actions.
- Board games that are not a single loop (grids, branching paths, hex maps).
- More than one piece per player.
- Animated walking of pieces space by space. Pieces may jump to their new space, as long as the move is
  visible (see *Left to the builder*).

## Anti-goals

From the overview, plus:

- **A button that silently does nothing**, or does something its sentence does not say.
- **A rule that fires twice for one moment** (paying rent twice for one landing), or that fires again on a
  later move because the state still looks the same (paying rent on every following move while the piece
  sits there). Moments fire once, when they happen.
- **A player who is out still taking turns**, being picked by "a player" rules, or still owning spaces.

## What the designer writes

The intended text of `src/games/rent-day.rules`. Same caveat as the language spec: this is the shape,
and the builder settles exact wording, but every line here should compile once the slice is done.

```text
Game: Rent Day
Players: 2 to 8

Board:
  The board is a loop of spaces, starting at Go:
    | space           | kind       | color      | price | rent | tax |
    | Go              | go         |            |       |      |     |
    | Mill Lane       | street     | brown      | 60    | 2    |     |
    | Treasury        | treasury   |            |       |      |     |
    | Ferry Row       | street     | brown      | 60    | 4    |     |
    | Income Tax      | tax        |            |       |      | 200 |
    | North Station   | station    |            | 200   | 25   |     |
    | Ash Street      | street     | light blue | 100   | 6    |     |
    | Chance          | chance     |            |       |      |     |
    | Birch Street    | street     | light blue | 100   | 6    |     |
    | Cedar Avenue    | street     | light blue | 120   | 8    |     |
    | Jail            | jail       |            |       |      |     |
    | Dock Road       | street     | pink       | 140   | 10   |     |
    | Power Works     | utility    |            | 150   |      |     |
    | Quay Street     | street     | pink       | 140   | 10   |     |
    | Harbour Way     | street     | pink       | 160   | 12   |     |
    | East Station    | station    |            | 200   | 25   |     |
    | Rose Lane       | street     | orange     | 180   | 14   |     |
    | Treasury        | treasury   |            |       |      |     |
    | Lily Lane       | street     | orange     | 180   | 14   |     |
    | Iris Road       | street     | orange     | 200   | 16   |     |
    | Free Parking    | parking    |            |       |      |     |
    | Market Square   | street     | red        | 220   | 18   |     |
    | Chance          | chance     |            |       |      |     |
    | Guild Street    | street     | red        | 220   | 18   |     |
    | Bell Square     | street     | red        | 240   | 20   |     |
    | South Station   | station    |            | 200   | 25   |     |
    | Linden Walk     | street     | yellow     | 260   | 22   |     |
    | Elm Walk        | street     | yellow     | 260   | 22   |     |
    | Pump House      | utility    |            | 150   |      |     |
    | Oak Gardens     | street     | yellow     | 280   | 24   |     |
    | Go To Jail      | go to jail |            |       |      |     |
    | Crown Row       | street     | green      | 300   | 26   |     |
    | Bishop's Row    | street     | green      | 300   | 26   |     |
    | Treasury        | treasury   |            |       |      |     |
    | Castle Row      | street     | green      | 320   | 28   |     |
    | West Station    | station    |            | 200   | 25   |     |
    | Chance          | chance     |            |       |      |     |
    | Harbour Heights | street     | dark blue  | 350   | 35   |     |
    | Luxury Tax      | tax        |            |       |      | 100 |
    | The Promenade   | street     | dark blue  | 400   | 50   |     |
  Each player has a piece that starts on Go.
  Each player has 1500 money that everyone can see.
  Players pay with money.
  There are two six-sided dice.

Phase: playing
  Hint: Roll the dice, then buy where you landed or end your turn.
  Players take turns.
  A player may roll the dice.
    Only if they have not rolled this turn.
    Then:
      Roll the dice.
      Their piece moves forward by the roll.
  A player may buy the space they are on.
    Only if they have rolled this turn.
    Only if it has a price.
    Only if no one owns it.
    Only if they have at least its price in money.
    Then:
      They pay its price.
      They own it.
  A player may end their turn.
    Only if they have rolled this turn.
  When a piece passes Go:
    Its player gets 200 money.
  When a player lands on a street or station someone else owns:
    They pay its rent to its owner.
  When a player lands on a utility someone else owns:
    They pay 4 times the roll to its owner.
  When a player lands on a tax space:
    They pay its tax.
  When a player has less than 0 money:
    They are out.
    Their spaces go back to the bank.
  After a player ends their turn, the turn passes to the left.

End:
  The game ends when one player is left.
  That player wins.

Example: landing on someone else's street pays them rent
  Given p1 owns Rose Lane
  And p0 is on Cedar Avenue
  And the next roll is 3 and 4
  When p0 rolls the dice
  Then p0 is on Rose Lane
  And p0 has 1486 money
  And p1 has 1514 money
```

The `Example:` above is one of the set listed under *Proof*. There is no `Cards:`, `Table:` or `Setup:`
section: a game may have a board and no cards, and pieces and money start where their declarations say.

### Sections and what they compile to

| Designer says | Means |
|---|---|
| `Board:` + "The board is a loop of spaces, starting at Go:" + a table | An ordered loop of spaces. The `space` column names each space. Every other column becomes an attribute rules can mention ("its rent", "a street"), as card-table columns do today. Blank cells mean the space has no such attribute ("it has a price" is false for Go). A cell's words, such as `light blue` or `go to jail`, are values rules can refer to. |
| "Each player has a piece that starts on Go." | One piece per seat, on that space at the start. |
| "Each player has 1500 money that everyone can see." | A number per seat, named by the designer ("money"), with its starting value and who may see it. |
| "Players pay with money." | Which of those numbers every "pay" line moves. A "pay" line in a game without it is an error on that line, with a hint to add it. Naming a number the game never declared is an error with suggestions, as for zones. |
| "There are two six-sided dice." | The dice "Roll the dice" rolls, and "the roll" (their total in the latest roll). |
| `A player may <action>.` (no "a card from … to …") | A button on each seat. `Only if` lines decide whether it is allowed (the first failing sentence is the reason shown); `Then:` lines are everything it does. |
| `When a piece passes <space>:` / `When a player lands on <spaces>:` | A moment rule: its lines run once, when a piece's move goes past or onto that space, or stops on it. "Its player", "they" and "their" are the piece's player; "it" and "its" are the space. |
| `When a player has less than 0 money:` | A state rule, as today, with "they" being the player it matched. |
| `After a player ends their turn, …` | As today's `After a player plays, …`, naming an action instead of a card move. |
| "The game ends when one player is left." / "That player wins." | An end condition over players still in, and the winner being the one left. |

### Words rules use

- **They, their, them**: in an action, the player pressing the button; in a `When a player …` or
  `When a piece …` rule, the player it is about.
- **It, its**: the space the line is about: "the space they are on" in the buy action, the space landed
  on or passed in a moment rule. A pronoun the compiler cannot pin to one thing is an error on that line,
  never a guess.
- **The roll**: the total of the latest roll.
- **Someone else owns / no one owns / they own it / its owner**: the space's owner, which changes during
  play.
- **A street, a station, a utility, a tax space**: spaces by the value in their `kind` column.
- **Space names**: "Go", "Rose Lane". Several spaces share a name (Chance, Treasury). A rule or example
  that needs one particular space and names a shared name is an error that says how many spaces have it.

## What the engine and language gain

All additive. Existing card games compile and run unchanged.

1. **A board.** Spaces in loop order with their attributes, compiled from the `Board:` table. What does not
   change during play is part of the compiled game, and what does (each space's owner) is part of
   `GameState`.
2. **Pieces.** Each piece's player and current space are in `GameState`. "Their piece moves forward by
   the roll" moves it around the loop and wraps past the last space to the first. A player who is out
   has no piece on the board.
3. **Numbers players hold** (counters). Named, per seat, with a starting value and a visibility, kept in
   `GameState`. Effects add to and subtract from them; "pay … to …" moves an amount of the number named
   in "Players pay with …" between two players, and "pay …" with no receiver pays the bank, which has
   unlimited money in this slice. Lines that name their number ("gets 200 money", "at least its price in
   money") work with any declared number.
4. **Dice.** "Roll the dice" draws each die from `state.rng` and stores the faces of the latest roll in
   `GameState`, so they can be shown and replayed. Examples can set the next roll; that setting exists
   only for examples and never changes what `state.rng` produces in a real game.
5. **Action moves.** A declared action is a move type whose `Move` carries the actor (`by`). It should
   leave room for parameters later slices add (a target space, an amount). Its handler uses the same
   condition groups and rejection text as `declaredMoveHandler` does for card moves, then runs its
   `Then:` lines.
6. **Moments.** Moving a piece announces, in order, each space it goes past and then the space it stops
   on. Moment rules (`When a piece passes …`, `When a player lands on …`) run at that point, once each,
   in the order they are written, inside the move's apply/flow step so replay reproduces them. A moment
   rule's own effects may move pieces and announce further moments, but must not loop forever; the same
   iteration cap as `runFlow` applies, with a designer-readable error. Today's state rules (`When the
   trick has 4 cards:`) keep their current meaning.
7. **Players a state rule matches.** `When a player has less than 0 money:` checks players in seat order
   (starting from p0), runs its lines for the first player it matches with "they" bound to that player,
   then re-checks. The lines must make the condition false for that player, as today's triggers must.
8. **Memory of this turn.** Which actions the current player has made since their turn began. It is
   cleared whenever the turn passes. "They have rolled this turn" and "they have not rolled this turn"
   read it.
9. **Players going out.** "They are out" marks the player out and takes their piece off the board. Turn
   order skips players who are out. Phrases about "a player", "each player" and "one player is left"
   count only players still in. If the player going out is the current player, the turn passes to the
   next player still in, and the `After …` line does not also fire. "Their spaces go back to the bank"
   clears the owner of every space they own.
10. **Per-seat views.** `ClientView` gains everything a seat needs to draw this game: space owners, piece
    positions, the latest roll, who is out, the numbers that seat may see, and the seat's actions. Each
    action has its button label and whether it is allowed now; when it isn't, the reason is given. Gate
    rejections are reworded as today (`friendlyReason`: "It's p1's turn"). Everything stays `Json`.
11. **New phrases** in the built-in library for every line of the sample, plus Given / When / Then
    phrases for examples (below). Monopoly-flavoured wording that another board game would not use
    ("they pay 4 times the roll to its owner" is general enough to stay built-in; anything that is not
    goes into a game phrase file such as `library/rent-day.ts`).

## Examples

New example vocabulary, alongside today's:

- **Given:** "{player} is on {space}", "{player} owns {space}", "{player} has {number} {counter}",
  "the next roll is {number} and {number}", "{player} has rolled this turn", "{player} is out",
  "it is {player}'s turn".
- **When:** a player pressing a button, written in the third person: "p0 rolls the dice", "p0 buys the
  space they are on", "p0 ends their turn".
- **Then:** "{player} is on {space}", "{player} owns {space}", "no one owns {space}",
  "{player} has {number} {counter}", "{player} is out", plus today's "it is accepted / rejected (because
  …)", "it is {player}'s turn" and "{player} wins".

## The playtest screen

Layout B from the mockups. Every seat gets its own panel, as today, with:

- **The board**, a square loop running clockwise from the bottom-right corner (as on the classic board),
  with the corners at every tenth space for 40 spaces. Other space counts spread evenly around the
  square. Each space shows its `color` attribute as a band (if it has one) and its owner's color as a
  mark. Each piece is a dot in its player's color. The latest roll's dice are drawn in the middle.
  Pointing at a space (hover or tap) shows its name and attributes.
- **A money line**: every player still in, in their color, with the numbers that seat may see. Players
  who are out are shown as out.
- **The seat's buttons**, labelled from the action's words with "their" and "they" turned into "your" and
  "you" (as `declared-moves.ts` does for zone names): "Roll the dice", "Buy the space you are on", "End
  your turn". Greyed out when not allowed, with the reason on hover or tap.
- **The status line** as today: the phase hint, whose turn it is, the game's result.

The page keeps Undo, Restart, Stop and the player-count picker (2 to 8 here).

## Proof (acceptance)

1. `src/games/rent-day.rules` (the text above, with its full set of examples) compiles with no
   diagnostics.
2. Its examples cover:
   - landing on someone else's street pays them its rent;
   - buying an unowned street after rolling, which takes its price and makes you its owner;
   - you cannot buy before rolling, a space with no price, an owned space, or without enough money, and
     each refusal gives that `Only if` sentence;
   - you cannot roll twice in one turn, or end your turn before rolling;
   - passing Go pays 200, and landing on Go pays 200 once;
   - a tax space charges its tax;
   - a utility charges 4 times the roll;
   - going below 0 puts you out, your spaces become unowned, and your piece leaves the board;
   - the turn passes to the left after ending a turn, skipping players who are out;
   - when one player is left, they win.
3. **A long-run test**: an auto-player plays seeded games at every count from 2 to 8 for a fixed number of
   turns each with no errors. Money only changes through Go, rent, tax and purchases, and every owned
   space's owner is a player still in.
4. **An ending test**: with base rents only, a real game rarely ends (that is what slice 2's sets and
   houses are for). So a variant of the text with little starting money (300) and no Go salary is played
   by the auto-player to a winner at 2, 4 and 8 players, with fixed seeds. Without the salary, money only
   leaves the table (taxes and purchases), so every game ends.
5. Same seed and same moves give the same game; undo and replay reproduce rolls and moments exactly.
6. The designer page loads Rent Day as a sample, shows its examples passing, and plays it at a chosen count
   from 2 to 8, with layout B, the board, the money line, and greyed buttons with reasons.
7. Hearts and Color Match compile with no diagnostics and pass their examples; every existing test passes;
   `bun run typecheck` is clean.

## Testing

- **Compiler:** the `Board:` section (columns, blank cells, multi-word values, shared names); piece,
  counter and dice declarations; "Players pay with …"; action lines versus card-move lines; moment
  rules; `After` naming an action; diagnostics for unknown spaces, kinds, counters, a "pay" line with no
  "Players pay with …", and unresolvable pronouns.
- **Engine:** action legality and rejection text; moments fire once each, in order, in replay too; the
  passes-includes-landing rule; wrap-around past the last space; turn memory cleared when the turn
  passes; going out mid-turn passes the turn exactly once; counters a seat may not see are not in its
  view.
- **Examples runner:** each new Given / When / Then; a fixed next roll.
- **Page:** a happy-dom test that the page loads Rent Day, lists its examples, enables Play, and renders a
  greyed button with its reason.

## Left to the builder

- **How the new state is represented.** One option is reusing zones and cards: each space is a zone laid
  out along the loop and each piece is a small card-like token in its space's zone, so the existing
  tweening animates moves. The other is giving pieces, spaces and counters their own state. Either way
  it must satisfy the engine list above, keep card ids opaque for card games, and stay `Json`.
- **How the board is drawn** (in the Pixi canvas or as page elements around it), the board's size inside a
  seat panel, and whether pieces walk or jump.
- **Exact phrase wording**, keeping the sample's shape; how an action's identity is formed (the verb, or
  the whole sentence); how `After a player …` names an action.
- **The event mechanism** for moments, within the rules above.
- **Color names** for the band (`light blue` and so on); an unknown color falls back to a neutral one.
- **How numbers are formatted** in the money line.
- **The full example set's wording** and any extra examples that help.

## Out of scope

Everything in slices 2 to 7 (see the overview), online play, computer opponents, house rules, and board
shapes other than a single loop.
