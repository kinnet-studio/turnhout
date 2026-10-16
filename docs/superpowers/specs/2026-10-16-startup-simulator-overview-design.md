# Startup Simulator in turnhout: Overview

**Date:** 2026-10-16
**Status:** Draft for the user's review. A builder check reads it first.
**Source of truth for the game:** `kinnet-studio/suwa`, `rulebook.md` (Version 6.0), including its Rulings Log. The card
data in `suwa/data/*.ron` is a second source; where the two disagree, the rulebook wins (its own appendix says so).
**Builds on:** the designer rules language and the board-games work (Rent Day, slices 1–7, merged in PRs #8–#10).

## What this is

Startup Simulator is the user's card game: an engine builder for 2–5 players about running a tech startup. Today it
runs on a Rust engine in the `suwa` repository. This project writes the whole game in turnhout's plain-text rules
language, as `src/games/startup-simulator.rules`, so it can be played and balanced in the designer.

If the turnhout version works, it **replaces** the Rust implementation. So this is not a sketch: it has to play the
rulebook as written, every rule and every card.

## Why

- **Balancing.** The user changes rules and numbers often: the rulebook is at Version 6.0, the last playtest report
  listed 18 ambiguities, and the Rust engine trails the rulebook (`RULEBOOK_IMPLEMENTATION_TODO.md`). In turnhout a rule
  change is a text change: edit the rules, press Play, see every seat on one screen.
- **Rulings that check themselves.** Each ruling in the Rulings Log becomes one or more examples in the rules text, so a
  later change that breaks a ruling fails at once, the way Rent Day's 108 examples guard it.
- **A real second game for the language.** Rent Day proved the board pieces. Startup Simulator is a card and token
  game with almost no board, so it will show which language pieces are truly general and grow the ones it needs.

## Decisions (the user's)

1. **Target:** the turnhout version becomes the Startup Simulator implementation. The Rust code stays in `suwa` until
   the turnhout version proves itself, and is then disregarded.
2. **What matters first:** the full rules, playable and correct in the designer, for balancing. Online multiplayer and
   the Python/RL bots come later, if at all.
3. **Where it lives:** in turnhout, at `src/games/startup-simulator.rules`, beside Rent Day, because that is where the
   designer loads games from.
4. **What it follows:** rulebook Version 6.0 as written, with the Rulings Log turned into examples.
5. **Built in slices,** like the board games: each slice has a spec, a builder check, a plan, task-by-task building with
   reviews, and a final review.

## Calls (the builder's, for the user to check)

- **The expansion products are in from the start.** §20.F says the 24 expansion cards "are part of the standard game
  (the digital version always uses them)". They are only rows in the card tables.
- **Slice order follows balance.** The first slice is the money loop (hire, build, launch, earn, pay salaries), because
  the last playtest report singled out salary management as the main balance lever.
- **No Startup Simulator words in the engine.** As with Rent Day, every rule is written in the game's text from general
  language pieces. Game words such as Hype, Scandal, Equity, Audit, Junior, Greenlight, Launch and Pivot stay in the
  rules text. Each slice's plan names its banned words.
- **The rulebook wins over the Rust engine.** Where the Rust engine and the rulebook differ, the rulebook is followed.
  Where the rulebook is silent, the Rulings Log and then the Rust engine's behaviour are the guide, in that order, and the
  call is recorded in the slice's spec.
- **Physical aids become the page's job.** The Server Rack strips (§20.E), the player mat and the S.O.P. card are play
  aids, not rules. The page shows the same information its own way.

## Goals

- **The whole rulebook plays** in the designer, for 2 to 5 players, with every card from §20 (30 Strategy, 22 Agency
  Talent, the three University stacks, 65 products, 18 Events, 6 Milestones and the Market Crash).
- **Every ruling is pinned** by at least one example in the rules text, and each slice's examples cover its rules.
- **Games end.** Long runs with a simple auto-player reach the Market Crash and score, at every player count.
- **The engine stays general.** Hearts, Color Match, Venom and Rent Day keep passing unchanged.
- **The playtest page shows the game:** each player's Bench, Development projects with their staff and cubes, Ops Zone
  with Active and Offline products, hands, the markets and pools, the Event in play, and tokens on cards.
- **Balancing is fast:** changing a number in a card table or a rule line and pressing Play shows the change.

## Non-goals

- Online multiplayer across machines (turnhout's separate "online play" project).
- The Python Gymnasium wrapper, RL training and the CLI REPL.
- Card art, the physical player mat and the Server Rack strips.
- Changing the game's rules. Rule questions found while building go to the user, never get settled silently by
  rewording.
- Converting the `.ron` files automatically at runtime. The card tables are written once into the rules text.

## Anti-goals

- **A turnhout version that plays a different game.** A rule that is approximated, simplified or skipped without a
  recorded call and the user's agreement counts as a failure, even if everything else works.
- **Startup Simulator in the engine core.** A phrase or engine feature that only makes sense for this game, such as a
  dividend table built into the engine, is a failure. The table belongs in the text.
- **Hidden information leaking.** Backlogs, the Strategy Hand, Face-Down products and Source reveals must stay hidden
  from the other seats' views.
- **A game that can't end,** or one whose auto-player hides a rule that never fires.

## Constraints

Carried over from the board-games overview:
- The core stays pure: no PixiJS, React or DOM in it, and no `Math.random` or `Date.now`. Dice and shuffles use the
  seeded random numbers.
- `game-state.ts`, `flow.ts`, `game-engine.ts` and `src/pages/hearts-demo/**` are not touched.
- State is JSON only, under `lang:*` keys.
- Designers never see engine words.

Also:
- The rules text is the only description of the game. No game-specific TypeScript besides what `library/rent-day.ts`
  shows is allowed (a small phrase file for genuinely game-only arithmetic); each such phrase needs a recorded reason.

## How the game maps onto turnhout

| Rulebook | turnhout today | Gap |
|---|---|---|
| Talent, Product, Strategy, Event decks; University stacks; Milestones | decks and card tables with columns, `says` columns for card rules | Infinite University stacks; Milestones as goal cards |
| Bench, Backlog, Strategy Hand, Development Zone, Ops Zone | per-player zones with visibility | Limits that force a discard at Cleanup |
| Agency Row (4), Product Market (2 + 2), Open Job Market and Open Idea Pool (FIFO of 5) | shared zones | Rows that slide and refill; FIFO eviction on the 6th card |
| Staff assigned to a product; Sales Reps attached; Attribute cards tucked; Client under Host; Consultant tokens | cards live in zones only | **Cards attached to cards** |
| Cubes on tracks and transient cubes, Bugs, Hype, Scandal, XP (pending and permanent, by color), Skill tokens, Rank Badge, Onboarding | card facts: counts and flags | Facts per color, per state (pending or permanent), possibly many per card |
| Capital, AP, Market Share, Stealth markers | player counters and facts | — |
| Output, bandwidth, revenue, dividends, share price, M&A price, poach fee, valuation | single-card and per-space arithmetic | **Sums and lookups over many cards** (totals, tier tables, rounding) |
| Rounds with a Start Player, Phase A once per round, turns of Phases B–D, 3 AP | phases, turns, moments, interrupt and return | A round start moment; a turn made of fixed steps; an action budget |
| Face-Down products, hidden Backlog, private Source reveals | zone visibility | **Face-down cards in public zones**, revealed later |
| Audit window: opponents bid, the owner chooses Fold or Settle | slice 6 auctions, slice 7 interrupts | Bids by players other than the active one inside another's turn |
| Consent (Acquisition, Divest, Buyback, Secondary Trade), Veto, Cease & Desist, Vest | slice 7 accept/decline | Reactions that cancel a declared action |
| Equity held by one player in another; Partners | player facts | **Facts between pairs of players** |
| Events that change rules "this round" | — | Round-long effects, likely written as conditions on the Event in play |
| Tags and dependencies, Licenses, Domain Expertise | card columns, ownership | Rules over the set of tags a player (or a Partner) provides |
| Choices: which products go Offline, which Pending XP graduates, who goes unpaid, Fold or Settle | picks and buttons | Choosing a set of cards; choices asked of a player mid-step |

## What the language must gain (general pieces)

This list is the overview's guess; each slice's builder check confirms its share.

1. **Cards attached to cards.** A card can sit on another card (staff on a project, an Attribute under a Talent, a Client
   under a Host), move with it, and be counted from it ("each staff member on it").
2. **Sums and lookups.** "the total output of the staff on it", "the total revenue of their active products",
   tier tables ("$1 – $10 pays $1"), multipliers and rounding.
3. **Rounds.** A round start moment run once per round by the Start Player, then each player's turn as fixed steps.
4. **An action budget.** "Each turn a player has 3 actions"; buttons that cost 0, 1 or 2 of them.
5. **Face-down cards in public zones,** with facts hidden from other seats until revealed.
6. **Facts between pairs of players** (Equity held, Partners) and phrases over them.
7. **Reactions inside another player's turn:** bids, vetoes and cancellations, with an order to ask players in.
8. **Choosing a set of cards** (which products go Offline) and **a choice asked mid-step** (which Pending XP graduates).
9. **Rows and queues:** a market row that slides and refills; a pool that evicts its oldest card; infinite stacks.
10. **Round-long effects** of the Event in play.

## The slices

Each slice ends with Startup Simulator playable up to that point, its examples passing and long runs ending.

1. **The money loop.** Setup for 2–5 players, rounds and turns with 3 AP, the University and Agency Row and Open Job
   Market, Ideation from the Product Market and Research, Greenlight (Tier 1), Assign, Reassign, Recall, Pivot, cubes
   generated and committed, Launch, Income (revenue, Market Share), Salaries, Cleanup with hand limits and FIFO pools,
   the Market Crash, and a first valuation (Val, cash, Market Share, Vaporware). Ops bandwidth is not yet checked.
2. **Ops and bugs.** Ops bandwidth per color against Maintenance, the Offline choice, Bugs and QA, Bug decay, Hype and
   Scandal on products, the game-end Ops check.
3. **Tiers, tags and leads.** Tier 2 and Tier 3, Matching Leads and Stalled projects, hybrid Launch, Tags and Licenses,
   Domain Expertise, the Senior Developers' traits.
4. **Talent growth.** Pending and Permanent XP, graduation at Launch, Skill Tokens and modes, Specialists (QA Engineer,
   Sales Rep, Growth Hacker, HR Manager, Junior and Senior PM), Rank Badges, CTO, Onboarding tokens, Human Capital
   scoring.
5. **Strategy cards and Events.** Brainstorm, the Strategy Hand, Training, Attributes and Utility cards, the Event Deck
   and its 18 Events.
6. **Equity and the stock market.** Invest, share price, dividends, Investor perks (Immunity, Partners, Consultant,
   Veto), Buyback, Secondary Trade, Non-Compete Suit, Portfolio scoring.
7. **Selling and poaching.** M&A price, Acquisition, Divest, Market Sale and Fire Sale, the Headhunter and Corporate
   Raider, poaching defenses, Vest and Cease & Desist, Hit Piece, Ecosystem Integration.
8. **Stealth and audits.** Face-Down Greenlight, the Audit window, legality, Fold and Settle, Voluntary Disclosure,
   Stealth Bonus, Bankruptcy and Liquidation, Broken Chain and Come Clean, Milestones, and the full valuation.

## Keep in view while building any slice

- **Staff on cards is the spine.** Slice 1 needs staff assigned to projects. Slices 4, 5 and 7 hang tokens and
  Attributes on staff and move them between owners with everything attached.
- **Hidden information.** Slice 1 already has a hidden Backlog; slice 8 adds Face-Down products in a public zone. The
  view model must not need rework then.
- **Choices mid-step.** Slices 2, 4, 7 and 8 all ask a player to choose during a fixed step. Slice 1's step machinery
  should leave room for that.
- **Arithmetic belongs in the text.** Every number in the rulebook (costs, salaries, tiers, multipliers) should be a
  number in the rules text or a card table, never in TypeScript, so balancing stays a text change.
- **Long runs.** Each slice's auto-player plays every new button at least sometimes, so no rule is guarded only by its
  examples (a lesson from Rent Day's reviews).

## Left to the builder

- Exact phrase wordings, as each slice's builder check and plan settle them.
- The page's look for staff stacks, tokens and markets.
- The auto-player's strategy, as long as it exercises every rule.

## Out of scope

Online play, the RL bots, the CLI, card art, and any rule change. Rule questions found while building go to the user.
