# Startup Simulator, Slice 10: Bankruptcy and the Broken Chain

**Date:** 2026-10-16
**Status:** Settled after its builder check (see "Builder-check rulings" at the end). The user handed over every design call for the full implementation;
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
| Broken Chain on a Fire Sale | a Partner whose project the sale turned into a bluff may Come Clean for free and gains Legacy Status |
| Broken Chain on a Market Sale | Come Clean costs $3 to the new owner; impossible without $3 spare; a Partner of the new owner keeps access and isn't asked |
| Still illegal | Come Clean revealing a second missing Tag: Fold or Settle with no Whistleblower |
| No chain on a lost Partnership | a Buyback ending a Partnership exposes nothing |
| Legacy reset | a Legacy product sold, pivoted or folded loses the status |
| Seller's own project | the seller's Face-Down project that relied on its own sold Tag is offered Come Clean (asked last) |
| Offer hides the card | an exposed owner with a Face-Down project that doesn't need the Tag is still asked, and stays hidden |
| Debt set aside | a bankrupt with a $6 Settlement owed can't spend the liquidation's cash on a Come Clean or a Market Sale purchase |
| Two debts | a second Settlement of the same bankrupt joins the first; Settle is offered only if both are covered; paid in order |
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

## Builder-check rulings

The builder check (`builder-check-startup-10.md`) raised two questions and listed points it would settle itself. The
user handed every design call to the builder; these are the calls.

- **R1. Who is vulnerable at a sale, and who is asked.**
  - **Vulnerable:** a Face-Down project that needs the sold Tag, whose owner had Secured Access to that Tag before the
    sale and has none after it, checked after the card has moved. That is the seller and the seller's Partners. Owners
    who keep access through another provider, or as Partners of the buyer, are not vulnerable. A bluff the sale didn't
    cause is not offered Come Clean ("bluff" in the examples means a project the sale turned into one). Why: §7.E's "you
    lose access to it" and its Market Sale scenario, and Rust's `broken_chain::open`; including every bluff would let any
    sale legalise a bluff cheaply and would prompt almost every player at almost every sale.
  - **The seller is included** (§7.E: "Any Stealth Products"; Rust agrees), asked last in the from-the-seller's-left
    order. The spec's "rival" is widened accordingly.
  - **Who is asked:** every such owner who has any Face-Down project, whether or not one of them needs the Tag and
    whether or not they can pay. The prompt lists the vulnerable projects (possibly none) and always offers to stay
    hidden, so the offer reads only public facts (Partnerships, Tag providers, Face-Down counts, cash) and reveals
    nothing about a hidden card (slice 9 R3).
  - The $0 Partner rate (§17.B.3's table) has no case that can happen here: a Partner of the new owner keeps access. On
    the owner's list.
- **R2. A bankrupt's debt is set aside.**
  - From the moment a player goes Bankrupt until their liquidation ends, they may spend only cash above what they owe:
    on a Come Clean fee (as Rust's spare cash) and on buying in another player's Market Sale (they are asked only if that
    spare cash covers the price and they have the bandwidth).
  - A second audit cost of the same player joins what they already owe, with no second seizure. Settle is offered for
    it only if cash plus the Fire Sale value of their products covers everything owed. The liquidation goes on until the
    total is covered, the debts are paid in the order they arose (the first Fold's Whistleblower first), and only a Fold
    fine can be left unpaid and forgiven. Debts of different players stay separate.
  - Why: it keeps "a Settlement is always paid" true at every depth; spending the raised cash breaks it (worked example
    in the builder check).
- **R3 (the builder's own).**
  - Ghost Progress can't arise at a Come Clean reveal (slice 9 R2), so the reveal checks Missing Dependency only, with
    the sold Tag excused.
  - Legacy Status is cleared whenever the card leaves its owner's Board (Pivot, a Fold, any sale), not only on a sale:
    a fact moves with its card, and a scrapped card redrafted later must not carry an old exception (Rust clears it only
    on sales — a bug not copied).
  - A Come Clean after a Market Sale or Acquisition also grants Legacy Status (§7.E: "the timing and rules are the same
    as the fire sale").
  - A Settlement's cost and payees are fixed when it is chosen, before the seizure ends any Partnership. The audited
    card is already Face-Up, so it is never offered Come Clean during its own liquidation.
  - Slice 9's Fold and Settle are generalised here to any owner at any moment (including sales in Phase C) and to no
    Whistleblower.
  - Nested interrupts become a stack, each level with its own context kept in facts (not the turn log, which a resume
    restores).
