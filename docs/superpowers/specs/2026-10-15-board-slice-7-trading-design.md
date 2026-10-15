# Board Games, Slice 7: Trading

**Date:** 2026-10-15
**Status:** Ready to build. The user delegated the design calls under the goal to finish every slice (see Decisions).
**Part of:** `2026-10-15-board-games-overview-design.md`. Its decisions, calls, anti-goals and constraints apply
here.
**Builds on:** slices 1–6 (slices 3 to 6 are on the same branch, ahead of `main`). Slice 6's interrupt and return,
amount buttons, game numbers, `no space is {spaceflag}` and "the next player on the left who is …" are used here as
they are.

## What this slice is

On their own turn, a player can trade with another player. Trades cover spaces, money and kept cards:

- The proposer presses "Trade with another player" and picks the other player. Play moves to a trade phase,
  still on the proposer's turn.
- The proposer builds the offer:
  - spaces they own, which they offer;
  - spaces the other player owns, which they ask for;
  - an amount of money offered, and an amount asked for;
  - everything they keep (their kept cards), or everything the other player keeps.
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
- **Buttons that pick a space without "on":** "A player may offer a space they own." The trailing target phrase picks
  the space, as "build a house on a street they own" does today.
- **Naming whoever holds a flag:** "the player who is proposing", or for a flag that starts with "the", just "the trade
  partner". It works as someone to pay, as the owner in a target ("a space the trade partner owns"), and in a
  one-line form that runs the rest of the line as that player: "For the player who is proposing, they own every space
  that is asked for."
- **Acting on every flagged space or card:**
  - "They own every space that is offered.";
  - "Every card that is handed over goes to their kept cards.";
  - "No card is handed over.".
- **Conditions over flags:** "some space is offered" and "some card is claimed".
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
  numbers, amount buttons, player and space picks, and interrupt and return. The engine knows nothing about trades.
  "trade", "offer", "propose", "partner", "cash offer", "cash request", "handed over", "claimed" and "asked for" stay
  in Rent Day's text.
- **Trades happen on the proposer's own turn, in the playing phase.** This can be before or after they roll, and
  in jail too. Classic Monopoly lets players trade at any time; this is a recorded simplification. It keeps one
  actor at a time, as auctions do.
- **No trading while anyone owes.** The trade button carries slice 5's turn gate,
  `Only if no player has less than 0 money.`. A player in debt raises money with the slice 5 buttons.
- **One open trade at a time,** using slice 6's single interruption.
- **A player can make any number of trades in a turn.** The auto-player makes at most one (see below).
- **Nothing can be taken back out of an offer.** The proposer cancels and starts again. This is a recorded
  simplification.
- **Picking a player.**
  - A button whose wording ends with " another player" picks a seat, with the base being the words before it
    ("trade with").
  - The pick rides on the press as `Subject.picked`, like slice 6's amount, never on `env.move`.
  - It offers every other player still in. "that player" phrases read the pick and carry a `needsPick` meta, reported
    outside such a button.
  - A missing pick, an unknown seat, the presser themselves, or a player who is out is refused with "Pick another
    player to trade with." (built from the button's words), before the `Only if` lines.
  - Examples say "When p0 trades with p1". "When p0 trades with another player" sends no pick, and is refused.
  - "the other player" (slice 2) means the one other player of a 2-player game. It is not used here.
- **Picking a space without "on" (builder check Q3).** Today a button picks a space only when its wording ends in
  "on a …". A wording whose trailing " a …" or " an …" part reads as a target phrase now picks too: "offer a space they
  own" has base "offer" and target "a space they own".
  - The "on a …" form stays as it is.
  - Examples say "When p0 offers Mill Lane" (`{player} {targetaction} {space}`), beside the "on {space}" form.
  - No existing button in Rent Day, Venom, Hearts or Color Match ends in a target phrase, so nothing changes for them.
  - A new compile check refuses two buttons in one phase that show the same label.
  - The amount buttons are worded "offer to pay an amount" and "ask to be paid an amount", so their labels differ from
    the space picks.
- **The card flags have their own names (Q1).** A fact name is declared once per game, so the card flags are
  "handed over" and "claimed", while the space flags are "offered" and "asked for". Card flags live in the card's
  own `data`, as card facts already do, so they follow a card between zones.
- **The kept-card buttons don't name the zone (Q2).** A button line with "card" or "cards" in it is read as a card
  move, so the buttons are "offer everything they keep" and "ask for everything the trade partner keeps". Their
  `Only if` and `Then` lines can name the kept cards.
- **Offering kept cards is all or nothing.** Rent Day has at most two keepable cards, so picking single cards is
  left out (a recorded simplification).
  - Card flags keep the two sides apart when the cards change hands, so the order of the accept lines can't send a
    card back.
  - Asking for the other player's kept cards has no "not empty" check: there is no zone owner for "the trade
    partner". If they keep nothing, the ask flags nothing, and propose still needs something real.
- **The player who holds a flag (Q6).**
  - `{holder}` is a new parameter type. It reads "the player who is {playerflag}", or "{playerflag}" alone when the
    flag's name starts with "the" ("the trade partner").
  - It resolves through one helper that throws a RuleError naming the flag when no player still in holds it, or when
    more than one does.
  - No new zone owner is added. Zones of the flag holder are reached with the "For …" line, where "their" means the
    holder.
- **"For {holder}, {effect}" (Q7)** mirrors the existing "If …, …" frame. It runs the effect with the subject's player
  set to the holder, keeping the press's space, amount and pick. Every place that unwraps "If" lines unwraps "For" too
  (`rollsTheDice`, `warnUnreachable`).
- **The game numbers (Q4)** are "The game has a cash offer of 0." and "The game has a cash request of 0.". The
  phrases they need beyond slice 6:
  - `the {gamenumber} is more than {int}`;
  - `they have at least the {gamenumber} in {counter}`;
  - `they pay the {gamenumber} to {holder}`.
- **An empty trade can't be proposed.** Propose needs something on either side: a space or a card flagged, or a cash
  offer or cash request that is more than 0.
- **The other player must be able to pay.** Accepting needs `they have at least the cash request in money`. The
  proposer's cash offer is checked when they offer it, and nothing can change it before the answer.
- **The building check is slice 5's single line (Q10):** `Only if no street of its color has a building.` It already
  holds for a space with no color.
- **Mortgaged spaces trade as they are,** with no fee. The classic 10% fee is a non-goal.
- **The page marks the offer (Q8):**
  - slice 5 stripes space flags that have no bank item; each set flag now also shows as a small text tag, so
    "mortgaged" and "offered" read apart;
  - kept cards carry their set flags in the view, as a field parallel to `playerCards`, and the money line marks them
    ("Get Out Of Jail Free (handed over)");
  - the two cash numbers are on the bank line (slice 6's game numbers, hidden at 0);
  - the seat status names the phase (slice 6).
- **The auto-player (Q12)** lives in `rent-day.test.ts` beside slice 5's settle-debts step and slice 6's auction step.
  - **As proposer:** on its own turn, at most once a turn. If it owns all but one space of a color and another
    player still in owns the last one, with no building on that color, it trades with that player. It asks for
    that space, offers twice its price in cash if it would keep 200 after paying, and proposes. Otherwise it
    doesn't trade.
  - **As the other player:** it accepts when the cash offer, less the cash request, is at least 1.5 times the price
    of the spaces asked for, less the price of the spaces offered, and it can pay. Otherwise it declines.
  - Its proposals are always accepted, so declines and cancels are covered by examples, not by the long runs.

## Goals

- Rent Day (slice 7) compiles with no diagnostics, and its examples cover every rule below.
- Games still end: at least 9 of 10 ordinary 2-player seeds, and the 4- and 8-player full-set variants with fixed
  seeds. Trades complete sets, so games should end sooner.
- **The long runs check:**
  - after every trade, no space, card or player keeps a trade flag (read with `=== true`), and both cash numbers are
    back to 0;
  - the money of all players together is the same before and after a trade;
  - every space has at most one owner, and no traded street's color has a building;
  - play is back with the proposer, in the playing phase, with their turn memory as before plus the trade press;
  - accepted trades happen;
  - all earlier invariants still hold, with the turn check widened: proposing hands the turn to the partner, and an
    answer or a cancel hands it back.
- The page shows the player picker, the offer's tags on spaces and marks on cards, the cash numbers, and the other
  player's accept and decline buttons.
- Hearts, Color Match, Venom and slices 1–6 behave as before. Rent Day's own text changes only by adding the trade.

## Non-goals

- Trading at any time, or with several players at once.
- Counter-offers. The other player declines, and the proposer can build a new offer.
- Taking one thing back out of an offer.
- Picking single kept cards.
- The 10% fee on mortgaged spaces.
- Trading buildings, or promises of future rent.
- A zone owner for flag holders ("the trade partner's kept cards").

## Anti-goals

- **No Monopoly in the language core.** The trade's words stay in Rent Day's text. "another player", "that player",
  "the player who is …", "for …", "every space that is …" and target picks without "on" are general.
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
  Cards can be handed over.
  Cards can be claimed.
  Players can be proposing.
  Players can be the trade partner.
  The game has a cash offer of 0.
  The game has a cash request of 0.

Phase: playing
  …
  A player may trade with another player.
    Only if no player has less than 0 money.
    Then:
      They are proposing.
      That player is the trade partner.
      The cash offer is 0.
      The cash request is 0.
      The trade phase starts with them.

Phase: trade
  Hint: Offer and ask for spaces, cash and kept cards, then propose. The other player accepts or declines.
  A player may offer a space they own.
    Only if they are proposing.
    Only if it is not offered.
    Only if no street of its color has a building.
    Then:
      It is offered.
  A player may ask for a space the trade partner owns.
    Only if they are proposing.
    Only if it is not asked for.
    Only if no street of its color has a building.
    Then:
      It is asked for.
  A player may offer to pay an amount.
    Only if they are proposing.
    Only if they have at least the amount in money.
    Then:
      The cash offer is the amount.
  A player may ask to be paid an amount.
    Only if they are proposing.
    Then:
      The cash request is the amount.
  A player may offer everything they keep.
    Only if they are proposing.
    Only if their kept cards are not empty.
    Then:
      Every card in their kept cards is handed over.
  A player may ask for everything the trade partner keeps.
    Only if they are proposing.
    Then:
      For the trade partner, every card in their kept cards is claimed.
  A player may propose the trade.
    Only if they are proposing.
    Only if one of:
      some space is offered
      some space is asked for
      some card is handed over
      some card is claimed
      the cash offer is more than 0
      the cash request is more than 0
  A player may cancel the trade.
    Only if they are proposing.
    Then:
      (clear the offer)
      Go back to the interrupted turn.
  A player may accept the trade.
    Only if they are the trade partner.
    Only if they have at least the cash request in money.
    Then:
      They own every space that is offered.
      Every card that is handed over goes to their kept cards.
      They pay the cash request to the player who is proposing.
      For the player who is proposing, they own every space that is asked for.
      For the player who is proposing, every card that is claimed goes to their kept cards.
      For the player who is proposing, they pay the cash offer to the trade partner.
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
      No card is handed over.
      No card is claimed.
      No player is proposing.
      No player is the trade partner.
      The cash offer is 0.
      The cash request is 0.
```

Notes:
- **The trade phase is written after playing,** since the game starts in the first written phase. `warnUnreachable`
  counts "starts with them" (inside "If" and "For" lines too).
- **The proposer keeps the turn while building the offer.** Only propose has an After line, and a phase with no
  "Players take turns." keeps the current player (slice 6's builder check).
- **The other player can't act before the proposal.** Accept and decline are on their buttons, but the turn is
  still the proposer's.
- **Accept, decline and cancel aren't named by an After line,** so the flow doesn't pass the turn after "Go back".
- **Labels:** "Offer", "Ask for", "Offer to pay", "Ask to be paid", "Offer everything you keep", "Ask for everything
  the trade partner keeps", "Propose the trade", "Cancel the trade", "Accept the trade", "Decline the trade". No two
  are the same.

### Examples to cover (Rent Day)

| Example | Expect |
|---|---|
| Starting a trade | p0 trades with p1: the phase is trade, it is p0's turn, p0 is proposing, p1 is the trade partner |
| You can't trade with yourself or nobody | "trades with p0" and "trades with another player" are refused with the pick message |
| No trading while someone owes | refused with the owes reason |
| Building an offer | p0 offers a street, asks for one of p1's, offers to pay 100: the flags are set and the cash offer is 100 |
| You can only offer your own spaces | p0 offers p1's street: refused |
| A built-on color can't be traded | refused |
| An empty trade can't be proposed | refused with the one-of reason |
| Proposing hands the turn over | p0 proposes: it is p1's turn in trade |
| The other player answers only after the proposal | p1 accepts before p0 proposes: refused, not p1's turn |
| Accepting swaps everything | owners swapped, 100 moved, every flag cleared, both numbers 0, p0's turn in playing |
| Declining changes nothing | owners and money as before, every flag cleared, p0's turn in playing |
| Cancelling | p0 cancels before proposing: nothing changes, p0's turn in playing |
| Kept cards change hands | p0 asks for everything p1 keeps: after p1 accepts, p0's kept cards has a Get Out Of Jail Free and p1's are empty |
| Kept cards both ways | both sides' kept cards in the offer: each ends with the other's, none come back |
| The other player must be able to pay | p1 has less than the cash request: accept refused |
| A mortgaged space trades as it is | after the trade it is mortgaged and owned by the other player |
| The turn resumes | p0 had rolled before trading: after the trade p0 may not roll again, and may end their turn |

The builder computes positions and money from the board.

## What the engine and language gain

All of it is additive, apart from Rent Day's own text.

1. **Player-picking buttons.**
   - Compiling: a wording ending in " another player" (`picksPlayer`, base before it).
   - The pick: `Subject.picked`, filled by `aboutPress` from the move's `player`.
   - The handler refuses a missing pick, the presser, an unknown seat, or a seat that is out.
   - "that player" phrases carry `needsPick`: `that player is {playerflag}`.
   - Examples: `{player} {pickaction} {player}`.
   - The view: `ActionView.players: { [seat]: true | string } | null`, each other seat still in asked with
     `canDispatch`, the same shape as `TargetView.spaces`.
2. **Space picks without "on":** a trailing " a …" / " an …" part that reads as a target phrase; the example form
   `{player} {targetaction} {space}`; the same-label compile check.
3. **Flags across the board:**
   - effects: `they own every space that is {spaceflag}`, `no card is {cardflag}` (deletes the flag),
     `every card that is {cardflag} goes to {zone}` (relocated in state order);
   - conditions: `some space is {spaceflag}`, `some card is {cardflag}`, `{zone} are not empty`.
   - Already there: `every card in {zone} is {cardflag}`, and slice 6's `no space is {spaceflag}`.
4. **The player who holds a flag:**
   - the `{holder}` type and its resolving helper, with the none and two-holders errors;
   - the target `a space {holder} owns`;
   - the line form `for {holder}, {effect}`.
5. **Game numbers:** `the {gamenumber} is more than {int}`, `they have at least the {gamenumber} in {counter}`,
   `they pay the {gamenumber} to {holder}`.
6. **Entering a phase without passing the turn:** `the {phase} phase starts with them`, sharing slice 6's start
   helper with the new current seat being the presser. The snapshot already holds the press.
7. **Page:**
   - the player picker;
   - flag tags on spaces;
   - marked kept cards;
   - the cash numbers on the bank line (slice 6).

## Proof (acceptance)

1. **Rent Day (slice 7)** compiles with no diagnostics. Its examples cover the table above, and every earlier
   example still passes unchanged.
2. **Games still end:**
   - 2 players: at least 9 of 10 seeds;
   - 4 and 8 players with full sets: seeds 1–3.
   - The long runs gain the trade checks above, and accepted trades happen in them.
3. **The language pieces each have tests:**
   - player-picking buttons, including refusals;
   - space picks without "on", and the same-label check;
   - every, no and some over space and card flags;
   - card flags following a card between zones;
   - `{holder}`, including the none and two-holders errors;
   - the "For" line, including "their" meaning the holder;
   - entering a phase with them.
4. **The playtest page** shows the picker, the tags, the marked cards and the accept and decline buttons, with a
   happy-dom test and a browser check.
5. Hearts, Color Match, Venom and every existing test pass, and `bun run typecheck` is clean.

## Builder check

An opus builder check read the first draft of this spec against the code. It checked the spec's lines by compiling
Rent Day with them, from a script in the scratchpad. Its questions (Q1–Q14) are settled above as the builder's
calls, mostly as it recommended. One difference: it suggested a zone owner for flag holders, and this spec instead
uses the "For" line and drops the not-empty check on asking for the other player's kept cards.

## Left to the builder

- Exact phrase wordings and messages, keeping these shapes.
- The auto-player's numbers.
- The look of the picker and tags.

## Out of scope

Open trading at any time, counter-offers, house rules, and online play. This is the last slice of the board-games
overview.
