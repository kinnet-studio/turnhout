# Board Games, Slice 7: Trading

**Date:** 2026-10-15
**Status:** Ready to build. The user delegated the design calls under the goal to finish every slice (see Decisions).
**Part of:** `2026-10-15-board-games-overview-design.md`. Its decisions, calls, anti-goals and constraints apply
here.
**Builds on:** slices 1–6 (slices 3 to 6 are on the same branch, ahead of `main`). Slice 6's interrupt and return,
amount buttons, game facts and "the next player on the left who is …" are used here as they are.

## What this slice is

On their own turn, a player can trade with another player. Trades cover spaces, money and kept cards:

- The proposer presses "Trade with another player" and picks the other player. Play moves to a trade phase,
  still on the proposer's turn.
- The proposer builds the offer:
  - spaces they own, which they offer;
  - spaces the other player owns, which they ask for;
  - an amount of money offered, and an amount asked for;
  - their kept cards offered, or the other player's kept cards asked for.
- The proposer then proposes the trade, and it becomes the other player's turn in the trade phase. Before
  proposing, the proposer can cancel.
- The other player accepts or declines.
  - Accepting swaps everything in the offer at once.
  - Declining changes nothing.
  - Either way, play goes back to the proposer's turn exactly where it was.
- A street can't be traded while any street of its color has a building, as in the classic rules. A mortgaged
  space can be traded and stays mortgaged.

To get there, the language gains:

- **Buttons that pick a player:** "A player may trade with another player." The page shows the other players to
  pick from, and "that player" in the button's lines is the one picked.
- **Acting on whoever holds a flag:**
  - "the player who is proposing" as someone to pay or give to;
  - a one-line form, "For the player who is proposing, they own every space that is asked for.", that runs the
    rest of the line as that player.
- **Acting on every flagged space or card:**
  - "They own every space that is offered.";
  - "No space is offered.";
  - "Every card in their kept cards is offered.";
  - "Every card that is offered goes to their kept cards.".
- **Conditions over flags:** "some space is offered", "some card is asked for", and targets such as "a space the
  player who is the trade partner owns".
- **A second way into a phase:** "The trade phase starts with them." It interrupts like slice 6's auction, but the
  player who pressed stays current.

## Decisions

1. **The user set the goal "let's finish all the slices"** and earlier left the design calls to the builder ("I'll
   leave the rest to you, I trust your judgement"). There was no question round for this slice. Every call below is
   the builder's, listed so the user can check it.
2. **The overview's slice 7:** players offer each other properties, money and kept cards. One player proposes, and
   the other accepts or declines.

## Calls (the builder's)

- **The trade is written in Rent Day's text** from general pieces: a phase, player, space and card flags, two game
  numbers, amount buttons, player-picking buttons, and interrupt and return. The engine knows nothing about trades.
  "trade", "offer", "propose", "partner" and "asked for" stay in Rent Day's text.
- **Trades happen on the proposer's own turn, in the playing phase.** This can be before or after they roll, and
  in jail too. Classic Monopoly lets players trade at any time; this is a recorded simplification. It keeps one
  actor at a time, as auctions do.
- **No trading while anyone owes.** The trade button carries slice 5's turn gate,
  `Only if no player has less than 0 money.`. A player in debt raises money with the slice 5 buttons.
- **One open trade at a time,** using slice 6's single interruption.
- **A player can make any number of trades in a turn.** The auto-player makes at most one (see below).
- **Picking a player.** A button whose wording ends with "another player" carries a seat in its move.
  - It offers every other player still in.
  - "that player" reads the pick in its lines.
  - A missing pick, the presser themselves, or a player who is out is refused with "Pick another player to trade
    with." (built from the button's words).
  - Examples say "When p0 trades with p1". The page shows one small button per other player.
- **Offering kept cards is all or nothing.** "Offer their kept cards" flags every card in the proposer's kept
  cards, and "ask for the trade partner's kept cards" flags every card in the other player's.
  - Rent Day has at most two keepable cards, so picking single cards is left out (a recorded simplification).
  - Card flags keep the two sides apart when the cards change hands, so the order of the accept lines can't send
    a card back.
- **"For the player who is {flag}, …"** mirrors slice 5's "If …, …".
  - It runs the rest of the line with "they" meaning the one player holding that flag.
  - If no player holds it, that is an error naming the flag. If two do, it is an error too.
- **An empty trade can't be proposed.** Propose needs something on either side: a space, a card, or money
  offered or asked for that is more than 0.
- **The other player must be able to pay.** Accepting needs `they have at least the money asked for in money`.
  The proposer's offered money is checked when they offer it, and nothing can change it before the answer.
- **Mortgaged spaces trade as they are,** with no fee. The classic 10% fee is a non-goal.
- **The page marks the offer:**
  - spaces show their set flags as tags ("offered", "asked for");
  - flagged kept cards are marked;
  - the money numbers are on the bank line (slice 6's game facts);
  - the seat status names the phase.
- **The auto-player:**
  - **As proposer:** on its own turn, at most once a turn. If it owns all but one space of a color and another
    player still in owns the last one, with no building on that color, it trades with that player. It asks for
    that space, offers twice its price in money if it would keep 200 after paying, and proposes. Otherwise it
    doesn't trade.
  - **As the other player:** it accepts when the money offered, less the money asked for, is at least 1.5 times
    the price of the spaces asked for, less the price of the spaces offered, and it can pay. Otherwise it
    declines.
  - "At most once a turn" reads the turn log ("they have traded this turn"). Slice 6 keeps the press that starts
    an interruption in the restored turn log.

## Goals

- Rent Day (slice 7) compiles with no diagnostics, and its examples cover every rule below.
- Games still end: at least 9 of 10 ordinary 2-player seeds, and the 4- and 8-player full-set variants with fixed
  seeds. Trades complete sets, so games should end sooner.
- **The long runs check:**
  - after every trade, no space, card or player keeps a trade flag, and both money numbers are back to 0;
  - the money of all players together is the same before and after a trade;
  - every space has at most one owner, and no traded street's color has a building;
  - play is back with the proposer, in the playing phase, with their turn memory as before;
  - trades happen (accepted ones at least);
  - all earlier invariants still hold.
- The page shows the player picker, the offer's flags on spaces and cards, the money numbers, and the other
  player's accept and decline buttons.
- Hearts, Color Match, Venom and slices 1–6 behave as before. Rent Day's own text changes only by adding the trade.

## Non-goals

- Trading at any time, or with several players at once.
- Counter-offers. The other player declines, and the proposer can build a new offer.
- Picking single kept cards.
- The 10% fee on mortgaged spaces.
- Trading buildings, or promises of future rent.

## Anti-goals

- **No Monopoly in the language core.** "trade", "offer", "propose" and "partner" stay in Rent Day's text.
  "another player", "that player", "the player who is …", "every space that is …" and "for the player who is …" are
  general.
- **A trade that never ends,** or one that loses the proposer's turn.
- **Money or cards created or lost in a trade,** or a space with two owners.
- **Trading a street whose color has a building.**

## What the designer writes

This is the shape; the builder settles exact wording. Every line must compile once the slice is done.

```text
Board:
  …
  Spaces can be offered.
  Spaces can be asked for.
  Cards can be offered.
  Cards can be asked for.
  Players can be proposing.
  Players can be the trade partner.
  The game can have a money offered.      (wording of the two numbers is the builder's)
  The game can have a money asked for.

Phase: playing
  …
  A player may trade with another player.
    Only if no player has less than 0 money.
    Then:
      They are proposing.
      That player is the trade partner.
      The money offered is 0.
      The money asked for is 0.
      The trade phase starts with them.

Phase: trade
  Hint: Offer and ask for spaces, money and kept cards, then propose. The other player accepts or declines.
  A player may offer a space they own.
    Only if they are proposing.
    Only if it is not offered.
    Only if one of:
      it is not a street
      no street of its color has a building
    Then:
      It is offered.
  A player may ask for a space the trade partner owns.
    Only if they are proposing.
    Only if it is not asked for.
    Only if one of:
      it is not a street
      no street of its color has a building
    Then:
      It is asked for.
  A player may offer an amount.
    Only if they are proposing.
    Only if they have at least the amount in money.
    Then:
      The money offered is the amount.
  A player may ask for an amount.
    Only if they are proposing.
    Then:
      The money asked for is the amount.
  A player may offer their kept cards.
    Only if they are proposing.
    Only if their kept cards are not empty.
    Then:
      Every card in their kept cards is offered.
  A player may ask for the trade partner's kept cards.
    Only if they are proposing.
    Only if the trade partner's kept cards are not empty.
    Then:
      Every card in the trade partner's kept cards is asked for.
  A player may propose the trade.
    Only if they are proposing.
    Only if one of:
      some space is offered
      some space is asked for
      some card is offered
      some card is asked for
      the money offered is more than 0
      the money asked for is more than 0
  A player may cancel the trade.
    Only if they are proposing.
    Then:
      (clear the offer)
      Go back to the interrupted turn.
  A player may accept the trade.
    Only if they are the trade partner.
    Only if they have at least the money asked for in money.
    Then:
      They own every space that is offered.
      Every card that is offered goes to their kept cards.
      They pay the money asked for to the player who is proposing.
      For the player who is proposing, they own every space that is asked for.
      For the player who is proposing, every card that is asked for goes to their kept cards.
      For the player who is proposing, they pay the money offered to the player who is the trade partner.
      (clear the offer)
      Go back to the interrupted turn.
  A player may decline the trade.
    Only if they are the trade partner.
    Then:
      (clear the offer)
      Go back to the interrupted turn.
  After a player proposes the trade, the turn passes to the next player on the left who is the trade partner.
```

"(clear the offer)" stands for these lines, written out in each button:

```text
      No space is offered.
      No space is asked for.
      No card is offered.
      No card is asked for.
      No player is proposing.
      No player is the trade partner.
      The money offered is 0.
      The money asked for is 0.
```

Notes:
- **"the trade partner's kept cards" and "a space the trade partner owns"** are the "player who is {flag}" pieces
  in their short form. "the trade partner" works where the flag starts with "the". The builder settles whether the
  short form is a general rule, or whether the text spells out "the player who is the trade partner".
- **The proposer keeps the turn while building the offer.** Only propose has an After line. The planner checks that
  slice 6's phase without "Players take turns." keeps the current player when a button has no After line.
- **The streets-with-buildings condition** reuses the wording slice 5 settles for mortgaging. The plan copies the
  final wording from Rent Day's text.
- **The other player can't act before the proposal.** Accept and decline are on their buttons, but the turn is
  still the proposer's.

### Examples to cover (Rent Day)

| Example | Expect |
|---|---|
| Starting a trade | p0 trades with p1: the phase is trade, it is p0's turn, p0 is proposing, p1 is the trade partner |
| You can't trade with yourself or nobody | refused with the pick message |
| No trading while someone owes | refused with the owes reason |
| Building an offer | p0 offers a street, asks for one of p1's, offers 100: the flags are set and the money offered is 100 |
| You can only offer your own spaces | p0 offers p1's street: refused |
| A built-on color can't be traded | refused |
| An empty trade can't be proposed | refused with the one-of reason |
| Proposing hands the turn over | p0 proposes: it is p1's turn in trade |
| The other player answers only after the proposal | p1 accepts before p0 proposes: refused, not p1's turn |
| Accepting swaps everything | owners swapped, 100 moved, every flag cleared, both numbers 0, p0's turn in playing |
| Declining changes nothing | owners and money as before, every flag cleared, p0's turn in playing |
| Cancelling | p0 cancels before proposing: nothing changes, p0's turn in playing |
| Kept cards change hands | p0 asks for p1's kept cards: after p1 accepts, p0's kept cards has a Get Out Of Jail Free and p1's are empty |
| Kept cards both ways | both sides offer kept cards: each ends with the other's, none come back |
| The other player must be able to pay | p1 has less than the money asked for: accept refused |
| A mortgaged space trades as it is | after the trade it is mortgaged and owned by the other player |
| The turn resumes | p0 had rolled before trading: after the trade p0 may not roll again, and may end their turn |

The builder computes positions and money from the board.

## What the engine and language gain

All of it is additive, apart from Rent Day's own text.

1. **Player-picking buttons.**
   - Compiling: a wording ending in " another player".
   - The move: `player` (a seat).
   - The handler refuses a missing pick, the presser, an unknown seat, or a seat that is out.
   - In the env: "that player" reads `env.move.player`.
   - Examples: `{player} {pickaction} {player}`.
   - The view: `ActionView.players: string[]`, the seats it may pick.
2. **Flags across the board:**
   - effects: `every space that is {spaceflag}` as an owning target ("they own every space that is …");
   - `no space is {spaceflag}`, `no card is {cardflag}`;
   - `every card in {zone} is {cardflag}`;
   - `every card that is {cardflag} goes to {zone}`;
   - conditions: `some space is {spaceflag}`, `some card is {cardflag}`.
   - Card flags are kept by card id in `lang:facts` (slice 4's card facts), so they follow a card between zones.
3. **The player who holds a flag:**
   - `the player who is {playerflag}` as a payee or recipient;
   - its zone form ("the kept cards of the player who is …");
   - the target `a space the player who is {playerflag} owns`;
   - the line form `for the player who is {playerflag}, {effect}`;
   - `{player} is {playerflag}` for "that player is the trade partner";
   - an error when no player holds the flag, or more than one does.
4. **Game numbers paid to a player:** `they pay the {gamenumber} to {player}`. Slice 6 has paying one to the bank.
5. **Entering a phase without passing the turn:** `the {phase} phase starts with them`. It uses slice 6's
   interrupt and return, and keeps the press in the restored turn log.
6. **Page:**
   - the player picker;
   - space flag tags;
   - marked cards in kept-card rows;
   - the money numbers on the bank line, from slice 6.

## Proof (acceptance)

1. **Rent Day (slice 7)** compiles with no diagnostics. Its examples cover the table above, and every earlier
   example still passes unchanged.
2. **Games still end:**
   - 2 players: at least 9 of 10 seeds;
   - 4 and 8 players with full sets: seeds 1–3.
   - The long runs gain the trade checks above, and accepted trades happen in them.
3. **The language pieces each have tests:**
   - player-picking buttons, including refusals;
   - every and no over space and card flags;
   - card flags following a card between zones;
   - "the player who is", including the none and two-holders errors;
   - the "for the player who is" line;
   - entering a phase with them.
4. **The playtest page** shows the picker, the tags, the marked cards and the accept and decline buttons, with a
   happy-dom test and a browser check.
5. Hearts, Color Match, Venom and every existing test pass, and `bun run typecheck` is clean.

## Left to the builder

- Exact phrase wordings and messages, keeping these shapes.
- The game numbers' wording ("money offered" may need to read "cash offered" or similar if "money" clashes with the
  pay-with counter's name).
- The auto-player's numbers.
- The look of the picker and tags.

## Out of scope

Open trading at any time, counter-offers, house rules, and online play. This is the last slice of the board-games
overview.
