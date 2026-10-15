# Board Games, Slice 5: Raising Money

**Date:** 2026-10-15
**Status:** Ready to build. The user delegated the design calls under the goal to finish every slice (see Decisions).
**Part of:** `2026-10-15-board-games-overview-design.md`. Its decisions, calls, anti-goals and constraints apply
here.
**Builds on:** slices 1–4 (slices 3 and 4 are on the same branch, ahead of `main`).

## What this slice is

Rent Day stops putting a player out the moment their money goes below 0. Instead:

- **A player in debt raises money.** They sell buildings back to the bank for half the house price, or mortgage
  a space they own for half its price. Their turn can't end, and the game can't move on, while anyone owes.
- **They may do this at any time,** even when it isn't their turn. Debts can arise on someone else's turn, for
  example from a card that collects from every player.
- **A mortgaged space charges no rent.**
  - Its owner can pay the mortgage off for 55% of its price, which is half plus a tenth.
  - Nobody can build on a color set while one of its spaces is mortgaged.
  - Buildings must be sold off a color before any of its spaces can be mortgaged.
- **Selling evenly:** a street can't lose a building while another street of its color has fewer. A hotel sells
  back as four houses, if the bank has four to give.
- **Giving up is proper bankruptcy.** A player who can't or won't raise enough presses "Give up":
  - their buildings go back to the bank;
  - everything else they own (spaces and kept cards) goes to the player they owe;
  - if they owe the bank, their spaces go back to the bank unmortgaged, and their kept cards go back under their
    piles;
  - then they are out.

To get there, the language gains:

- **Buttons any player may press at any time:** "Any player may …" as well as "A player may …".
- **The player someone owes.** When a payment takes a player below 0, they owe whoever it went to (a player, or
  the bank).
- **Percent payments:** "They get 50% of its price.", "They pay 55% of its price.".
- **Space flags set and cleared by effects:** "It is mortgaged.", "It is not mortgaged.", "Their spaces are no
  longer mortgaged.".
- **Handing over everything someone owns:** "Everything they own goes to the player they owe.".
- **A few counting phrases** for even selling and for the bank's stock.

## Decisions

1. **The user set the goal "let's finish all the slices"** and earlier left the design calls to the builder ("I'll
   leave the rest to you, I trust your judgement"). There was no question round for this slice. Every call below
   is the builder's, listed so the user can check it.
2. **Classic rules** (overview): mortgage and unmortgage, selling buildings back, and proper bankruptcy where your
   assets go to whoever you owe.

## Calls (the builder's)

- **"Any player may …" marks a button any seat may press, whoever's turn it is.**
  - It compiles to the flow's existing per-move exemption from the turn gate (`anyActor`, which today only serves
    rearranging cards).
  - Its `Only if` lines still decide when it may be pressed.
  - Pressing it never ends anyone's turn, and an After line can't name it.
  - "A player may …" stays on your own turn.
- **Debt is money below 0, plus who it is owed to.**
  - Every payment between a player and someone else records who was paid when it leaves the payer below 0:
    another player, or the bank. A later payment that leaves them below 0 replaces the record.
  - Money back at 0 or more clears the record.
  - "the player they owe" reads it, and "they owe the bank" is a condition.
  - The money line shows "· owes p1" or "· owes the bank" for a player in debt.
- **The game can't move on while anyone owes.** Rent Day's turn buttons gain
  `Only if no player has less than 0 money.`. Only the "Any player may" buttons and "Give up" stay pressable. This
  is written in the text, not built into the engine.
- **Slices 1–4's automatic "When a player has less than 0 money: They are out." goes away** from Rent Day.
  "Give up" replaces it. A human player who neither raises money nor gives up holds the game; that is their
  choice, and the page always offers both. The auto-player raises money, then gives up if that isn't enough.
- **The creditor keeps the full payment** that took the debtor below 0, as today. Giving up hands over assets, not
  money. Money stays balanced except for the debt the bankrupt player leaves unpaid, which is the same as slice 1
  today; the long runs account for it.
- **Mortgage amounts are percentages of the price:** 50% to mortgage, 55% to pay it off, and 50% of the house
  price for a sold building. "{int}% of its {spaceattr}" rounds down to whole money.
- **A mortgage is the yes/no space fact "mortgaged".**
  - New general effects set and clear space flags: "It is mortgaged." and "It is not mortgaged." for the target or
    subject space, and "Their spaces are no longer mortgaged." for every space they own.
  - Rent Day's lands-on rule gains `Only if it is not mortgaged.`.
- **Building restrictions are written in the text:**
  - building gains `Only if no street of its color is mortgaged.`;
  - mortgaging needs `Only if no street of its color has a building.` for a street.
  - Stations and utilities have no color, and the color phrase holds for a space with no color value.
- **Selling evenly** uses a Rent Day phrase alongside slice 2's "fewer buildings": "no street of its color has
  more buildings" (a hotel counts as five).
- **Selling a hotel:** "If it has a hotel, its hotel goes back to the bank and it gets 4 houses from the bank."
  The button refuses a hotel when the bank has fewer than 4 houses
  (`Only if one of: it has no hotel / the bank has at least 4 houses`).
- **"Everything they own goes to the player they owe":**
  - **To a player:** ownership of every space they own moves to that player, with the space's facts unchanged (a
    mortgaged space stays mortgaged). Every card in their public per-player zones moves to the same zone of that
    player.
  - **To the bank:** spaces become unowned and cards go to the bottom of their home piles (slice 4's rule). The
    text clears mortgages first with "If they owe the bank, their spaces are no longer mortgaged."
  - Buildings are handed back by the existing "Their houses go back to the bank." lines, before the transfer.
- **Flags drawn on the board:** a space flag that pairs with a bank item (the hotel) is still drawn as a block. Any
  other space flag (mortgaged) draws the space with a diagonal stripe and names the flag in its title. This is a
  general page rule; no page code names "mortgaged".

## Goals

- Rent Day (slice 5) compiles with no diagnostics. Its examples cover every rule below.
- Games still end: at least 9 of 10 ordinary 2-player seeds, and the 4- and 8-player full-set variants with fixed
  seeds. Bankruptcies go both to players and to the bank in the long runs.
- **The long runs check:**
  - money moves only as the rules say: mortgage amounts, pay-off amounts and half house prices;
  - houses and hotels are still conserved, through sales and through giving up;
  - the 32 cards are still conserved, through giving up;
  - no space is ever mortgaged with a building on its color;
  - a player in debt always has a creditor recorded;
  - nobody's turn ends while someone owes.
- The page shows debts on the money line, mortgaged spaces striped, and the "any time" buttons live for every seat.
- Hearts, Color Match, Venom and slices 1–4 behave as before (Rent Day's own text changes as described).

## Non-goals

- Auctions when a property goes to the bank (slice 6). The bank simply takes it back, as today.
- Trading (slice 7).
- The 10% interest a creditor pays to keep a mortgaged space they inherit. They simply receive it mortgaged; a
  recorded simplification.
- Several creditors at once. The most recent payment that left them below 0 names the creditor.

## Anti-goals

- **No Monopoly in the language core.** "mortgage", "bankrupt", "rent", "house" and friends stay in Rent Day's text
  and `library/rent-day.ts`. "owe", "give up", "any player" and percentages are general.
- **A game that moves on while someone owes.**
- **A building or card created or lost through a sale or a bankruptcy.**
- **Rent charged on a mortgaged space,** or building on a color with a mortgaged space.

## What the designer writes

This is the shape; the builder settles exact wording. Every line must compile once the slice is done.

```text
Board:
  …
  Spaces can have houses and a hotel.          (unchanged)
  Spaces can be mortgaged.                     (new declaration form, like "Cards can be poisoned.")

Phase: playing
  …(each turn button gains:)
    Only if no player has less than 0 money.
  Any player may take a mortgage on a space they own.
    Only if it is not mortgaged.
    Only if no street of its color has a building.
    Then:
      They get 50% of its price.
      It is mortgaged.
  Any player may pay off a mortgage on a space they own.
    Only if it is mortgaged.
    Only if they have at least 55% of its price in money.
    Then:
      They pay 55% of its price.
      It is not mortgaged.
  Any player may sell a house on a street they own.
    Only if one of:
      it has a house
      it has a hotel
    Only if no street of its color has more buildings.
    Only if one of:
      it has no hotel
      the bank has at least 4 houses
    Then:
      They get 50% of its house price.
      If it has a hotel, its hotel goes back to the bank and it gets 4 houses from the bank.   ← the builder
      If it has no hotel, one of its houses goes back to the bank.                                splits lines
  Any player may give up.
    Only if they have less than 0 money.
    Then:
      Their houses go back to the bank.
      Their hotels go back to the bank.
      If they owe the bank, their spaces are no longer mortgaged.
      Everything they own goes to the player they owe.
      They are out.
  When a player lands on a space someone else owns:
    Only if it is not mortgaged.
    They pay its rent to its owner.
  A player may build a house on a street they own.
    …
    Only if no street of its color is mortgaged.
```

A rule line in the language holds one effect, and an `If` line holds one condition and one effect. The builder
splits the hotel line into lines that read in order, in the same way slice 2 wrote building a hotel. The plan
settles the exact lines.

### Examples to cover (Rent Day)

The builder computes positions and amounts from the board. Mill Lane's price is 60 and its house price 50; Rose
Lane's price is 180 and its house price 100.

| Example | Expect |
|---|---|
| Mortgaging gives half the price | p0 owns Rose Lane: +90, and it is mortgaged |
| No rent on a mortgaged space | p1's Rose Lane is mortgaged: p0 lands and pays nothing |
| Paying off costs 55% | +0 → −99, and not mortgaged |
| Can't mortgage with buildings on the color | refused with the sentence |
| Can't build on a set with a mortgaged space | refused with the sentence |
| Selling a house gives half the house price, evenly | +50, one house back to the bank; selling unevenly is refused |
| Selling a hotel gives four houses back | hotel back, 4 houses on the street, bank −4 houses |
| Mortgaging out of turn | p1 mortgages during p0's turn: accepted |
| A debt blocks ending the turn | p0 below 0 after rent: "end their turn" refused; after mortgaging back to ≥ 0 it is accepted |
| Giving up to a player | p0 owes p1: p0 out, p0's spaces owned by p1 (still mortgaged), p0's houses in the bank, p0's kept card with p1 |
| Giving up to the bank | p0 owes the bank (tax): p0 out, spaces unowned and not mortgaged, kept card back under its pile |
| The money line names the creditor | covered by the page test |

## What the engine and language gain

All additive, apart from Rent Day's own text.

1. **"Any player may …" buttons.**
   - They compile like "A player may …" with a flag.
   - The flow gives their move types `anyActor`.
   - The handler checks the presser is a seat still in. An out player can't press.
   - The seat view offers them to every seat.
2. **Debts.**
   - `lang:owes`: `{ [seat]: seat | 'bank' }`. It is kept by the shared money transfer, so every payment path
     (rent, tax, fines, cards, each-other-player) records it.
   - Phrases:
     - condition `they have less than {int} {counter}`;
     - condition `no player has less than {int} {counter}`;
     - condition `they owe the bank`;
     - effect `everything they own goes to the player they owe`.
   - The money line shows the creditor.
3. **Percentages and space flags.**
   - Declaration: `spaces can be {name}`, a yes/no space fact, like `cards can be {name}`.
   - Effects: `they get {int}% of its {spaceattr}`, `they pay {int}% of its {spaceattr}`, `it is {spaceflag}`,
     `it is not {spaceflag}`, `their spaces are no longer {spaceflag}`.
   - Condition: `they have at least {int}% of its {spaceattr} in {counter}`.
   - Bank and building phrases: `the bank has at least {int} {banked}`, `it gets {int} {banked} from the bank`,
     `one of its {spacenumber} goes back to the bank`, `its {spaceflag} goes back to the bank`.
   - Color phrases: `no {spacekind} of its {spaceattr} is {spaceflag}`, and in `library/rent-day.ts`,
     `no {spacekind} of its {spaceattr} has more buildings` and `no {spacekind} of its {spaceattr} has a building`.
4. **Views and page.**
   - `BoardView.owes`.
   - Non-building space flags drawn striped.
   - "Any player may" buttons live on every seat that may press them.

## Proof (acceptance)

1. **Rent Day (slice 5)** compiles with no diagnostics. Its examples cover the table above, and every earlier
   example still passes, or is updated where slice 5 changes the rule (going out now needs "Give up"). The plan
   lists each changed example.
2. **Games still end** (2 players: at least 9 of 10 seeds; 4 and 8 players with full sets, seeds 1–3). The long
   runs gain the money, building, card, mortgage and debt checks above, and both kinds of bankruptcy happen.
3. **The language pieces each have tests:**
   - "Any player may" is pressable out of turn and never ends a turn;
   - debts are recorded by every payment path;
   - the percent rounding;
   - the flag effects;
   - the handover to a player and to the bank;
   - the color and bank phrases.
4. **The playtest page** shows debts, striped mortgaged spaces, and out-of-turn buttons, with a happy-dom test and
   a browser check.
5. Hearts, Color Match, Venom and every existing test pass, and `bun run typecheck` is clean.

## Left to the builder

- Exact wording of new phrases and messages, keeping these shapes.
- How the hotel-sale lines are split.
- The auto-player's raising order: sell buildings from the most expensive set first, then mortgage the cheapest
  spaces, then give up.
- The stripe's look.

## Out of scope

Slices 6 and 7, mortgage interest on inherited spaces, multiple creditors, online play and house rules.
