# Board Games, Slice 6: Auctions

**Date:** 2026-10-15
**Status:** Ready to build. The user delegated the design calls under the goal to finish every slice (see Decisions).
**Part of:** `2026-10-15-board-games-overview-design.md`. Its decisions, calls, anti-goals and constraints apply
here.
**Builds on:** slices 1–5 (slices 3 to 5 are on the same branch, ahead of `main`).

## What this slice is

When a player lands on a space nobody owns and doesn't buy it, the space is auctioned:

- The lander presses "Auction the space they are on" instead of buying. Ending the turn, or rolling again after a
  double, is refused while the space they are on is for sale, unowned and not yet auctioned, as in the classic rules.
- Every player still in takes part, starting with the player on the lander's left and going round in turn.
- On their turn in the auction, a player either bids an amount higher than the high bid (and no more than their
  money), or drops out. The high bidder can't drop out.
- When one bidder is left and they hold the high bid, they pay it and own the space. If everyone drops out
  without a bid, the space stays unowned.
- Play then goes back to the lander's turn exactly where it was. They have still rolled, a double still rolls
  again, and their turn memory and dice are as before.

To get there, the language gains:

- **Buttons that carry an amount:** "A player may bid an amount." The player types the amount on the page, and
  "the amount" in the button's lines reads it.
- **Facts about the game as a whole:** "The game has a high bid of 0." This is a number that belongs to no player
  and no space, read and set by phrases.
- **A phase that interrupts a turn and returns to it:**
  - "The auction phase starts with the player on their left." keeps the interrupted turn: its phase, whose turn,
    and that turn's memory and dice.
  - "Go back to the interrupted turn." restores all of it.
- **Turn order that skips players:** "After a player bids or drops out, the turn passes to the next player on the
  left who is bidding."
- **Phrases over everyone's facts:**
  - "Every player is bidding.";
  - "No player is the high bidder.";
  - "Only if no other player is bidding." under "When a player is the high bidder:";
  - "the space that is up for auction";
  - "No space is up for auction.".

## Decisions

1. **The user set the goal "let's finish all the slices"** and earlier left the design calls to the builder ("I'll
   leave the rest to you, I trust your judgement"). There was no question round for this slice. Every call below is
   the builder's, listed so the user can check it.
2. **Classic auctions** (overview): a property the lander doesn't buy is auctioned to the highest bidder.

## Calls (the builder's)

- **The auction is written in Rent Day's text** from general pieces: a phase, player flags ("bidding", "the high
  bidder"), a game number ("high bid"), a space flag ("up for auction"), amount buttons, and interrupt-and-return.
  The engine knows nothing about auctions. "auction", "bid" and "bidder" stay in Rent Day's text.
- **Bidding goes round in turn**, not as open outcry. Each player either bids higher or drops out, and someone
  who dropped out is skipped from then on. This keeps one actor at a time, which the flow and the page already
  handle, and it ends because every turn either raises the bid or removes a bidder.
- **Amount buttons.** A button whose wording ends with "an amount" ("bid an amount") carries a whole number of 0
  or more in its move.
  - "the amount" reads it in conditions and effects: "the amount is more than the high bid", "they have at least
    the amount in money", "the high bid is the amount".
  - A missing or bad amount (not a whole number, or below 0) is refused with "Say how much to bid." (built from
    the button's words).
  - Examples say "When p1 bids 50". The page shows a number box with the button, and the move is sent when the
    player confirms.
  - **Live before an amount is typed (builder check Q1).** Phrases that read the amount carry a `needsAmount` meta.
    They are allowed only in a button whose wording ends in " an amount", and are reported anywhere else.
    - The seat view's `allowed` for an amount button runs the gate, the seat checks, and every `Only if` group that
      does not read the amount. So Bid is live when the player could bid something.
    - The real move refuses in this order: the gate, the seat checks, a missing or bad amount, then all the groups.
    - A refused amount (too low, more than they have) is flashed as a notice, the way a refused pick is.
  - **Where the amount lives (Q5).** It goes on the press, not on `env.move`, which is only for card moves: an
    optional `amount?: number` on `Subject`, filled by `aboutPress`, and checked in `choose` the way `pickedBy`
    checks `target`.
- **Game facts (Q2).** "The game has a high bid of 0." declares a number that belongs to the game and says where it
  starts. It is kept in `lang:facts` under `game`.
  - `the game can have {factlist}` is not used. Under today's rule "a high bid" would make a yes/no.
  - `FactSpec.on` gains `'game'`.
  - Phrases: "the high bid is 0" and "the high bid is the amount" (effects), "the amount is more than the high bid"
    (condition), and "They pay the high bid." (effect, to the bank in the pay-with counter).
  - Given and Then: "the high bid is 50".
  - The page shows game numbers that aren't 0 on the bank line ("high bid 120").
  - Both rules that end an auction set the high bid back to 0, so the bank line doesn't keep a stale bid.
- **Player flags across everyone:**
  - "Every player is bidding." sets a flag on every player still in;
  - "No player is the high bidder." clears it for all;
  - "Only if no other player is bidding." under "When a player is the high bidder:" holds when they are the only
    one with the flag;
  - "When no player is bidding:" is a plain rule.
  - Every one of these counts only players still in.
- **The space up for auction is a space flag:**
  - "Spaces can be up for auction." / "It is up for auction." mark it;
  - "They own the space that is up for auction." and "The space that is up for auction is not up for auction."
    act on the one space with that flag. Two such spaces at once is an error.
  - "No space is up for auction." clears it everywhere.
  - **The flag also means "dealt with" (Q3).** A space nobody won keeps "up for auction" until the lander rolls or
    ends their turn. Both buttons clear it as their first Then line, so two at once can't happen.
- **Interrupting a turn.** "The auction phase starts with the player on their left." does this, in order (Q6):
  1. It keeps `{ phase, current, turn log, turn rolls }` in `lang:interrupted`. A press is logged before its lines
     run (`declared-actions.ts:70-71`), so the kept log already holds "auction the space they are on".
  2. It sets the phase.
  3. It makes the next player still in on their left current (`nextIn`), so a player who is out never holds the
     auction.
  4. It clears both logs, so slice 3's "only the current seat has turn entries" still holds.
  5. It runs the phase's "When this phase starts:" lines, if it has any, as `go to` does.
  - "Go back to the interrupted turn." restores all four verbatim, deleting a key that was absent, and clears the
    record. Presses made during the interruption are not in the restored log.
  - Only one interruption can be open at a time; starting another is an error.
  - `apply` clears the turn log after a press the After line names only when the phase is still the one the press
    was made in. So a "Go back" inside such a button isn't wiped.
  - `warnUnreachable` counts a phase named by `the {phase} phase starts with …` in any line (Q4). The auction phase
    is written after playing, since the game starts in the first written phase.
- **Turn passing that skips players:** the turn phrase "the next player on the left who is {playerflag}". It skips
  players who are out. If no such player is left, the turn stays where it is, and the phase's own rules then end it.
  A phase with no "Players take turns." line works today: the default actor is the current player
  (`compile-phase.ts:403`), and the After line's turn phrase sets the order.
- **Ending a turn or rolling again needs the space dealt with (Q3).** "it" is the space they are on, as in the buy
  button, so the lander must buy or auction it.
  - End turn gains `Only if one of: it has no price / someone owns it / it is up for auction`, after the doubles
    group so that example keeps its reason.
  - Roll the dice gains `Only if one of: they have not rolled this turn / it has no price / someone owns it / it is
    up for auction`. This closes a hole that is there today: a double let a player roll past an unbought space.
  - Auction gains `Only if it is not up for auction`, so a space can't be auctioned twice.
- **Debt and auctions.** You can only bid money you have. Raising money ("Any player may" buttons) stays in the
  playing phase only; this is a recorded simplification.
  - The auction button gains slice 5's `Only if no player has less than 0 money.`, so nobody in debt is caught in
    an auction.
  - Bid and drop out don't get that line.
- **The auto-player:**
  - as the lander, it buys when it can, and otherwise auctions a space that isn't already up for auction;
  - as a bidder, it bids 10 more than the high bid while the bid is below the space's price and it would keep
    200;
  - otherwise it drops out.

## Goals

- Rent Day (slice 6) compiles with no diagnostics, and its examples cover every rule below.
- Games still end: at least 9 of 10 ordinary 2-player seeds, and the 4- and 8-player full-set variants with fixed
  seeds. Auctions should move streets around and make endings likelier.
- **The long runs check:**
  - after every auction, the space has exactly one owner (the winner) or none;
  - the winner paid exactly the high bid;
  - play is back with the lander, with their turn memory as before;
  - no player outside "bidding" ever acts in an auction;
  - the phase is auction exactly while some player is bidding;
  - all earlier invariants still hold. Slice 5's turn check widens (Q7): the turn may also change when an auction
    starts (to the next player in), after a bid or drop-out (to the next bidder), and when an auction ends (back to
    the lander).
- The page shows the amount box for an amount button, the high bid on the bank line, and whose turn it is in the
  auction. The seat status keeps its hint format and puts the phase's name first only while a turn is interrupted, so existing games read as before.
- Hearts, Color Match, Venom and slices 1–5 behave as before. Rent Day's own text changes as described.

## Non-goals

- Open-outcry bidding (anyone, any time) and timed auctions.
- Auctioning buildings when the bank runs short (a house rule).
- Bankrupt players' properties going to auction. They go to the bank as in slice 5.
- Raising money mid-auction.

## Anti-goals

- **No Monopoly in the language core.** "auction", "bid", "bidder" and "high bid" stay in Rent Day's text. "amount",
  "interrupted turn", "game facts" and "every player" are general.
- **An auction that never ends,** or one that loses the lander's turn.
- **A space with two owners,** or money taken that wasn't bid.

## What the designer writes

This is the shape; the builder settles exact wording. Every line must compile once the slice is done.

```text
Board:
  …
  Spaces can be up for auction.
  Players can be bidding.
  Players can be the high bidder.
  The game has a high bid of 0.

Phase: playing
  …
  A player may roll the dice.
    …(as before)
    Only if one of:
      they have not rolled this turn
      it has no price
      someone owns it
      it is up for auction
    Then:
      No space is up for auction.
      …(as before)
  A player may auction the space they are on.
    Only if no player has less than 0 money.
    Only if they have rolled this turn.
    Only if it has a price.
    Only if no one owns it.
    Only if it is not up for auction.
    Then:
      It is up for auction.
      Every player is bidding.
      The high bid is 0.
      The auction phase starts with the player on their left.
  A player may end their turn.
    …(as before)
    Only if one of:
      it has no price
      someone owns it
      it is up for auction
    Then:
      No space is up for auction.
      …(as before)

Phase: auction
  Hint: Bid more than the high bid, or drop out.
  A player may bid an amount.
    Only if they are bidding.
    Only if the amount is more than the high bid.
    Only if they have at least the amount in money.
    Then:
      The high bid is the amount.
      No player is the high bidder.
      They are the high bidder.
  A player may drop out.
    Only if they are bidding.
    Only if they are not the high bidder.
    Then:
      They are not bidding.
  When a player is the high bidder:
    Only if no other player is bidding.
    They pay the high bid.
    They own the space that is up for auction.
    They are not the high bidder.
    They are not bidding.
    The space that is up for auction is not up for auction.
    The high bid is 0.
    Go back to the interrupted turn.
  When no player is bidding:
    The high bid is 0.
    Go back to the interrupted turn.
  After a player bids or drops out, the turn passes to the next player on the left who is bidding.
```

Notes:
- **"Players take turns." is not written in the auction phase.** The phase's turn order comes from its After line
  and from how it was started. The planner checks that the language allows a phase without "Players take turns.",
  and settles the smallest wording if it doesn't.
- **A player who goes to the auction phase while in jail** still bids. Jail only limits their own turn's buttons.
- **Nobody won:** the space stays up for auction. That lets the lander end their turn, and the next roll or end of
  turn clears it.

### Examples to cover (Rent Day)

| Example | Expect |
|---|---|
| Declining starts an auction | p0 on an unowned street presses Auction: the phase is auction, and it is p1's turn |
| You can't end your turn with the space unbought | refused with the one-of reason |
| A bid must beat the high bid | p1 bids 0 → refused; p1 bids 50 → accepted, the high bid is 50 |
| You can't bid more than you have | refused |
| The last bidder wins and pays | 2 players: p1 bids 50, p0 drops out: p1 owns the street, has 1450, and it is p0's turn in playing |
| Nobody bids | every player drops out: no one owns it, it is p0's turn in playing, and p0 may end their turn |
| You can't auction twice | after nobody bids, auctioning again is refused |
| A double can't roll past an unbought space | p0 rolled a double onto an unowned street: rolling again is refused until they buy or auction |
| The lander's turn resumes as it was | p0 rolled a double before auctioning: after the auction p0 may roll again |
| The high bidder can't drop out | set up with Given lines (the phase is auction, p1 is bidding and the high bidder, it is p1's turn): refused. In play the high bidder never holds the turn. |
| Three players skip the one who dropped out | p1 drops out, p2 bids 50, p0 bids 60: it is p2's turn, not p1's |

The builder computes positions from the board.

**Existing examples that change (Q8):**
- `the turn passes to the left, skipping players who are out` (`rent-day.rules:316`) lands on Ferry Row, which
  nobody owns, so ending the turn is now refused. Its roll changes from 1+2 to 1+3, which lands on Income Tax.
- `you cannot end your turn on a double` keeps its reason because the new one-of group comes after the doubles
  group.

## What the engine and language gain

All of it is additive, apart from Rent Day's own text.

1. **Amount buttons.**
   - Compiling: a wording ending in " an amount".
   - The move: `amount`.
   - The handler refuses a missing or invalid amount.
   - In the env: "the amount" phrases read the press's `Subject.amount`, and carry `needsAmount`.
   - Examples: `{player} {amountaction} {int}`.
   - The view: `ActionView.amount: true` tells the page to show a number box.
2. **Game facts.**
   - Declaration: `the game has a {name} of {int}`.
   - The store: `lang:facts.game`.
   - Phrases: number set and read, compare with the amount, and "they pay the {gamenumber}".
   - The view lists the set ones.
3. **Everyone's flags:**
   - `every player is {playerflag}`;
   - `no player is {playerflag}`;
   - who: `a player is {playerflag}` (exists), with the condition `no other player is {playerflag}`;
   - condition: `no player is {playerflag}`.
4. **Flagged space:**
   - `they own the space that is {spaceflag}`;
   - `the space that is {spaceflag} is not {spaceflag}`;
   - `no space is {spaceflag}` (effect).
5. **Interrupt and return:**
   - `the {phase} phase starts with the player on their left`;
   - `go back to the interrupted turn`;
   - the turn phrase `the next player on the left who is {playerflag}`.
   - These run against the flow's turn: phase and current. The flow file itself stays untouched. Language effects
     return a new `GameState` with a changed `turn`, and the flow continues from it (checked: `chooseNext` already
     does this, and `runFlow` re-reads the phase each pass).
   - `warnUnreachable` counts phases entered this way.
6. **Page:**
   - the amount box;
   - game facts on the bank line;
   - the phase name in the seat status while a turn is interrupted ("auction — Your turn — …"), from `BoardView.interrupted`.

## Proof (acceptance)

1. **Rent Day (slice 6)** compiles with no diagnostics. Its examples cover the table above, and every earlier
   example still passes, or is updated only where ending a turn now needs the space dealt with. The plan lists
   each one it updates.
2. **Games still end:**
   - 2 players: at least 9 of 10 seeds;
   - 4 and 8 players with full sets: seeds 1–3.
   - The long runs gain the auction checks above, and auctions with and without a winner both happen.
3. **The language pieces each have tests:**
   - amount buttons, including refusals;
   - game facts;
   - everyone's flags;
   - the flagged space, including the two-at-once error;
   - interrupt and return, including turn memory and dice;
   - the skipping turn order.
4. **The playtest page** shows the amount box, the high bid and the auction turns, with a happy-dom test and a
   browser check.
5. Hearts, Color Match, Venom and every existing test pass, and `bun run typecheck` is clean.

## Builder check

An opus builder check read this spec against the code, with the questions numbered Q1–Q9 in its report. Every
question was settled above as the builder's call, mostly as the check recommended. One exception: the check
offered recording the double hole as a simplification, and this spec closes it instead.

## Left to the builder

- Exact phrase wordings and messages, keeping these shapes.
- Where the interrupted turn is kept, and how a phase is entered from an effect without touching `flow.ts`.
- The auto-player's bidding numbers.
- The amount box's look.

## Out of scope

Slice 7 (trading), open-outcry auctions, house rules, and online play.
