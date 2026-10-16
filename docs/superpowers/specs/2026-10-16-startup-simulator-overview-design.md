# Startup Simulator in turnhout: Overview

**Date:** 2026-10-16
**Status:** Settled. A builder check read the first draft, and its questions are settled below as the builder's calls,
because the user handed over the whole implementation ("I'll leave this to you for the full rulebook implementation in
turnhout version").
**Source of truth for the game:** `kinnet-studio/suwa`, `rulebook.md` (Version 6.0), including its Rulings Log. The card
data in `suwa/data/*.ron` agrees with the rulebook's §20 tables on every product field, but six talent texts in it are
older than the rulebook, so the card tables are written from §20, not from the `.ron` files.
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
  change is a text change: edit the rules, press Play, see the change.
- **Rulings that check themselves.** Each ruling in the Rulings Log that changes play becomes one or more examples in the
  rules text, so a later change that breaks a ruling fails at once.
- **A real second game for the language.** Rent Day proved the board pieces. Startup Simulator is a card and token game
  with no board, so it shows which language pieces are truly general and grows the ones it needs.

## Decisions (the user's)

1. **Target:** the turnhout version becomes the Startup Simulator implementation. The Rust code stays in `suwa` until
   the turnhout version proves itself, and is then disregarded.
2. **What matters first:** the full rules, playable and correct in the designer, for balancing. Online multiplayer and
   the Python/RL bots come later, if at all.
3. **Where it lives:** in turnhout, at `src/games/startup-simulator.rules`, beside Rent Day.
4. **What it follows:** rulebook Version 6.0 as written, with the Rulings Log turned into examples.
5. **Built in slices,** like the board games: each slice has a spec, a builder check, a plan, task-by-task building with
   reviews, and a final review.
6. **The user handed over every design call** for the full implementation. The calls below are the builder's and are
   listed so the user can check them.

## Calls (the builder's)

### Scope and fidelity
- **The expansion products are in from the start.** §20.F says the 24 expansion cards "are part of the standard game".
  The decks hold 64 products and the Market Crash: base 41 including the Crash, expansion 24 (ruling #2).
- **The rulebook wins.** Where the Rust engine or the `.ron` data differ, the rulebook is followed. Where the rulebook is
  silent, the Rulings Log and then the Rust engine's behaviour are the guide, in that order. Each such call is recorded
  in the slice spec that meets it.
- **Rulings with a play effect get examples.** Rulings about documents only (#2's deck count, #17's dividend example,
  #21's old tag names, #23's player aids) are listed as "no play effect" in the slice that would have owned them.
- **Each slice spec lists what its game still omits,** so an interim game is never mistaken for the real one.
- **Silent cases already settled** (each goes into the slice spec that meets it):
  - Assign moves staff to one team per action.
  - Ideation stops at a 4th Backlog card; Design Sprint can go past it, and Cleanup cuts back to 3.
  - The Bench is hidden from rivals, who see only its size.
  - A Junior's salary counts Permanent XP only.
  - The Ops Zone takes staff only while it runs a product.
  - A Face-Down project shows its staff but hides its identity, cubes and tier.
  - The University stacks are truly infinite; "~10–15 of each" is a physical allowance.
  - The Start Player is a seeded random seat, so seat order isn't fixed while balancing.
  - A Consultant is placed, optionally, when the Equity is bought, and moved at Round Start.
  - Tied players share the win (§12). Today the language gives a tie to the earlier seat; that changes.

### The Veto (§17.B.5)
- **Only an action that costs AP can be vetoed.** The rulebook says "The AP is wasted", which only makes sense for AP
  actions. Free actions (Greenlight, Strategy plays, Integrate, Dismiss, Voluntary Disclosure, poach plays) can't be.
- **It comes at declaration, before anything is paid and before the other side's Consent.** A vetoed action does nothing
  except spend its AP, so nothing needs refunding.
- **Steps of Phases B and D are not actions.** The Offline choice and the Salaries choice can't be vetoed.
- **Built generally, in slice 7 (Equity).** From slice 1b, every AP-costing button spends its AP through one shared rule shape, so
  slice 7 can add a "before an action resolves" window without rebuilding earlier buttons. The window opens only when
  some player could react.

### The page
- **One shared table and a seat switcher.**
  - The shared table holds the markets, pools, decks, the Event in play and the Milestones.
  - Every player's tableau is public and always shown: Development projects with their staff, the Ops Zone with Active
    and Offline products, counters and Equity.
  - Each seat's private strip holds the Bench, Backlog, Strategy Hand, its buttons and its choices. A switcher shows one
    seat's strip at a time and jumps to the seat that must act next.
  - Rivals' hidden hands show as counts.
- **The page's base is built in slice 1a,** as its own tasks: buttons and counters without a board, and the new layout.
  Cards move by dragging in 1a; picking cards by clicking arrives in 1b with the card-pick buttons (the 1a builder
  check's call). Card faces with pips, token badges, attached-card stacks and choice banners arrive with
  the slices that need them.
- **The physical aids become page features:** a Blue and a Red bandwidth gauge per Ops Zone instead of Server Rack strips,
  AP left, the Event in play and claimed Milestones.

### Engine pieces
- **Cards attached to cards: a holder reference in the attached card's data.**
  - The attached card stores its holder's id in its own `data`, under a bookkeeping key the face never shows.
  - Attached cards live in their own static per-player zones, never in the holder's zone: "their development team", "their
    ops team", "their portfolio". Today's zone phrases therefore keep working unchanged. (Attributes are not attached
    cards: slice 6 R2 makes them counts on their Talent plus a parked card, since they sit on hidden and ownerless
    Talents.)
  - A move "with everything on it" moves what is attached, transitively.
  - After every move the runtime checks that each holder is a card in play with the same owner, which catches a rule that
    forgot to free an attached card.
  - No protected file and no `CardState` change is needed.
- **Equity tokens are cards** (three per player, with a `founder` column). Invest, Consultant, Vest and CTO become zones
  plus attachment, and "holds B's Equity" and "Partners" become conditions over cards. No facts between pairs of players
  are needed.
- **XP, Skill, Badge, Bug, Hype, Scandal, Onboarding and cubes stay counts and flags on cards.** New phrases pick the fact
  by a color worked out from context ("XP in its mode's color").
- **A `library/startup-simulator.ts` may exist,** like `rent-day.ts`, for phrases genuinely tied to this game. It may use
  the game's words, but every number stays in the rules text, and each phrase records why it isn't general.
- **No Startup Simulator words in shared code.** Hype, Scandal, Equity, Audit, Junior, Greenlight, Launch, Pivot and the
  like stay in the rules text and that one library file. Each slice plan names its banned words.

## Goals

- **The whole rulebook plays** in the designer, for 2 to 5 players, with every card from §20: 30 Strategy cards, 22 Agency
  Talent cards, the three University stacks, 64 products and the Market Crash, 18 Events and 6 Milestones.
- **Every ruling with a play effect is pinned** by at least one example, and each slice's examples cover its rules.
- **Games end.** Long runs with a simple auto-player reach the Market Crash and score, at every player count. The
  auto-player presses every button sometimes, so no rule is guarded only by its examples.
- **The engine stays general.** Hearts, Color Match, Venom and Rent Day keep passing unchanged.
- **The page shows the game** as described above.
- **Balancing is fast:** changing a number in a card table or a rule line and pressing Play shows the change.

## Non-goals

- Online multiplayer across machines (turnhout's separate "online play" project).
- The Python Gymnasium wrapper, RL training and the CLI REPL.
- Card art, the physical player mat and the Server Rack strips.
- Changing the game's rules. Rule questions found while building are recorded as calls and listed for the user; none
  are settled silently by rewording.
- Converting the `.ron` files at runtime. The card tables are written once into the rules text.

## Anti-goals

- **A turnhout version that plays a different game.** A rule that is approximated, simplified or skipped without a
  recorded call counts as a failure, even if everything else works.
- **Startup Simulator in the engine core,** such as a dividend table built into the engine. Tables belong in the text.
- **Hidden information leaking.** The Bench, Backlog, Strategy Hand, Face-Down products and private reveals stay hidden
  from the other seats' views.
- **A game that can't end,** or an auto-player that hides a rule that never fires.

## Constraints

Carried over from the board-games overview:
- The core stays pure: no PixiJS, React or DOM in it, and no `Math.random` or `Date.now`. Dice and shuffles use the
  seeded random numbers.
- `game-state.ts`, `flow.ts`, `game-engine.ts` and `src/pages/hearts-demo/**` are not touched.
- State is JSON only, under `lang:*` keys.
- Designers never see engine words.

Also:
- Two changes reach shared core that the Hearts demo also uses: face-down cards in a public zone (`derive-scene.ts`) and
  clicking a card (`input/table-input-context.ts`). Each needs a no-regression check on Hearts.

## What the language must gain

Confirmed against the code by the builder check. Each slice's builder check confirms its share.

1. **Counters and buttons in a game with no board.** Money and buttons exist only under `Board:` today, and the page
   draws buttons only for board games. This is the very first piece slice 1a needs.
2. **Buttons that pick a card:** one card, a card and a target card, or a set of cards. Cards move today only by
   dragging to a zone.
3. **Cards attached to cards,** as settled above.
4. **Values worked out for cards:** the `Rent:` mechanism, applied to cards. It covers output by mode, salary, revenue,
   M&A price, the poach fee and Maintenance, plus derived classes such as "a Tier 2 unit".
5. **Sums and lookups:** totals over cards, tier tables, multipliers, and rounding up as well as down.
6. **"For each card …" lines.**
7. **Rounds:** a round start run once per round from the Start Player, then each player's turn as fixed steps. This
   includes turn steps that pass the turn without a button press.
8. **An action budget,** reset each turn.
9. **Rules that fire in every phase,** for refills, FIFO eviction and Milestone claims.
10. **Rows and queues:** the bottom (oldest) card of a pool, a card entering a row at its left end, and infinite stacks
    with cards created at runtime.
11. **Drawing "up to N",** with a deck that reshuffles partway through a draw.
12. **Face-down cards in public zones,** revealed later.
13. **Interrupts inside interrupts,** for the Audit, Bankruptcy, Market Sale and Come Clean chain.
14. **Cancelling a declared action** (Veto, Cease & Desist, Vest).
15. **Per-card values from a list** (a mode: Blue, Red or QA), or three flags kept apart by rules.
16. **Tied winners.**
17. **Setup pieces:** the Market Crash shuffled into the bottom 20% of the Growth Deck, and 3 of 6 Milestones revealed.
18. **Example vocabulary** for each piece.

Already there, with small additions:
- Cleanup limits, through a cleanup step with discard buttons.
- Consent, through accept and decline.
- Bids by players other than the active one, through the auction pattern.
- Round-long Events, written as conditions on the Event in play.
- Per-color counts on cards, which only need color-picking phrases.

## The slices

Each slice ends with Startup Simulator playable up to that point, its examples passing and long runs ending (once the
Market Crash is reachable).

1. **1a. Table, money and turns.**
   - Counters and buttons without a board.
   - Rounds, the Start Player, fixed steps and AP.
   - Recruiting from the University, Agency Row and Open Job Market, with refill, slide and FIFO.
   - Ideation from the Product Market, Research, and the Open Idea Pool for 2 AP.
   - Cleanup limits for the Bench and Backlog.
   - The Market Crash, finishing the round, and a first score: cash and Vaporware.
   - The page's base.
2. **1b. Building (Tier 1).**
   - Card-pick buttons with targets, and attachment.
   - Greenlight, Assign, Reassign, Recall, Pivot, Onboarding, Dismiss, Layoff/Source.
   - Cubes generated and committed, Launch, revenue, Market Share, Salaries with the unpaid choice.
   - Val in the score.
3. **Tiers, tags and leads.**
   - Tier 2 and Tier 3, Matching Leads written as a derived property, Stalled projects, hybrid Launch.
   - Tags and Licenses, Domain Expertise.
   - The traits of the Senior Developers whose systems exist by then.
   - The Growth Deck becomes live, so games end naturally.
4. **Modes, Ops and bugs.**
   - Mode declaration, including the flex Seniors and the Fixer's QA mode.
   - Ops bandwidth per color and the Offline set choice.
   - Bugs, with their sources (the Hacker, the Growth Hacker), QA, and Bug decay.
   - The game-end Ops check.
5. **Talent growth, Brainstorm and Training.**
   - Pending and Permanent XP, and graduation at Launch with Mentor.
   - Skill tokens.
   - Specialists: QA Engineer, Sales Rep, HR Manager, Junior and Senior PM with Synergy and Agile.
   - Rank Badges.
   - Brainstorm and the Strategy Hand, with the Training cards.
   - Human Capital scoring and the Milestones.
6. **Attributes, Utility cards and Events.**
   - Workaholic, Clean Coder, Visionary, Toxic Personality, Burnout, Flight Risk.
   - TechCrunch Feature with Hype, Design Sprint, Cease & Desist.
   - The whole Event deck from this slice. The Events whose systems come later are recorded as not yet in effect.
7. **Equity and the stock market.**
   - Equity cards, Invest and share price, dividends.
   - The perks: Immunity, Partners with the License waiver, Consultant, and the Veto.
   - Buyback, Secondary Trade, the Non-Compete Suit, Portfolio scoring.
8. **Selling and poaching.**
   - M&A price, Acquisition, Divest, Market Sale and Fire Sale.
   - The Headhunter and Corporate Raider, the defenses, Vest and Cease & Desist.
   - Hit Piece with Scandal.
   - Ecosystem Integration.
   - CTO.
9. **Stealth and audits.**
   - Face-Down Greenlight, the Audit window and its bidding, the legality checklist.
   - Fold and Settle, Voluntary Disclosure, Stealth Bonus.
10. **Bankruptcy and the Broken Chain.**
    - Nested interrupts.
    - Bankruptcy and Liquidation.
    - Broken Chain and Come Clean.
    - The full valuation checked against every §12 line.

## Keep in view while building any slice

- **Staff on cards is the spine.** Slice 1b needs staff on projects. Later slices hang tokens and Attributes (as counts,
  slice 6 R2) on staff and move them between owners with everything attached.
- **Hidden information.** Slice 1a already has a hidden Bench and Backlog; slice 9 adds Face-Down products in a public
  zone. The view model must not need rework then.
- **Choices mid-step.** Slices 1b, 4, 5, 8, 9 and 10 ask a player to choose during a fixed step. Slice 1a's step
  machinery leaves room for that.
- **Arithmetic belongs in the text.** Every number in the rulebook (costs, salaries, tiers, multipliers) is a number in
  the rules text or a card table, never in TypeScript, so balancing stays a text change.
- **AP-costing buttons share one shape** from slice 1b, so the Veto window can be added in slice 7 without rebuilding.

## Left to the builder

- Exact phrase wordings, as each slice's builder check and plan settle them.
- The page's look within the layout above.
- The auto-player's strategy, as long as it exercises every rule.

## Out of scope

Online play, the RL bots, the CLI, card art, and any rule change.
