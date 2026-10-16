# Startup Simulator, Slice 8: Selling, Poaching, Hit Piece, Integration and the CTO

**Date:** 2026-10-16
**Status:** Draft, waiting for its builder check. The user handed over every design call for the full implementation;
the calls below are the builder's.
**Part of:** `2026-10-16-startup-simulator-overview-design.md`. Its decisions, calls, anti-goals and constraints apply.
**Builds on:** slices 1a to 7.
**Rulebook sections:** §6 Acquisition and Divest (products), §7 Liquidation (M&A Price, Acquisition, Market Sale, Fire
Sale) and the Headhunter summary, §10, §11.D.1 (Crisis Management), §11.G.2 (CTO), §12 line 1 (Scandal, the Host
bonus), §16, §18.B (destroyed Equity), §20.A Warfare and Cease & Desist, §20.B (Mercenary), §20.D Recruiter Frenzy and
Headhunter Holiday, Rulings #6, #15, #16, #22, #24.

## What this slice is

Products and people change hands. Players buy and sell Launched products at a fixed M&A Price, poach staff from rivals'
projects with Strategy cards (and defend with Vest and Cease & Desist), smear rivals with Hit Pieces, stack their own
products into ecosystems, and crown a CTO.

The game after this slice:
- **The M&A Price (§7):** Tier 1 $6, Tier 2 $12, Tier 3 $20; +$5 per Hype and per attached Specialist; −$5 per Scandal
  and −$1 per Bug; never below $0.
- **Acquisition (buyer's turn, 1 AP):** name a rival's Maintenance product; the seller must consent and the buyer must
  have spare Ops bandwidth for it in each color after their Online products. The buyer pays the full M&A Price to the
  seller and gets the card, its Hype, Scandal and Bug tokens, and its attached Specialists. It arrives Online. The seller
  keeps its Market Share.
- **Divest a product (seller's turn, 1 AP):** a Market Sale offers it to rivals in turn order at the full M&A Price, to
  the first who consents and has the bandwidth. If none does, a Fire Sale: the bank pays 50% (rounded down), the card
  goes to the Open Idea Pool, attached Specialists go to the seller's Bench, pooled Ops staff stay.
- **A product leaving its owner's Board** breaks its Integration stack and sends Consultants back to their Investors.
- **Poaching (§16; 0 AP; Headhunter $0 or Corporate Raider $2):**
  - Target: a staff member on a rival's Development team. The Bench and the Ops Zone are immune.
  - It fails against: an HR Manager on the team (Corporate Raider ignores it), Investor Immunity (the poacher holds the
    target player's Equity), a Vest token, a CTO, or Headhunter Holiday.
  - The poacher names the destination: one of their Development projects, or their Ops Zone if it runs a product (a Sales
    Rep or Growth Hacker attaches to a named product). Never their Bench.
  - Fee to the bank: (printed cost + Token Value) × multiplier. Token Value: +$2 per XP, Skill, Pending XP token and
    Attribute; +$4 for a Gold Badge on a University Junior (none on Specialists or the Junior PM). Multiplier ×2; ×1.5
    for Corporate Raider or a Full Stack Ninja target; ×1 for Flight Risk or Recruiter Frenzy; the lowest applies; ×1.5
    rounds up.
  - The victim may then cancel it: **Vest** (place one of their own Equity tokens on the employee, locking it) or **Cease
    & Desist** (Strategy card). Either way the poacher gets the fee back, not the card's price.
  - Otherwise the employee moves with everything on it and gets an Onboarding Token (even on an Agile team). Pending XP
    stays; a Junior PM's Pending Badge is lost unless it joins a Tier 2/3 project. Joining a project has Assign's entry
    effects (the Hacker's Bug). A project losing its Lead Stalls.
- **Destroyed Equity (§18.B, ruling #16):** a player's own Equity on an employee (Vest or CTO) is destroyed when that
  employee is fired, dismissed, left unpaid, or discarded from the Bench.
- **Hit Piece ($3):** +1 Scandal on a rival's Maintenance product (not a Founder whose Equity the player holds).
  Scandal is −5 VP each (a product can score below 0) and −$5 on the M&A Price.
- **Crisis Management (§11.D.1):** a Director of QA (badged QA Engineer) in the Ops Zone removes Scandal before Bugs, up
  to its Bug-removal count, from any of its owner's Maintenance products, Offline ones included.
- **Integration (§10; 0 AP):** stack a Client under a Host in the player's own Maintenance Zone, by Tag:
  - Hardware Hosts (Device, IoT, Robotics) host App, Data, Media, AI.
  - Digital Hosts (Platform, Cloud) host Commerce, Crypto, Media.
  - The Metaverse hosts Social, Media, Commerce; the Fusion Reactor hosts Bio, Energy, IoT.
  - One Client per Host; a Client can't be a Host; never two cards of the same Tag.
  - While both are Active: the Client earns +$2 and ignores Bug Decay; at game end the Host scores +5 VP.
- **CTO (1 AP, §11.G.2):** promote a Tier 2 unit on the player's Board: pay $5 to the bank and attach one of their own
  Equity tokens (even the last). At most one per player. The CTO can't be poached; its Development project can't be
  Audited (slice 9) except on a turn it has an Onboarding Token. Firing it destroys the token.

## Calls (the builder's)

- **What this slice leaves out:** the Broken Chain and Come Clean on a sale (slice 10), Bankruptcy's forced sales
  (slice 10), the CTO's Audit Shield in effect (slice 9).
- **Cease & Desist and Vest are offered in a reaction window** after the fee is paid, to the victim only, before the
  transfer (§16.D.2: "immediately"). The window opens only when the victim could react (a C&D in hand, or an Equity
  token in supply).
- **A Market Sale asks rivals in turn order from the seller's left;** the first who accepts buys. A rival without the
  bandwidth or cash isn't asked.
- **Integration choices** are made by the owner in Phase C (0 AP); a stack whose card leaves breaks at once (§10.D).
- **Rulings pinned as examples:** #6 (the poaching fee), #15 (the poaching procedure), #16 (Equity destroyed on firing),
  #22 (Acquisition needs consent), #24 (×1.5 rounds up; only a Junior's Badge adds Token Value; poach refunds; selling a
  product).

## What the language gains

1. **Cards changing owner with everything on them,** across players' Boards (attachment from slice 1b, now between
   players).
2. **A reaction window for the target of an action** (Vest, Cease & Desist), after payment and before the transfer.
3. **Offers made in turn order** until one player accepts (the Market Sale).
4. **Prices summing tokens and attached cards** with a floor, and multipliers with rounding up.
5. **Pairing two cards** under a compatibility table written in the rules text.
6. **Example vocabulary** for all of the above.

## The page

- Integration stacks show the Client tucked under the Host.
- Vest and CTO tokens show on their employee; Scandal as a badge.
- Reaction windows and offers appear in the deciding player's strip; the switcher jumps to them.

## Examples to cover

| Example | Expect |
|---|---|
| M&A Price | Tier 2 with 1 Hype and 1 Bug: $16 |
| Acquisition | with consent and bandwidth; tokens and attached Specialists move; Market Share stays |
| No bandwidth, no buy | refused |
| Market Sale | the first rival in turn order who accepts buys |
| Fire Sale | nobody buys: 50% rounded down from the bank; the card to the Open Idea Pool |
| Poach | a raw Junior costs $4; a Super Junior $16; a Ninja ×1.5 rounded up |
| Poach defenses | HR Manager, Investor Immunity, Vest, CTO, Headhunter Holiday each stop it; Corporate Raider passes HR |
| Ops and Bench are immune | refused |
| Vest | the poach is cancelled and the fee refunded; the token is locked |
| Cease & Desist | cancelled and refunded |
| The transfer | Onboarding Token even on an Agile team; the Hacker's Bug on joining; the old project Stalls without its Lead |
| Destroyed Equity | a Vested employee fired: the token leaves the game |
| Hit Piece | +1 Scandal; not against a Founder whose Equity you hold |
| Scandal scores | −5 VP each, below 0 possible |
| Crisis Management | a Director of QA removes Scandal before Bugs |
| Integration | an App on a Device: +$2 and no Bug Decay for the App, +5 VP for the Device |
| Broken by Offline | either half Offline: no bonuses |
| CTO | $5 and a token on a Tier 2 unit; one per player; can't be poached |

## Goals

- Startup Simulator through slice 8 compiles with no diagnostics; its examples cover the table above.
- Long runs at 2 to 5 players trade products, poach, defend, smear and integrate, and reach the Crash.
- Hearts, Color Match, Venom and Rent Day pass unchanged.

## Anti-goals

- No Startup Simulator words in shared code (poach, Vest, Scandal, Host, Client, CTO, M&A and the like).
- A poach that both transfers the employee and refunds the fee.

## Proof (acceptance)

1. The examples above pass, with every number checked against the rulebook.
2. Long runs end at every player count, with the earlier invariants plus: every card's owner matches its zone after a
   transfer; at most one CTO per player; no Host with two Clients.
3. Each language piece has unit tests; the four games and typecheck pass.

## Left to the builder

- Exact wordings; how stacks and windows look; the auto-player's choices.
