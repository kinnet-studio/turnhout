# Board Games, Slice 3: Doubles and Jail

**Date:** 2026-10-15
**Status:** Ready to build. The user delegated the design calls under the goal to finish every slice (see Decisions); a builder check was run and its four questions are settled below.
**Part of:** `2026-10-15-board-games-overview-design.md`. Its decisions, calls, anti-goals and constraints
apply here.
**Builds on:** slice 1 (PR #8) and slice 2 (PR #9), both merged to `main`.

## What this slice is

Rent Day gains doubles and jail:

- Rolling doubles lets you roll again in the same turn. You can't end your turn on a double.
- A third double in one turn sends you straight to jail, without moving by that roll.
- Landing on the Go To Jail space sends you straight to jail. You don't pass Go on the way.
- While in jail, a turn starts with a choice:
  - pay 50 to leave, then roll and move as usual;
  - or roll for a double:
    - a double frees you, and you move by that roll but don't roll again;
    - otherwise you stay. On the third failed roll you pay 50 and move by that roll.
- Landing on the Jail space by an ordinary roll is "just visiting" and does nothing.

To get there, the language gains:

- **Facts about players that change during play**, declared like space and card facts:
  - "Players can be in jail." is a yes/no fact;
  - "Players can have jail turns." is a number.
  - Slice 2 built the store for them (`playerFact`, `setPlayerFact`); this slice gives them words.
- **The dice faces, not only the total:** "they rolled a double", and "they have rolled 2 doubles this turn".
- **Another roll in the same turn.** No engine change is needed: the roll button's own `Only if` lines say
  when it may be pressed again.
- **Naming a button by its whole done-wording:**
  - "they have rolled for a double this turn" names one button;
  - "they have rolled this turn" now means any button whose verb is roll.
- **A move that skips the board:** "Their piece goes straight to Jail." passes nothing and lands nowhere.
- **A plain fine:** "They pay 50."

It also clears the small leftovers slice 2's final review handed on (see *Leftovers*).

## Decisions

1. **The user set the goal "let's finish all the slices"** and earlier left design calls to the builder ("I'll
   leave the rest to you, I trust your judgement"). There was no question round for this slice. Every call
   below is the builder's, listed so the user can check it.
2. **Classic jail rules** (from the overview): doubles roll again, three doubles or Go To Jail send you to jail,
   and you leave by paying, by rolling doubles, or after three turns.

## Calls (the builder's)

- **Jail is two facts about a player:** the yes/no "in jail", and the number "jail turns". These are general
  player facts, declared in the text, with no jail logic in the engine. Rent Day's text says everything:
  - when they are set;
  - what in-jail players may press;
  - what happens on the third failed roll.
- **Rolling in jail is its own button,** "Roll for a double", because it does something different from "Roll
  the dice": no move unless freed, and it counts a jail turn. Slice 2's "a button is its whole wording" lets
  both start with "roll".
- **"Pay to leave jail" is a button too.** It may be pressed only before rolling that turn. The fine is 50, from
  the classic game.
- **"they have rolled this turn" covers every button whose verb is roll.**
  - In slice 2, a verb shared by two buttons made "rolled" an error. It now reads "any of them", which is how a
    designer means it.
  - To name one button, write its whole wording in the past ("rolled for a double", "ended their turn").
  - An After line still needs a single button. "After a player rolls" with two roll buttons is still the slice 2
    error, since "after" means one move.
- **"they rolled a double" reads the player's own last roll this turn.** It is false if they haven't rolled this
  turn. It is not the last roll anyone made, so the previous player's double never leaks into the next turn.
- **Doubles are counted per player per turn,** next to slice 1's turn memory, and cleared when the turn passes:
  - "they have rolled 3 doubles this turn";
  - "they have rolled fewer than 3 doubles this turn";
  - "When a player has rolled 3 doubles this turn:".
  - Any roll by the player counts: "Roll the dice" from either button.
- **A double needs exactly two dice.** A game with one die, or with three or more, that says "rolled a double"
  gets a compile error on that line: "A double needs exactly two dice." (builder check: three dice had no
  agreed meaning, and examples can only fix rolls of one or two dice.)
- **Fact names may have several words** ("jail turns"). In every "… can have …" declaration, a list is split at
  commas and " and " before anything else, so a name can't contain "and" or a comma, and "houses and a hotel"
  stays two facts. "a"/"an" + name is a yes/no fact; any other name is a number. (builder check: slice 2's
  `{factlist}` took one-word names only.)
- **"Their piece goes straight to <space>"** places the piece without passing or landing on anything. Slice 4's
  "Advance to Go" card, which does pass Go, will be a separate phrase.
- **"They pay <n>"** pays the bank in the pay-with counter, like "They pay its tax".
- **The fines and limits are written in the text,** not the engine: 50, three doubles, three jail turns.
- **The third failed roll is a rule about a player:** "When a player has 3 jail turns:". It pays, frees, resets
  the count and moves by that roll. It may take money below 0; the existing less-than-0 rule then puts them
  out, as in the classic game.
- **Player facts are public.** Every seat sees "in jail" and "1 jail turn" next to that player's money. Hiding
  a player fact is left until a game needs it.
- **The page shows player facts by a general rule, never by name** (builder check): a piece whose player has any
  yes/no fact set gets a ring, and each space's title lists the players on it with their set facts
  ("Jail — p0 (in jail, 1 jail turn)"). No page code names "jail".
- **One earlier example's expected reason changes** (builder check): "you cannot roll twice in one turn" now
  fails the roll button's `Only if one of:` group, so its reason becomes "they have not rolled this turn or they
  rolled a double". The rule changed in this slice, so the example follows it; every other earlier example is
  unchanged.
- **Player fact names may not clash with existing words:**
  - a counter ("Players can have money" when money is a counter): `“money” is already a number each player has.`;
  - the reserved "out": `“out” is already how a player leaves the game.`
- **Examples can queue several rolls:** "the next roll is 3 and 3" then "the roll after that is 1 and 2".
- **Examples can arrange doubles already rolled:** "Given p0 has rolled 2 doubles this turn". This marks them
  as having rolled, with their last roll a double.

## Goals

- The slice 3 Rent Day text compiles with no diagnostics, and its examples cover every jail and doubles rule
  below.
- A 2-player Rent Day game still ends on its own: an auto-player that rolls doubles again, pays or rolls in
  jail, buys and builds still reaches a winner in at least 9 of 10 consecutive ordinary seeds. The 4- and
  8-player full-set variants still end.
- The long-run checks gain jail invariants:
  - a player in jail is on the Jail space;
  - jail turns are 0 when not in jail, and at most 2 between moves;
  - a third double never moves the piece by that roll;
  - money still balances, with fines going to the bank.
- The playtest page shows who is in jail, and the jail buttons appear and grey out with reasons.
- Hearts, Color Match, Venom, and slice 1 and 2 behaviour are unchanged.

## Non-goals

- "Get out of jail free" cards (slice 4).
- Raising money to pay the fine, and bankruptcy to another player (slice 5).
- Acting out of turn.
- A visual jail cell on the board beyond a marker on the jailed piece.
- Hiding player facts.

## Anti-goals

From the overview and the earlier slices, plus:

- **No jail in the engine or the language core.**
  - "in jail", "jail turns", "Go To Jail" and 50 live in Rent Day's text only.
  - "double" is a general dice word and may appear in the language.
- **"they rolled a double" seeing someone else's roll.**
- **A third double that moves the piece,** or a trip to jail that collects for passing Go.
- **A player fact that silently shadows a counter or a fixed phrase.**

## What the designer writes

This is the shape; the builder settles exact wording within it. Every line must compile once the slice is done.

```text
Board:
  …
  Players can be in jail.
  Players can have jail turns.

Phase: playing
  Hint: Roll the dice, then buy, build, or end your turn. A double rolls again.
  Players take turns.
  A player may roll the dice.
    Only if they are not in jail.
    Only if they have not rolled for a double this turn.
    Only if one of:
      they have not rolled this turn
      they rolled a double
    Then:
      Roll the dice.
      If they have rolled fewer than 3 doubles this turn, their piece moves forward by the roll.
  A player may pay to leave jail.
    Only if they are in jail.
    Only if they have not rolled this turn.
    Only if they have at least 50 money.
    Then:
      They pay 50.
      They are not in jail.
      Their jail turns go back to 0.
  A player may roll for a double.
    Only if they are in jail.
    Only if they have not rolled this turn.
    Then:
      Roll the dice.
      If they rolled a double, they are not in jail.
      If they are in jail, they gain 1 jail turn.
      If they are not in jail, their jail turns go back to 0.
      If they are not in jail, their piece moves forward by the roll.
  A player may buy the space they are on.            (unchanged)
  A player may build a house on a street they own.   (unchanged)
  A player may end their turn.
    Only if they have rolled this turn.
    Only if one of:
      they did not roll a double
      they are in jail
      they have rolled for a double this turn
  When a player has rolled 3 doubles this turn:
    Only if they are not in jail.
    Their piece goes straight to Jail.
    They are in jail.
  When a player lands on a go to jail space:
    Their piece goes straight to Jail.
    They are in jail.
  When a player has 3 jail turns:
    They pay 50.
    They are not in jail.
    Their jail turns go back to 0.
    Their piece moves forward by the roll.
  …(passing Go, rent, tax and going out as in slice 2)
```

Notes on the order of lines:

- **"Roll for a double"** frees the player first, then counts a failed try, then resets and moves a freed
  player. Each `If` line reads the state the lines above it left.
- **On the third failed roll:**
  - the jail-turn count reaches 3;
  - the rule about a player then pays, frees, resets and moves by that same roll;
  - because "rolled for a double" was pressed, the player may not roll again and may end the turn.
- **A trip to jail by the third double:** the move line is skipped ("fewer than 3"), so the piece never moves by
  that roll, and the rule then sends it to Jail. Being in jail stops further rolls and lets the turn end.
- **Ending the turn** is refused after a double unless the player is in jail or has rolled for a double this
  turn.

### Examples to cover (Rent Day)

Numbers come from the board: Go 0, Ash Street 6, Cedar Avenue 9, Jail 10, Quay Street 13, Harbour Way 14,
Bell Square 24, Go To Jail 30.

| Example | Expect |
|---|---|
| A double rolls again (3+3 from Go, then 1+2) | p0 on Ash Street after the first roll, then on Cedar Avenue |
| You can't end your turn on a double | rejected with the one-of reason |
| A third double sends you to jail | given 2 doubles this turn and a 4+4: p0 on Jail, in jail, and not moved by the 8 |
| Go To Jail sends you to jail without passing Go | from Bell Square, 2+4: on Jail, in jail, money unchanged |
| In jail you can't roll the dice | rejected because "they are not in jail" |
| Paying to leave jail | not in jail, money 1450 |
| A double gets you out of jail | 2+2 from Jail: not in jail, on Harbour Way |
| Leaving by a double doesn't roll again | a second press of "roll the dice" is rejected |
| A failed roll keeps you in jail | 1+2: still in jail, 1 jail turn, still on Jail |
| The third failed roll pays and moves | given 2 jail turns, 1+2: not in jail, 1450 money, on Quay Street, 0 jail turns |
| Just visiting | an ordinary roll onto Jail leaves you not in jail |
| Ending a turn after a double that sent you to jail | from Bell Square, 3+3 to Go To Jail: end turn is accepted |

## Sections and what they compile to

| Designer says | Means |
|---|---|
| "Players can be in jail." / "Players can have jail turns." | Declares a yes/no fact and a number on each player. Each starts at "no" or 0. |
| "they are in jail" / "they are not in jail" (condition or effect) | Reads or sets a player's yes/no fact. |
| "they have 3 jail turns", "they gain 1 jail turn", "their jail turns go back to 0" | Reads, raises or resets a player's number. |
| "they rolled a double", "they have rolled 2 doubles this turn" | The player's own rolls this turn, by face. |
| "they have rolled for a double this turn" | One button, named by its whole wording in the past. |
| "Their piece goes straight to Jail." | Places the piece; nothing is passed or landed on. |
| "They pay 50." | Pays the bank in the pay-with counter. |

## What the engine and language gain

All additive. Existing games compile and run unchanged.

1. **Player facts in the language.**
   - Declarations under `Board:` or `Players:`; the builder picks, and `Board:` is fine.
   - Vocabulary types `{playerflag}` and `{playernumber}`. The number accepts the singular, as
     `{spacenumber}` does.
   - Conditions, effects and rules about a player use them, and so do the examples' Given and Then lines.
   - The name checks above apply.
2. **Dice faces.**
   - Each roll's faces are kept in the roller's turn memory.
   - Phrases: "they rolled a double" and "they did not roll a double"; "they have rolled N doubles this turn"
     and "fewer than N"; the rule "When a player has rolled N doubles this turn:".
   - Given: "{player} has rolled N doubles this turn".
3. **Done-wordings.** `{done}` reads a bare participle as every button with that verb, and a participle with
   the rest of a button's wording as that one button.
4. **Movement and payment.** "their piece goes straight to {space}" and "they pay {int}".
5. **Example rolls.** "the roll after that is {int} and {int}" queues another roll.
6. **Views.**
   - Each seat's view lists every player's set facts: flags by name, and numbers other than 0 with their count.
   - The page shows them on the money line ("p0 1450 money · in jail · 1 jail turn") and marks a jailed piece on
     the board.

## Leftovers fixed here (from slice 2's final review)

- **A card's declared number can be raised:**
  - "It gains 1 charge." (a rule about a card);
  - "Each poisoned card in their camp gains 1 health.";
  - "Given the Knight in p1's camp has 2 charges".
  - `{attribute}` accepts the singular for a count of one ("loses 1 charge").
- **The "on any …" hint suggests only a wording the language accepts.** When the words after "any"/"the"/…
  aren't a bare kind of space (with or without "they own"), the line still gets the error, but without a
  suggested wording.
- **Rent Day gains two more rent examples:** one house (70) and four houses (750) on Rose Lane, with Lily Lane
  and Iris Road matching, so the set is even.

## The playtest screen

As slice 2, plus:

- **The money line** shows each player's set facts after their money.
- **A piece whose player has a yes/no fact set** (here, in jail) gets a ring on the board, and each space's
  title lists the players on it with their facts.
- **The jail buttons** ("Pay to leave jail", "Roll for a double") appear in every seat's button row like any
  other button. Each greys out with its reason when it can't be pressed.

## Proof (acceptance)

1. **Rent Day (slice 3)** compiles with no diagnostics. Its examples include the table above, and every earlier
   example still passes (the one roll-twice reason updated as above).
2. **Rent Day games still end:**
   - **2 players:** at least 9 of seeds 1 to 10 reach a winner within the cap, and the test names any seed that
     doesn't.
   - **4 and 8 players** with full sets dealt: seeds 1 to 3 reach a winner.
   - **The long-run checks** gain the jail invariants listed under Goals.
3. **The language pieces each have their own tests:**
   - player facts;
   - dice faces;
   - done-wordings;
   - "goes straight to";
   - the name clashes;
   - "a double" in a one-die game being refused.
4. **The leftovers** have tests: a card number raised, the singular attribute, and the hint wording.
5. **The playtest page** shows "in jail" on the money line and the jail buttons. This is covered by a
   happy-dom test plus a browser check.
6. Hearts, Color Match, Venom and every existing test pass, and `bun run typecheck` is clean.

## Left to the builder

- Exact wording of new phrases and messages, keeping the shapes above.
- Where the doubles count lives inside turn memory.
- Whether player facts are declared under `Board:` only or also `Players:`.
- The jailed-piece marker's look.
- The auto-player's jail choice (pay when it can, or roll), as long as games end.

## Out of scope

Slices 4 to 7 (see the overview), online play, and house rules (no Free Parking money; no jail rules beyond the
classic ones).
