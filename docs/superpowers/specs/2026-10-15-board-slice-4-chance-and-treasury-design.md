# Board Games, Slice 4: Chance and Treasury Cards

**Date:** 2026-10-15
**Status:** Ready to build. The user delegated the design calls under the goal to finish every slice (see Decisions).
**Part of:** `2026-10-15-board-games-overview-design.md`. Its decisions, calls, anti-goals and constraints apply
here.
**Builds on:** slices 1–3. Slice 3 (doubles and jail) is on the same branch, ahead of `main`.

## What this slice is

Rent Day gains its two card piles:

- Landing on a Chance or Treasury space draws the top card of that pile. Whatever the card says happens at once,
  for example:
  - move to a space, collecting 200 if the move passes Go;
  - go to the nearest station and pay double rent;
  - go back three spaces;
  - go to jail;
  - collect or pay money;
  - pay each other player, or collect from each of them;
  - pay for repairs per house and per hotel.
- A card goes to the bottom of its pile afterwards, except "Get Out Of Jail Free". A player keeps that card,
  everyone can see they hold it, and they can use it to leave jail. When used, it goes back to the bottom of the
  pile it came from.
- The last card drawn is shown in the middle of the board for every seat.

To get there, the language gains:

- **Cards and a board in one game.** Rent Day gets `Cards:` and `Table:` sections next to `Board:`. Both are
  already parts of the language; they just haven't appeared together in a game until now.
- **A card table column that holds rule sentences.** A deck's `says` column is read as lines of rules, and a
  drawn card's lines run for the player who drew it. Any card game can use this; nothing about it is specific to
  Rent Day.
- **Drawing and doing what a card says,** in one phrase.
- **Keeping a card** in a zone of one's own, and **using a kept card** from a button.
- **Moves that pass Go:**
  - "Their piece moves forward to Go.";
  - "Their piece moves forward to the nearest station.";
  - "Their piece moves back 3 spaces." (backwards, so it never passes Go).
- **Money between all players:**
  - "They pay 50 money to each other player.";
  - "They get 50 money from each other player.";
  - "They pay 25 for each of their houses."

## Decisions

1. **The user set the goal "let's finish all the slices"** and earlier left the design calls to the builder ("I'll
   leave the rest to you, I trust your judgement"). There was no question round for this slice. Every call below is
   the builder's, listed so the user can check it.
2. **Classic card behaviour** (overview): cards move, pay or charge you, and "Get out of jail free" is kept until
   used.

## Calls (the builder's)

- **A card's rules live in its table, in a column named `says`.**
  - Each cell holds one or more sentences, each ending with a full stop, and each sentence is one effect line.
  - The compiler reads every `says` cell of every deck once, the way it reads lines under `Then:`. A sentence
    the library doesn't know gets the usual hint and stub, reported on the table row's line.
  - "says" is the only column name the language gives meaning to. It is general: any card game can give cards
    rules.
- **The draw is one phrase:** "They draw from the chance pile and do what it says." It works like this:
  - the top card is taken;
  - its sentences run for the drawing player, in order;
  - unless one of those sentences kept the card, it then goes to the bottom of the same pile;
  - an empty pile is an error: "There is no card to draw in the chance pile.";
  - the card is face up while it is being read.
- **Inside a card's sentences:**
  - "they" is the player who drew it;
  - "it" is the space their piece is on, read again for each sentence, so "Their piece moves forward to the
    nearest station. If someone else owns it, they pay its rent to its owner." pays for the station they moved to;
  - "this card" is the card itself.
- **Double rent at the nearest station is written in the card, not the engine.** Moving there lands, and the
  lands-on rent rule charges once. The card's own second sentence charges the same rent again.
- **The "nearest utility" card is simplified** to moving forward to the nearest utility. Its rent is the usual
  4 or 10 times the roll that brought them to the Chance space, not a fresh roll times 10. This is a recorded
  simplification, chosen because a roll inside a card would need a roll phrase this slice doesn't otherwise need.
- **Keeping a card:**
  - "They keep this card in their kept cards." moves it to a zone of each player, declared in `Table:` as
    "Each player has a kept cards row that everyone can see.";
  - a kept card stays face up;
  - a card is not put back under its pile once it has been kept.
- **Using a kept card is a button:**
  - Rent Day writes "A player may use a get out of jail free card." with the lines
    `Only if they are in jail.` and `Only if their kept cards has a Get Out Of Jail Free.`;
  - its Then lines free them, reset jail turns, and return "a Get Out Of Jail Free from their kept cards" to the
    bottom of the pile it came from;
  - "the pile it came from" is the zone its deck starts in, so each pile gets its own card back.
- **Moves that pass:**
  - "moves forward to <space>" walks space by space exactly like a roll. Every space it moves onto is passed, the
    last one included, and then it lands. So "Advance To Go" pays the Go salary, as landing on Go by a roll does;
  - "the nearest <kind of space>" is the first such space ahead;
  - "moves back <n> spaces" walks backwards and only lands; nothing is "passed" going backwards. This is a
    builder call that matches the classic "Go back three spaces" never paying Go.
- **Paying everyone uses players still in.** "They pay 50 money to each other player." pays each player still in.
  "They get 50 money from each other player." takes from each, even into debt; the existing less-than-0 rule
  then puts a player out. Raising money is slice 5.
- **Repairs:**
  - "They pay 25 for each of their houses." counts the number fact named by the bank item over the spaces they
    own;
  - "They pay 100 for each of their hotels." counts the spaces they own that have the flag.
  - Both use the same pairing of bank item and fact as slice 2's "go back to the bank".
- **The page shows the last card drawn** in the middle of the board, for example "p0 drew from the chance pile:
  Advance To Go — Their piece moves forward to Go.". It stays until the next draw.
  - A seat's cards in public zones of their own (here, kept cards) are listed on the money line by name:
    "· Get Out Of Jail Free". This is a general rule; no page code names a card.
  - The piles themselves are not drawn on the board page.
- **Examples can arrange a pile:** "Given the chance pile has an Advance To Go and a Go To Jail" puts those
  cards in it, the first named on top. The expectation "the top card of the chance pile is …" already exists.
- **The decks** (unbranded wording, classic effects, 16 cards each) are in the table below.

## Goals

- Rent Day (slice 4) compiles with no diagnostics. Its examples cover drawing, moving with and without passing
  Go, nearest-station double rent, going back three, going to jail by a card, money both ways between players,
  repairs, keeping and using Get Out Of Jail Free, and a card going to the bottom of its pile.
- Games still end: at least 9 of 10 ordinary 2-player seeds, and the 4- and 8-player full-set variants with fixed
  seeds.
- The long runs check that the 32 cards are never lost: each pile plus every player's kept cards always holds 16
  of that deck. Houses and hotels stay conserved, and the jail invariants still hold.
- The page shows the last card drawn and each player's kept cards. The "Use a get out of jail free card" button
  appears, and greys out with reasons like any other button.
- Hearts, Color Match, Venom, and slices 1–3 behave as before.

## Non-goals

- Trading or selling a kept card (slice 7).
- Raising money to pay a card's charge (slice 5).
- A drawn card animated or drawn as a Pixi card on the board page.
- House rules (Free Parking money and the like).

## Anti-goals

- **No Monopoly in the language core.** "Chance", "Treasury", "Get Out Of Jail Free" and the amounts live in Rent
  Day's text. "says", "draw", "keep" and "nearest" are general words.
- **A card that silently does nothing.** Every sentence in a `says` cell compiles, or is reported on its row.
- **A card lost or duplicated.** Each pile plus the kept cards always holds its deck exactly.
- **A drawn card seen before it is drawn.** Pile order stays hidden; only the drawn card is shown.

## The decks

Positions on Rent Day's board: Go 0, Dock Road 11, North Station 5, Bell Square 24, The Promenade 39, and Jail 10.

**Chance pile** (`| name | says | copies |`):

| name | says |
|---|---|
| Advance To Go | Their piece moves forward to Go. |
| Advance To Bell Square | Their piece moves forward to Bell Square. |
| Advance To Dock Road | Their piece moves forward to Dock Road. |
| Advance To The Nearest Utility | Their piece moves forward to the nearest utility. |
| Advance To The Nearest Station (2 copies) | Their piece moves forward to the nearest station. If someone else owns it, they pay its rent to its owner. |
| Bank Pays A Dividend | They get 50 money. |
| Get Out Of Jail Free | They keep this card in their kept cards. |
| Go Back Three Spaces | Their piece moves back 3 spaces. |
| Go To Jail | Their piece goes straight to Jail. They are in jail. |
| General Repairs | They pay 25 for each of their houses. They pay 100 for each of their hotels. |
| Speeding Fine | They pay 15. |
| A Trip To North Station | Their piece moves forward to North Station. |
| A Walk On The Promenade | Their piece moves forward to The Promenade. |
| Chair Of The Board | They pay 50 money to each other player. |
| Building Loan Matures | They get 150 money. |

**Treasury pile:**

| name | says |
|---|---|
| Advance To Go | Their piece moves forward to Go. |
| Bank Error In Your Favour | They get 200 money. |
| Doctor's Fee | They pay 50. |
| Sale Of Stock | They get 50 money. |
| Get Out Of Jail Free | They keep this card in their kept cards. |
| Go To Jail | Their piece goes straight to Jail. They are in jail. |
| Opera Night | They get 50 money from each other player. |
| Holiday Fund Matures | They get 100 money. |
| Tax Refund | They get 20 money. |
| Life Insurance Matures | They get 100 money. |
| Hospital Fees | They pay 100. |
| School Fees | They pay 50. |
| Consultancy Fee | They get 25 money. |
| Street Repairs | They pay 40 for each of their houses. They pay 115 for each of their hotels. |
| Beauty Contest Prize | They get 10 money. |
| Inheritance | They get 100 money. |

Two decks share card names ("Advance To Go", "Get Out Of Jail Free", "Go To Jail"). Matching by name finds
either. The button's return line says "the pile it came from", so each card goes home.

## What the designer writes

This is the shape; the builder settles the exact wording. Every line must compile once the slice is done.

```text
Cards:
  A deck called chance cards, starting in the chance pile:
    | name          | says                               | copies |
    | Advance To Go | Their piece moves forward to Go.   | 1      |
    …
  A deck called treasury cards, starting in the treasury pile:
    …

Table:
  The chance pile is a pile in the center that no one can see.
  The treasury pile is a pile in the center that no one can see.
  Each player has a kept cards row that everyone can see.

Setup:
  Shuffle the chance pile.
  Shuffle the treasury pile.

Phase: playing
  …
  A player may use a get out of jail free card.
    Only if they are in jail.
    Only if their kept cards has a Get Out Of Jail Free.
    Then:
      They are not in jail.
      Their jail turns go back to 0.
      A Get Out Of Jail Free from their kept cards goes to the bottom of the pile it came from.
  When a player lands on a chance space:
    They draw from the chance pile and do what it says.
  When a player lands on a treasury space:
    They draw from the treasury pile and do what it says.
```

### Examples to cover (Rent Day)

Chance spaces are at 7, 22 and 36, and Treasury spaces at 2, 17 and 33. Three spaces are called "Chance", so an
example reaches one by rolling: from Go, 3 and 4 lands on Chance (7). From Crown Row (31), 2 and 3 lands on
Chance (36).

| Example | Arrange | Expect |
|---|---|---|
| Advance To Go collects 200 | Advance To Go on top; p0 rolls 3+4 from Go onto Chance (7) | p0 on Go, 1700 money |
| A card moving past Go pays the salary | Advance To Bell Square on top; p0 rolls 2+3 from Crown Row onto Chance (36) | p0 on Bell Square, 1700 money |
| Nearest station pays double rent | p1 owns East Station; nearest-station card on top; p0 rolls 3+4 from Go | p0 on East Station, 1450 money; p1 1550 |
| Go Back Three Spaces lands without passing | Go Back Three Spaces on top; p0 rolls 3+4 from Go | p0 on Income Tax, 1300 money |
| Go To Jail card | Go To Jail on top; p0 rolls 3+4 from Go | p0 on Jail, in jail, 1500 money |
| Pay each other player | 3 players; Chair Of The Board on top; p0 rolls 3+4 from Go | p0 1400, p1 1550, p2 1550 |
| Collect from each other player | 3 players; Opera Night on top of the treasury pile; p0 rolls 1+1 from Go onto Treasury (2) | p0 1600, p1 1450, p2 1450 |
| General repairs | p0 owns the brown set, Mill Lane and Ferry Row with 2 houses each; General Repairs on top; p0 rolls 3+4 from Go | p0 1400 money (4 houses × 25) |
| Keeping Get Out Of Jail Free | Get Out Of Jail Free on top; p0 rolls 3+4 from Go | p0's kept cards has a Get Out Of Jail Free, and the chance pile does not |
| Using Get Out Of Jail Free | p0 in jail on Jail with a Get Out Of Jail Free kept | p0 not in jail; the top card is unchanged and the card is last in the chance pile |
| A drawn card goes to the bottom | the chance pile has Bank Pays A Dividend then Speeding Fine; p0 rolls 3+4 from Go | p0 1550 money; the top card of the chance pile is Speeding Fine |

The builder computes exact positions and amounts from the board, and keeps every number checked against it.

## What the engine and language gain

All of it is additive.

1. **The `says` column.**
   - A card set whose table has a `says` column compiles each cell to a list of effect refs.
   - They are stored in the compiled game, keyed by the card's identity, so they are Json and the cells are not
     re-parsed at play.
   - A sentence's diagnostics point to the table row's line.
   - The sentences are compiled as lines about a player: "they" is the drawer, "it" is their current space, and
     "this card" is the card.
2. **Phrases:**
   - effect `they draw from {zone} and do what it says` (needs a player);
   - effect `they keep this card in their {perzone}` (allowed only in a `says` cell);
   - effects `their piece moves forward to {space}`, `their piece moves forward to the nearest {spacekind}`,
     `their piece moves back {int} spaces`;
   - effects `they pay {int} {counter} to each other player`, `they get {int} {counter} from each other player`,
     `they pay {int} for each of their {banked}`;
   - condition `their {perzone} has {card}`;
   - effect `{card} from their {perzone} goes to the bottom of the pile it came from`;
   - example Given `{zone} has {cardlist}` for a pile: the first named card goes on top. This may already hold;
     the builder checks.
3. **Running a card.**
   - The runtime runs a drawn card's refs with the subject `{ player: drawer, space: their space now, card: id }`.
   - The space is recomputed before each sentence.
   - Movement inside a card announces passes and landings like any move, so a card can land on another Chance
     space and draw again. Slice 1's depth cap of 100 still bounds this.
4. **Views.**
   - `BoardView.lastDrawn: { seat, zone, name, says } | null`. It is public, set by the draw phrase, kept in
     `lang:*` state, and replaced by the next draw.
   - `BoardView.playerCards: { [seat]: string[] }`: card names in each seat's public per-player zones.
5. **Page.**
   - The last draw is shown in the board's middle.
   - Kept card names go on the money line.
   - The new button behaves like any other.

## Proof (acceptance)

1. **Rent Day (slice 4)** compiles with no diagnostics, and its new examples cover the table above. Every earlier
   example passes unchanged.
2. **Games still end** (2 players: at least 9 of 10 seeds; 4 and 8 players with full sets, seeds 1–3). The long runs
   gain the card-conservation invariant and still check houses, hotels and jail.
3. **The language pieces each have tests:**
   - a `says` sentence the library doesn't know is reported on its row;
   - "it" in a card means the current space;
   - keeping a card;
   - an empty pile;
   - forward with passing, nearest, and back without passing;
   - the each-other-player payments and the repairs;
   - the last-drawn view, including that a pile's order never reaches a view.
4. **The playtest page** shows the last card and the kept cards. A happy-dom test and a browser check cover
   this.
5. Hearts, Color Match, Venom and every existing test pass, and `bun run typecheck` is clean.

## Left to the builder

- Exact wording of phrases and messages, within these shapes.
- Where compiled `says` refs live in `CompiledGame`.
- The look of the last-drawn panel.
- The auto-player uses a Get Out Of Jail Free whenever it can.
- The exact example positions and numbers, computed from the board.

## Out of scope

Slices 5 to 7, online play, house rules, and animated cards.
