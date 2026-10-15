# Board Games in the Rules Language: Overview

**Date:** 2026-10-15
**Status:** Direction agreed in conversation. Each slice gets its own design before it is planned.
**Builds on:** the designer rule language (`2026-10-15-designer-rule-language-design.md`) and everything
under it: semantic zones, the game-state engine, view projection, net sync and the flow engine.

## Why

The rules language describes card games only. Its README roadmap lists "Tokens and meeples: non-card
pieces, in the engine and in the designer language" as next, and the language spec deferred "tokens,
meeples, dice, boards, quantities" to their own project.

This is that project. A designer should be able to write a board game in the same readable text: pieces
that move around a board, numbers each player holds (money), dice, and buttons that drive a turn. Then
they should be able to playtest it in the browser the same way they playtest Hearts or Color Match.

**Monopoly is the proof.** The whole game is the target. The user asked to build it one piece at a time
while keeping the full game in mind, so that early slices do not box in later ones. This document is
the full picture. Each slice has its own design.

## Decisions (made by the user)

1. **Start with Monopoly**, and aim for the full game.
2. **Build it in slices, one at a time**, in the order below, keeping the full game in view.
3. **The playtest screen gives every seat its own view** (option B of the slice 1 mockups). Every seat
   gets its own board, a line with everyone's money, and its own buttons, as the Hearts and Color Match
   playtests do today. The reasons: it is what each player's screen will be once online play exists,
   it keeps one playtest layout for every game (card games need per-seat views because they hide cards),
   and out-of-turn actions (auctions, trades) fit because every seat already has its own buttons.

## Calls proposed in conversation and accepted

- **General building blocks, Monopoly as the proof.** A board of spaces, pieces, dice, numbers each
  player holds, and clickable actions are general. The designer names them ("money" is money because the
  text says so), so another board game can use them. Monopoly-only rules (rent tables, building evenly)
  live in their own phrase file, the way `library/hearts.ts` holds Hearts' phrases.
- **Same workflow as today.** Designers write text. A line the library does not know gets a hint and a
  code stub, and a developer adds the phrase. Examples in the text check each slice.
- **Deterministic.** Dice use the game's seeded random numbers (`state.rng`), so undo, replay and later
  online play keep working.
- **Playtest as today**: every seat on one screen over loopback. The game allows 2 to 8 players.
- **Unbranded.** The checked-in game has a made-up name and made-up street, station, utility and deck
  names, the same way Color Match stands in for a famous card game. Rules and numbers (prices, rents)
  are not protected; the Monopoly name, board design and street names are. "Rent Day" is the working
  name used in these documents.
- **Success:** a designer writes the whole game in the text, every example passes, and a full game can
  be played to a winner on one screen.
- **Failure, even if it works:** the engine needing Monopoly-specific code to run it.

## The slices

Each slice adds rules to the same game text and stays playable on the designer page.

| # | Slice | What players can do | What it needs that does not exist yet |
|---|---|---|---|
| 1 | **Around the board** | Roll and move; pass Go for 200; buy unowned properties; pay base rent and taxes; go out when below zero; the last player left wins. | Board, pieces, per-player numbers, dice, buttons, "passes" and "lands on" moments, per-turn memory, players going out, space attributes that change (owner). |
| 2 | **Sets and buildings** | A full color set doubles rent; build houses and hotels evenly; station and utility rents grow with how many you own. | Actions with a target picked on the board ("build a house on a street they own"); counting a player's spaces by attribute; facts that change during play on spaces and cards (houses; a card's health or "poisoned", proven by a small card game, Venom); a bank supply (32 houses, 12 hotels). |
| 3 | **Doubles and jail** | Doubles roll again; three doubles or the Go To Jail space sends you to jail; leave by paying, rolling doubles, or after three turns. | Facts about a player that change (in jail, turns in jail); reading the dice faces, not only the total; taking another roll within the same turn. |
| 4 | **Chance and Treasury cards** | Landing on those spaces draws a card that moves, pays or charges you; "Get out of jail free" is kept until used. | Cards and the board on one table; a card table whose column holds a rule sentence that runs when the card is drawn; a card a player keeps. |
| 5 | **Raising money** | Mortgage and unmortgage; sell buildings back; proper bankruptcy, where your assets go to whoever you owe. | A debt that must be settled before play continues, letting the owing player act out of turn; transfers of a player's whole holdings. |
| 6 | **Auctions** | A property the lander does not buy is auctioned to the highest bidder. | Every player acting in a sub-phase; entering an amount; a sub-phase with its own order that returns to the turn it interrupted. |
| 7 | **Trading** | Players offer each other properties, money and kept cards. | Building an offer from parts; one player proposing and another accepting or declining. |

## Keep in view while building any slice

These are the places an early slice could box in a later one. They don't need to be built early, but an
early design should not make them hard:

- **Actions may need more than a button.** Slice 1 actions are plain buttons. Slice 2 needs an action
  with a target picked on the board, slices 6 and 7 need an amount, and slice 7 needs an offer. The move
  an action sends should have room for those parameters.
- **Acting out of turn.** Slices 5 to 7 let players act when it is not their turn. Every seat already has
  its own buttons (decision 3). The flow needs to allow specific actions for specific players outside
  the usual turn, which `anyActor` does today only for reordering.
- **Facts that change during play** belong to spaces (owner, houses, mortgaged) and to players (out, in
  jail). The user's first question was about this for cards ("add attributes to a card so that later
  events have extra effect"). The same mechanism should later serve cards, so a character card can gain
  "poisoned" the way a street gains a house.
- **Moments, not only states.** "Passes Go", "lands on", "draws a card" and "is sent to jail" happen at a
  point in a move. Today's `When …:` rules are states the flow re-checks until they stop being true.
  Slice 1 adds moments; later slices add more of them.
- **Numbers beyond players.** The bank's houses and hotels (slice 2) are numbers that belong to no player.
- **Board and cards together** (slice 4): the Chance and Treasury piles sit on the same table as the board.

## Non-goals (all slices)

- Online play across machines: still its own project, next on the README roadmap.
- House rules (Free Parking jackpot and the like).
- Computer opponents, beyond an auto-player used in tests.
- Timed or real-time play.

## Anti-goals (all slices)

Everything listed in the language spec still applies: no engine vocabulary or stack traces in front of
designers, ambiguity is an error and never a guess, compiled games stay deterministic, and the engine
is extended, not forked. In addition:

- **No Monopoly in the engine.** No `rent`, `property` or `jail` in engine or language code; those words
  appear only in phrases, the game's own phrase file, and the game text.
- **No regressions for card games.** Hearts and Color Match compile, play and pass their examples
  unchanged after every slice.

## Constraints

As in the language spec: pure `core/` (no PixiJS/React/DOM, no `Math.random`/`Date.now`), deterministic,
wire-safe output (`Json` plus names that resolve in the phrase library), existing behaviour unchanged,
and the same stack (Bun, TypeScript, Vite, React 19, PixiJS 8, vitest + happy-dom).
