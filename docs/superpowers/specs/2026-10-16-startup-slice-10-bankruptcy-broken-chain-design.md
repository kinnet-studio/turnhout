# Startup Simulator, Slice 10: Bankruptcy and the Broken Chain

**Date:** 2026-10-16
**Status:** Draft, waiting for its builder check. The user handed over every design call for the full implementation;
the calls below are the builder's.
**Part of:** `2026-10-16-startup-simulator-overview-design.md`. Its decisions, calls, anti-goals and constraints apply.
**Builds on:** slices 1a to 9.
**Rulebook sections:** §7.C (shortfalls), §7.E (the Broken Chain and Come Clean), §7 Liquidation and Bankruptcy, §17.C.3,
§20.D Patent Trolls' Come Clean fee, Rulings #24, #25's Bankruptcy and Broken Chain items.

## What this slice is

The last rules: a player who can't pay an Audit's cost goes Bankrupt and sells products to raise it, and selling a
product that provided a Tag can expose rivals' Face-Down projects that relied on it. This finishes the rulebook.

The game after this slice:
- **Bankruptcy (§7).** Only an Audit causes it: a Fold fine or a Settlement the owner can't pay in cash.
  1. **Seizure:** every Equity token they hold returns to its Founder, unpaid (their Partnerships through them end).
  2. **Liquidation:** they sell Maintenance products one at a time, in the order they choose, until the cost is covered:
     each first to a Market Sale, then a Fire Sale. They keep any product whose Fire Sale would pay $0.
  3. **Shortfall:** a Fold fine still unpaid is forgiven. A Settlement is only chosen when covered, so it is always paid.
- **The Broken Chain (§7.E).** Only a sale of a Tag source triggers it (Acquisition, Market Sale, Fire Sale, forced
  Liquidation), never losing a Partnership.
  - Any rival Face-Down project relying on that Tag becomes vulnerable. At the moment of the sale its owner may **Come
    Clean**: flip it Face-Up.
  - After a **Fire Sale** (the Tag leaves the game): Coming Clean is free and gives the project **Legacy Status** for
    that one Tag, satisfying it for good.
  - After a **Market Sale or Acquisition** (the Tag changes hands): Coming Clean costs a $3 License to the new owner ($0
    if Partners with them; $5 during Patent Trolls). An owner who can't pay can't Come Clean.
  - A revealed project still illegal for another Tag is a **failed Audit** with no Whistleblower: Fold or Settle as in
    §7.C, the whole $5 Fold fine to the bank, and a Settle pays no bounty.
  - A project kept hidden stays at risk of a later Audit.
- **Legacy Status** exists only on Face-Up cards, and is reset if the product is later sold.
- **Losing a Partnership** (Veto, Non-Compete Suit, Buyback, Secondary Trade, Bankruptcy) doesn't trigger a Broken
  Chain: a Stealth project relying on it just becomes illegal, fixable only by Voluntary Disclosure.
- **The whole valuation** (§12, lines 1–8) is checked against every line once more.

## Calls (the builder's)

- **Nested interrupts** (overview item 13): an Audit's Fold can cause a Bankruptcy, whose Market Sale can break a chain,
  whose Come Clean can fail an audit, which can cause a Fold. Each step suspends the one that caused it and resumes it
  when done.
- **Come Clean offers go to the vulnerable owners in turn order from the seller's left,** at the moment of the sale and
  before anything else resumes.
- **A failed Come Clean that leads to a second Bankruptcy** of the same player resolves within the first (the seizure
  has already happened; liquidation continues).
- **Rulings pinned as examples:** #24 (selling a product) and #25's items (only an Audit bankrupts; Equity is seized
  first; Broken Chain only on a sale; a failed Come Clean is a failed audit with the fine to the bank).

## What the language gains

1. **Interrupts inside interrupts** (overview item 13), resuming in order.
2. **Per-requirement exceptions on a card** (Legacy Status for one Tag).
3. **Example vocabulary** for all of the above.

## The page

- Bankruptcy and Come Clean prompts appear in the deciding player's strip; the switcher follows the chain.

## Examples to cover

| Example | Expect |
|---|---|
| Bankruptcy from a Fold | Equity seized first; products sold until the fine is covered |
| Keep a $0 product | a product whose Fire Sale pays $0 is kept |
| Forgiven shortfall | a Fold fine still unpaid after liquidation is forgiven |
| Broken Chain on a Fire Sale | a rival's bluff on that Tag may Come Clean for free and gains Legacy Status |
| Broken Chain on a Market Sale | Come Clean costs $3 to the new owner; $0 if Partners; impossible without $3 |
| Still illegal | Come Clean revealing a second missing Tag: Fold or Settle with no Whistleblower |
| No chain on a lost Partnership | a Buyback ending a Partnership exposes nothing |
| Legacy reset | a Legacy product sold loses the status |
| Nested | an Audit → Fold → Bankruptcy → Market Sale → Come Clean chain resolves in order |
| The full valuation | a game end scored line by line against §12 |

## Goals

- **The whole rulebook plays** in the designer, for 2 to 5 players, with every card from §20.
- Long runs at 2 to 5 players reach the Crash with every rule reachable by the auto-player.
- Hearts, Color Match, Venom and Rent Day pass unchanged.

## Anti-goals

- No Startup Simulator words in shared code.
- A chain of interrupts that resumes out of order or leaves a player stuck.

## Proof (acceptance)

1. The examples above pass, with every number checked against the rulebook.
2. Long runs end at every player count, with all earlier invariants.
3. Every ruling with a play effect is pinned by at least one example across the slices (the overview's goal); a table
   in this slice's plan lists each ruling and its example.
4. Each language piece has unit tests; the four games and typecheck pass.

## Left to the builder

- Exact wordings; the auto-player's choices.
