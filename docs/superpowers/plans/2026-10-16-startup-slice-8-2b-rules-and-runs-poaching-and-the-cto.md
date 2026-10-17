# Startup Simulator Slice 8-2b (Rules text and long runs: poaching and the CTO) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Startup Simulator plays the half of slice 8 in which people change hands:
- **poaching** with a Headhunter ($0) or a Corporate Raider ($2), for no action:
  - the fee is (printed cost + Token Value) × the lowest multiplier, ×1.5 rounded up, paid to the bank;
  - it fails against an HR Manager on the team (the Raider ignores it), Investor Immunity, a Vest, a CTO or Headhunter Holiday;
  - a victim with an Equity token in supply or a Strategy card in hand may Vest the employee or play Cease & Desist, the poacher getting the fee back;
  - otherwise the employee moves to the poacher's project or ops team with everything on it and an Onboarding Token;
- **the CTO:** 1 AP, $5 and one of the player's own Equity tokens on a Tier 2 unit; one per player; immune to poaching;
- **destroyed Equity:** a Vest or CTO token leaves the game when its employee is fired, let go, discarded from the bench, or leaves with a sold product; a Fire Sale keeps it.

The long runs play all of it at 2 to 5 players.

**Architecture:**
- **This is plan 8-2b, the second half of slice 8's rules plan** (it grew past eight tasks, so it is two plans).
  - Plan 8-2a (`docs/superpowers/plans/2026-10-16-startup-slice-8-2a-rules-and-runs-products.md`: the M&A Price, Acquisition, Divest, Hit Piece, Crisis Management, Integration) is built first. Plan 8-3 (the page) comes after.
  - The seam: 8-2a moves products; this plan moves people, and the Equity tokens locked on them.
- This plan writes only the rules text, its examples and the long runs. It adds no phrase and changes no shared code.
- **Four tasks:**
  1. the poaching fee, the Headhunter and the Corporate Raider, their defenses, and the placing of the poached employee;
  2. the counter-offer: Vest and Cease & Desist (R4), and the Vest token destroyed (R1);
  3. the CTO, and its token destroyed likewise;
  4. long runs: every slice-8b path tallied, whole games replayed; the README and the checks.
- **Phases.** Two are added after 8-2a's `Phase: market sale` (the last): `placing`, an interrupt like `research`, and `counter-offer`, an 8-1 ask phase. Phase order after this plan ends `…, lawsuit, consent, market sale, placing, counter-offer`.
- **Builder calls this plan makes** (recorded for the owner):
  - **Two poach buttons, two verbs** (8-1's "Left to 8-2"; the fees and the HR test differ):
    - `headhunt with a card from their strategy hand to a card in another player's development team`;
    - `raid with a card from their strategy hand to a card in another player's development team`.

    Each picks the Strategy card and the target, for no action (§16 "0 AP"; the overview: poach plays can't be vetoed). The target zone is a rival's development team only, so the Bench and the Ops Zone are immune by construction (§3, §16.A.1). A test pins that, since an example can't press a button no card fits (6-2a's lesson).
  - **The fee is three worked numbers on the target** (§16.B):
    - `token value`: $2 per XP, Training XP, Pending XP, Skill and Attribute count; $4 for a badged Junior;
    - `poach base`: the printed cost plus the token value;
    - `poach fee` (×2; ×1.5 rounded up when the target is `cheaper to poach`, a Full Stack Ninja; ×1 when it is `cheapest to poach`, under Flight Risk or Recruiter Frenzy) and `raid fee` (×1.5 rounded up; ×1 when cheapest).

    The last value line that applies wins, which is "the lowest multiplier" (8-1 Task 1).
  - **The printed cost** (§16.B.1, the controller's pre-flight note).
    - 6-2b refines `cost` with Chip Shortage's +$3, and no phrase reads a column's printed value past its section.
    - So `poach base` starts from `cost` by class (`A Senior Developer card's poach base is its cost.`, and the Specialist and Junior forms; a `A card's … is its cost.` line would stand in for the cost column on the page) and takes the $3 off a `chip short` card.
    - The 3 is §20.D's, written once more (see Gaps).
  - **The defenses are worked flags on the target:**
    - `hr shielded`: the card it is on is `hr covered`, which some card on it that is `gatekeeping` makes it;
    - `safe from poaching`: Headhunter Holiday in play; its Vest (Task 2) or CTO (Task 3) mark.

    The Raider's button leaves out the HR line (§16.A.2). Immunity is 7-1's `they have no card in their portfolio whose founder is the target card's owner` (§17.B.2). An HR Manager is never onboarding during a rival's turn (each turn start clears every token), so no onboarding test is written.
  - **The destination is a second press** (8-1's recorded limit: no button picks three cards).
    - The poach marks its target `poached` and, after the counter-offer, starts `placing` with the poacher. There the one button `place a card from another player's development team to a card in their development or their operations` puts it on a project, or on a product to join the ops team: attached for a Sales Rep or Growth Hacker, pooled for anyone else (§16.A.1, ruling 19).
    - The poach press refuses a poacher with neither a project nor a product, so `placing` can't strand.
    - §16.A names the destination before the fee; this order is the call.
  - **What the transfer carries.**
    - Counts and flags ride with the card.
    - The placing clears the declared mode (§11.C.2 "Mid-turn arrivals … work in their native color"; suwa's `release_talent`).
    - It marks the card `onboarding` after the move, so no Agile line spares it (§16.D.3 "even on an Agile PM's team").
    - The Hacker's Bug is 4-2's join rule, told by the move.
    - A Junior PM's Pending Badge is 5-2a's worked flag, which reads the project it now sits on.
    - The project it left Stalls by its worked flag.
  - **The counter-offer is 8-1's ask** `The target card's owner has the counter-offer.`, after the payment and before the placing, under R4's two `Only if one of:` lines (an Equity token in supply, or a Strategy card in hand).
    - Its buttons are `vest a card from their equity to a card in their development team`, `block the poach with a card from their strategy hand to a card in their development team` and `let the poach go ahead`.
    - Vest and the block each give back `fee paid`, the target's poach fee or, once `raided`, its raid fee, never the Raider's $2 (ruling 24).
  - **Locked Equity (R1).** Vesting or promoting moves a token from the player's supply to a public per-player row `locked equity` and puts `1 vest` or `1 cto` on the employee.
  - **Destruction is one rule for every route** (R1; see Gaps for why not lines in each route):
    - 5-1's `When a player's …:` frame in `In every phase:` boxes the top card of a player's locked equity while it holds more cards (`locked tokens`) than the marks on their bench, development team and ops team (`locks`);
    - a card in the open job market that is `holding equity` loses its marks;
    - the two buying buttons strip the marks of the staff on a sold product before moving it, so the seller's count drops and the rule boxes the seller's token.
    - So dismissal, an unpaid let-go, a Regulation Audit let-go, the Diva's Pivot, a bench discard, a Layoff and a sale all destroy, and slice 9's Fold will too.
    - A Pivot or Recall to the bench, and a Fire Sale's return to the bench, keep the mark and its token (R1).
  - **CTO** is `promote a card in their development team` and `promote a card in their ops team` (1 AP each; one button can't pick in two zones).
    - Each is guarded on the worked flag `lead material` (a Senior Developer, a badged Junior, or a Visionary holder: §11.G.1, suwa's `tier3_eligible`), on no card of the player's with a `cto` mark (the bench counted, as the token is still attached there), on a token in supply, and on $5.
    - Promoting a unit already Vested is allowed, and locks a second token (§11.G.2 names no bar).
- **Names.**
  - Zone: each player's `locked equity` (row, public).
  - Flags kept: `poached`, `raided`. Counts: `vest`, `cto`.
  - Worked numbers: `token value`, `poach base`, `poach fee`, `raid fee`, `fee paid`.
  - Worked flags: `badged junior`, `cheaper to poach`, `cheapest to poach`, `gatekeeping`, `hr covered`, `hr shielded`, `safe from poaching`, `holding equity`, `lead material`.
  - Player values: `locked tokens`, `locks`.
  - Phases: `placing`, `counter-offer`.
  - Buttons:
    - `headhunt with …`, `raid with …`, `place a card from another player's development team to a card in their development or their operations`;
    - `vest a card from their equity to a card in their development team`, `block the poach with a card from their strategy hand to a card in their development team`, `let the poach go ahead`;
    - `promote a card in their development team`, `promote a card in their ops team`.

**Tech Stack:** TypeScript (strict), Bun, Vitest + happy-dom.

**Spec:** `docs/superpowers/specs/2026-10-16-startup-slice-8-selling-poaching-design.md` is binding, and its "Builder-check rulings" win over its body:
- R1: Vest and CTO are a mark on the employee plus a parked "locked equity" card, destroyed when an attached employee leaves in an Acquisition or Market Sale, kept by a Fire Sale. The mark rides through Recall, Pivot and the Bench.
- R4: the counter-offer window opens when the victim has Equity in supply or a non-empty Strategy Hand, public facts only.

It sits under `docs/superpowers/specs/2026-10-16-startup-simulator-overview-design.md`, also binding as amended by slice 7 R1 and slice 8 R1–R2, with its rule "every number comes from the rulebook, and examples say where" and its anti-goals.

The other inputs:
- plan 8-2a, whose Global Constraints, names and test helpers this plan builds on;
- plan 8-1, whose Interfaces blocks (Tasks 1–3, 6–7 especially) are the phrases this plan writes with;
- plans 5-1, 6-1 and 7-1's phrases (5-1's `When a player …:` frame, 7-1's founder tests);
- `builder-check-startup-8.md` in the session scratchpad;
- the controller's pre-flight note for 8-2 (`notes-8-preflight.md`: the poach fee reads the printed cost);
- `suwa/rulebook.md` v6.0 §3, §6 (Pivot, Assign, Reassign), §11.B, §11.C.2, §11.E–G, §12.4, §13.B, §15.A.3, §15.C, §16, §17.B.2, §17.D, §18.B, §20.A–B, §20.D (9, 13, 15), Rulings #6, #8, #9, #15, #16, #24;
- where those are silent, suwa's `poach.rs`, `resolvers/hostile.rs`, `resolvers/common.rs` (`release_talent`, `fire_board_talent`) and `resolvers/talent_actions.rs` (`promote_tier3`, `tier3_eligible`).

## Global Constraints

- **All of plan 8-2a's Global Constraints apply**, its controller amendments (counts from the committed test, the removal probe each task, the auto-player steered when a tallied path would stay at 0, counts as numbers and flags as `=== true`) and its pre-flight notes included. They are repeated here where they bind.
- **Branch and commits.** Develop on `claude/peaceful-curie-rdfkow`. Commit by pathspec, never `git add -A`. Every commit message ends with these two lines and contains no model identifiers:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC`
- **Protected files never change:** `src/engine/core/game-state.ts`, `src/engine/core/flow.ts`, `src/engine/core/game-engine.ts`, `src/pages/hearts-demo/**`.
- **The core stays pure:** no pixi/react/DOM in `src/engine/core/**`, no `Math.random` or `Date.now`.
- **State is Json-only, under `lang:*` keys.** This plan adds no key: counts, flags and the locked tokens live in the rules text; `lang:window` holds the counter-offer.
- **No Startup Simulator words in shared code.** The banned list is plan 8-1's (plan 7-1's plus poach, vest, cto, acquisition, fire sale, hit piece, scandal, integration, host, client, headhunter, crisis, m&a, divest, raider, market sale, counter-offer). This plan touches no shared code.
- **The other games.** Hearts, Color Match, Venom and Rent Day stay unchanged. Rent Day keeps its 108 examples.
- **Files this plan changes:**
  - `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts` and `README.md`;
  - test-file pins under `src/pages/designer/**` that read the rules text, and no page source:
    - the Startup example count in `designer-page.test.tsx`;
    - the offered-button lists, phase lists, zone lists and fitted-table pins in `playtest-fitted.test.tsx` and `tableaux.test.ts` that the new buttons, phases or the `locked equity` row change.
  - Each such pin is pinned as the view now says it and reported. Nothing under `src/engine/**` changes.
- **Every number comes from the rulebook, and examples say where:** a section or ruling in each title, and each task's "How the numbers come". The numbers are:
  - 200%, 150% rounded up and ×1 (§16.B.3);
  - $2 per token and $4 for a Junior's Badge (§16.B.2);
  - the printed cost (§16.B.1), and Chip Shortage's $3 (§20.D 9);
  - $0 / $2 for the Headhunter and the Corporate Raider (§20.A);
  - $5 and one token for the CTO (§11.G.2).
- **Anti-goals (spec and overview):**
  - a poach that both transfers the employee and refunds the fee;
  - a poach of Bench or Ops staff, or past a defense;
  - the counter-offer window reading the hidden Strategy Hand (R4);
  - more Equity tokens of a player than 3, or a locked token without its mark, or a mark without its token;
  - a CTO beyond one per player;
  - Startup words in shared code;
  - a game that can't end;
  - an auto-player that hides a rule that never fires.
- **Every rules line is pinned.** Each line this plan adds or changes fails some example when it alone is removed, or is named in its task as pinned by a test instead. Excepted are `Hint:` lines, `Players take turns.` lines, table rows and `Cards can …` declarations.
- **Examples arrange at most 3 Equity tokens naming one player,** and add one mid-example only while no Equity naming that player is anywhere on the table (7-1: a claim takes such a card from the table, else makes one).
- **Example counts.** N₁₁ is the count the committed test pins when Task 1 starts: plan 8-2a's N₁₀ + 14, plus whatever fix waves add.
  - The tasks end at N₁₁ + 8, + 15 and + 20.
  - Each task updates `results` in `startup-simulator.test.ts`, the Startup test in `designer-page.test.tsx` and the README's "Its N examples".
- **Commands.**
  - Single file: `bunx vitest run src/games/startup-simulator.test.ts`. Full suite: `bun run test`. Types: `bun run typecheck`.
  - Before Task 1: record `BASE=$(git rev-parse HEAD)`; run `bun run test` once for the passing count and the long runs' time; note N₁₁.
- **Existing tests.** Only the lines each task names change. If any other existing test fails, stop and report it.
- **Long runs.**
  - If an invariant shows a wrong rule, fix the rules text.
  - If a required tally stays at 0, change the auto-player, never the rules. Report a key that stays unreachable and pin its path with an arranged test.
  - If a rule can't be written with plans 4-1 to 8-1's phrases, report it.
  - If the long runs take more than a third longer than at BASE, report the timing.
- **Style.**
  - 2-space indent, single quotes, comments that say why.
  - Commit prefix `feat(games):` (`docs:` for a README-only commit).
  - TDD every task: change the test first, watch it fail, then the rules, pass, `bun run typecheck`, commit.
  - Every rules line below is exact copy. Insertion points name a line or section by its text, never by a line number.
  - **Re-read the committed rules file before each task:** the text of plans 4-2 to 8-2a is the base. If a named anchor line is missing or worded otherwise, stop and report it.
  - In examples, a zone's `Given` comes before any `… has a … on it` Given that adds to the same zone.
  - If a line reads two ways (an `ambiguous` diagnostic), stop and report it. If an example's verb form or refusal text differs from the compiler's (a `… or …` refusal), use the compiler's and report it.

## Review Focus

- **A poach its victim can answer only by letting it go:** no Equity in supply but a Strategy Hand without a Cease & Desist, or the last token in supply.
  - Expected: the window opens on the public facts alone, and the victim may only let it go, or Vest with the last token.
  - Tests: Task 2 examples 1 and 3.
- **A poached card carrying tokens, a mode, a Pending Badge, an Ego or Spaghetti Code.**
  - Expected:
    - tokens ride and are priced;
    - the mode is forgotten;
    - the Junior PM's Pending Badge holds only on a Tier 2/3 project;
    - the Diva can be poached though she can't be reassigned;
    - the Hacker's Bug lands on his new project.
  - Tests: Task 1 examples 1, 4 and 5.
- **A marked employee leaving by every route:** dismissed, let go at Income or a Regulation Audit, the Diva's Pivot, a bench discard, a Layoff, an Acquisition, a Market Sale, a Fire Sale, a Pivot or Recall to the bench.
  - Expected: destroyed by all but the last two, which keep the mark and the token.
  - Tests: Task 2 examples 4–7, Task 3 examples 4–5, and the long-run locked-equity invariant.
- **Fee arithmetic at its edges:** ×1.5 of an odd base, the lowest of two multipliers, Chip Shortage on a Hardware target, a Specialist's Badge, a Pending token.
  - Expected: $11 for the Architect raided, ×1 for a Flight Risk Ninja, the printed cost, no Badge value, $2 each.
  - Tests: Task 1 examples 1–3.
- **Undo, replay and the page's view across a counter-offer and a placing.**
  - Expected: the log alone rebuilds the finished game, and undo of the last move gives the state before it. No seat's waiting view names a card in another seat's Strategy Hand.
  - Tests: Task 4.

## Assumed from earlier plans (check before Task 1)

Re-read each item at HEAD by name. If one is missing or differs, stop and report it.

- **Plan 8-2a, built:**
  - `scandal`, `sale price`, `running`, `Hosting:`, `Crisis spent:`;
  - `acquire …` with `      They pay its sale price to its owner.`;
  - `Phase: market sale` (the last phase) with `buy …` and the same line;
  - in the test file `askOf`, `ACQUIRE`, `AGREE`, `BUY`, `DIVEST`, `ANSWERS`, the judge's ask rule, `publishing()`, `integrating()`, the transfer invariant.
- **Plan 8-1, built:**
  - `a {cardflag} card's {attribute} is {int}% of its {attribute}, rounded up`;
  - `they have at least the card's {attribute} plus the target card's {attribute} in {counter}`;
  - `they pay the target card's {attribute}`;
  - the ask `The target card's owner has the counter-offer.`;
  - `the player acting gets the target card's {attribute}`, `The action goes ahead.`, `The action does not go ahead.`.
- **Plan 7-2a/7-2b, built:**
  - the zones `equity` and `portfolio` (`  Each player has a portfolio row that everyone can see, where some cards are on other players' cards.`);
  - the Equity conservation invariant and its line "`equity-F` is never empty";
  - `EQUITY_TOKENS`, `founderOf`, `windowJudge`, `turnOf`.
- **Plan 6-2b, built:**
  - `Chip short:`, `Cost:` (`  A chip short card's cost goes up by 3.`), `the event in play has the …`;
  - the event check's two let-go buttons;
  - the example "each Round Start discards the Event in play and reveals the next …; an Event whose system comes later does nothing yet …".
- **Plan 6-2a, built:**
  - the Attribute counts `workaholic`, `clean coder`, `visionary`, `toxic personality`, `burnout`, `flight risk` and the attributes in play;
  - the Diva's `      Every card on it that is egotistic is fired.`;
  - the examples "only a Debuff goes on a rival's staff, and a Cease & Desist waits in the hand for slice 8's poaching …" and "each Utility card plays only as itself: … a Cease & Desist waits in the hand for slice 8 …";
  - `isPlayable`, `debuffing()`, `ATTRIBUTES`, `tokenOn`.
- **Plan 5-2a, built:**
  - the counts `blue xp`, `red xp`, `green xp`, `training xp`, `blue skill`, `red skill`, `green skill`, `pending blue`, `pending red`, `pending green`; the flags `badged`, `blue mode`, `fired`;
  - worked `xp`, `pending tokens`, `Pending badge:`;
  - the role `Junior` on the University stacks;
  - the firing buttons and `When a card in the open job market is fired:`;
  - in the test file `TOKENS`, `DISMISS_FROM_PROJECT`, `DISMISS_FROM_OPS`, `LET_GO`, `DISCARD_BENCH`, `LAY_OFF`, `PIVOT`, `RECALL`.
- **Plan 5-1, built:** the `When a player's <words>:` frame in `In every phase:` (its Task 5), `a player's {playervalue} is the number of {cardgroup}`, `If <a> and <b>, <effect>`, targets in several zones.
- **Plan 4-2, built:** the modes `red mode`, `qa mode` and their invariant; `Attaching:`; the join rule `  When a Spaghetti Code card joins a card in a development:`.

---

### Task 1: The poaching fee, the Headhunter and the Corporate Raider, their defenses, and the placing

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count); `playtest-fitted.test.tsx` only where it pins the actions phase's offered buttons or the phase list

**Interfaces:**
- Consumes: 8-1 Tasks 1–2; 7-1's founder test and picks in another player's zone; 5-1's targets in several zones and `If … and …`; 8-2a's `running`.
- Produces (rules):
  - the flag `poached`;
  - worked numbers `token value`, `poach base`, `poach fee`, `raid fee`;
  - worked flags `badged junior`, `cheaper to poach`, `cheapest to poach`, `gatekeeping`, `hr covered`, `hr shielded`, `safe from poaching`;
  - the buttons `headhunt with …` and `raid with …`;
  - `Phase: placing` with its one button.
- Produces (test file):

```ts
const HEADHUNT = "headhunt with a card from their strategy hand to a card in another player's development team";
const RAID = "raid with a card from their strategy hand to a card in another player's development team";
const PLACE = "place a card from another player's development team to a card in their development or their operations";
/** The fee `type` (HEADHUNT or RAID) pays for `id` as the rules work it out, without the Strategy card's price (§16.B). */
const poachFeeOf = (runtime: LangRuntime, state: GameState, id: string, type: string): number;
```

- [ ] **Step 1: Change the tests.**
  - **Pins.**
    - `results` is N₁₁ + 8; the designer page's count too.
    - `PHASES` gains `'placing'` after `'market sale'`.
    - The values test adds `token value`, `poach base`, `poach fee`, `raid fee` (numbers) and the seven flags.
    - Re-pin `shownFlags` and `standIns` from HEAD as the view gives them, and report the change. Expected: `shownFlags` gains `cheaper to poach` and `badged junior`, which read only the card. It leaves out `cheapest to poach` (it reads the Event) and the three HR flags (they read the card a card is on). `standIns` is unchanged.
  - **Money (`keepsTheRules`).**
    - A `HEADHUNT` press pays the target's `poach fee`, read in `before`.
    - A `RAID` press pays the Strategy card's `price` plus the target's `raid fee`.
    - Both go to the bank, and nobody else's capital changes.
    - `PLACE` changes no capital.
  - **Invariants (the spec's Proof 2, R4, the anti-goals):**
    - **The press.** A `HEADHUNT` or `RAID` press's target is in another seat's development team, and the mover's portfolio held no card naming that seat in `before`.
    - **The mark.** `poached` sits on at most one card, only while the phase is `placing` (Task 2 adds `counter-offer`), on a card in a development team of a seat other than `turnOf(state).seat`.
    - **The placing.** A `PLACE` moves its card from another seat's development team to the mover's development team, on a project, or to the mover's ops team. After it the card is `onboarding`, is not `poached`, and is in no mode (no `red mode`, `qa mode` or `blue mode`), its other counts and flags as in `before`.
    - **Modes.** 4-2's and 5-2a's mode invariants widen: a card's mode may also clear in a `PLACE` of it.
    - **Pending Badge.** A `Synergy` card that a `PLACE` puts on a Tier 1 project is not `pending badge` after it.
  - **The auto-player.**
    - **`poaching()`,** a free move made at most once a turn, right after `integrating()`, when `t % 3 === 1` and its strategy hand holds a Headhunter or a Corporate Raider. It tries, in order:
      - with a Corporate Raider, a target that is `hr shielded`;
      - a target in a seat whose Equity its portfolio holds;
      - a target that is `safe from poaching`;
      - then every other target in other seats' development teams, from its left.

      It presses the first that is allowed, with the Raider for an `hr shielded` target and the Headhunter otherwise. Each refusal is counted by the `refused` callback.
    - **In `placing`:** on a `t` with `t % 2 === 0`, the poached card goes on its first project; otherwise on its first product; else wherever the other allows.
    - **`isPlayable`** counts a Headhunter and a Corporate Raider as playable.
  - **Append `it('offers a Headhunter and a Corporate Raider only other players’ Development staff: their ops teams and benches are immune (§3, §16.A.1)')`.**
    - On an arranged 2-player state (p0 holding both cards and a project; p1 with a Junior Software Dev on a project, one in its ops team on a product, and one on its bench), `ontoCandidates` of each button for p0's card are exactly p1's development team's Junior.
    - This test pins the target zone; no example can press a button no card fits.
- [ ] **Step 2: Run** `bunx vitest run src/games/startup-simulator.test.ts`. Expected: FAIL.
- [ ] **Step 3: Change the rules text.**
  - **Cards.** After `  Cards can be for sale.` add `  Cards can be poached.`
  - **The fee and the defenses** (§16.A.2, §16.B, §20.A–B, §20.D 9, 13, 15, rulings 6 and 24). Right after the `Hosting:` section add:

```text
Badged junior:
  Only if it is a Junior card.
  Only if it is badged.

Token value:
  A card's token value is 0.
  A card's token value goes up by 2 for each xp.
  A card's token value goes up by 2 for each training xp.
  A card's token value goes up by 2 for each pending token.
  A card's token value goes up by 2 for each blue skill.
  A card's token value goes up by 2 for each red skill.
  A card's token value goes up by 2 for each green skill.
  A card's token value goes up by 2 for each workaholic.
  A card's token value goes up by 2 for each clean coder.
  A card's token value goes up by 2 for each visionary.
  A card's token value goes up by 2 for each toxic personality.
  A card's token value goes up by 2 for each burnout.
  A card's token value goes up by 2 for each flight risk.
  A badged junior card's token value goes up by 4.

Poach base:
  A Senior Developer card's poach base is its cost.
  A Specialist card's poach base is its cost.
  A Junior card's poach base is its cost.
  A chip short card's poach base goes down by 3.
  A card's poach base goes up by its token value.

Cheaper to poach:
  Only if it is a Mercenary card.

Cheapest to poach:
  Only if one of:
    Its flight risk is more than 0.
    The event in play has the Recruiter Frenzy.

Poach fee:
  A card's poach fee is 200% of its poach base, rounded up.
  A cheaper to poach card's poach fee is 150% of its poach base, rounded up.
  A cheapest to poach card's poach fee is its poach base.

Raid fee:
  A card's raid fee is 150% of its poach base, rounded up.
  A cheapest to poach card's raid fee is its poach base.

Gatekeeping:
  Only if it is a Gatekeeper card.

HR covered:
  Only if some card on it is gatekeeping.

HR shielded:
  Only if the card it is on is hr covered.

Safe from poaching:
  Only if the event in play has the Headhunter Holiday.
```

  - **The poach** (§7 Headhunter, §16.A, §16.B, §16.D.1, §20.A, ruling 15). In `Phase: actions`, right before `  A player may end their actions.` add:

```text
  A player may headhunt with a card from their strategy hand to a card in another player's development team.
    Only if it is a Headhunter card.
    Only if the target card is not safe from poaching.
    Only if the target card is not hr shielded.
    Only if they have no card in their portfolio whose founder is the target card's owner.
    Only if one of:
      Their development is not empty.
      Their operations is not empty.
    Only if they have at least the card's price plus the target card's poach fee in capital.
    Then:
      They pay the target card's poach fee.
      Move it to the strategy discard.
      The target card is poached.
      The placing phase starts with them.
  A player may raid with a card from their strategy hand to a card in another player's development team.
    Only if it is a Corporate Raider card.
    Only if the target card is not safe from poaching.
    Only if they have no card in their portfolio whose founder is the target card's owner.
    Only if one of:
      Their development is not empty.
      Their operations is not empty.
    Only if they have at least the card's price plus the target card's raid fee in capital.
    Then:
      They pay the card's price.
      They pay the target card's raid fee.
      Move it to the strategy discard.
      The target card is poached.
      The placing phase starts with them.
```

  - **The placing** (§16.A.1, §16.D.3, §11.C.2, ruling 19). After the `Phase: market sale` block add:

```text
Phase: placing
  Hint: Put the employee you poached on one of your projects, or on one of your products to join your ops team. They start with an Onboarding Token.
  A player may place a card from another player's development team to a card in their development or their operations.
    Only if it is poached.
    Then:
      It is not poached.
      It is not red mode.
      It is not qa mode.
      It is not blue mode.
      If the target card is not running, it goes to their development team, on the target card.
      If the target card is running and it is attaching, it goes to their ops team, on the target card.
      If the target card is running and it is not attaching, move it to their ops team.
      It is onboarding.
      Go back to the interrupted turn.
```

  - **6-2b's Round Start example.** In its title, `; an Event whose system comes later does nothing yet` becomes `; an Event changes only what it names, and Recruiter Frenzy no one's capital`. Its lines stay.
  - **Append these 8 examples.**

```text
Example: the poaching fee is twice the printed cost plus the Token Value, $2 for each XP, Pending XP and Skill token and each Attribute, and $4 for a Junior's Gold Badge but nothing for a Specialist's; a Corporate Raider pays half again, rounded up, and a Full Stack Ninja costs half again to anyone (section 16, ruling 6, ruling 24)
  Given 3 players
  And p1's development has a Dating App and a Neobank
  And the Dating App in p1's development has a Junior Software Dev, a Junior Hardware Eng and a Junior QA Tester on it
  And the Neobank in p1's development has the Hacker, the Engineer and the Architect on it
  And the Junior Software Dev in p1's development team has 1 blue xp
  And the Junior Software Dev in p1's development team is badged
  And the Junior Hardware Eng in p1's development team has 1 pending red
  And the Junior Hardware Eng in p1's development team has 1 blue skill
  And the Junior Hardware Eng in p1's development team has 1 green skill
  And the Junior QA Tester in p1's development team has 1 red skill
  And the attributes in play has a Workaholic, a Clean Coder, a Visionary, a Toxic Personality and a Burnout
  And the Engineer in p1's development team has 1 workaholic
  And p2's development has a To-Do List
  And the To-Do List in p2's development has a QA Engineer, the Veteran, a Full Stack Ninja and a Junior Software Dev on it
  And the QA Engineer in p2's development team has 1 training xp
  And the QA Engineer in p2's development team is badged
  And the Veteran in p2's development team has 1 clean coder
  And the Veteran in p2's development team has 1 visionary
  And the Veteran in p2's development team has 1 toxic personality
  And the Veteran in p2's development team has 1 burnout
  Then the Junior Software Dev in p1's development team has 16 poach fee
  And the Junior Hardware Eng in p1's development team has 16 poach fee
  And the Junior QA Tester in p1's development team has 8 poach fee
  And the Hacker in p1's development team has 12 poach fee
  And the Engineer in p1's development team has 16 poach fee
  And the Architect in p1's development team has 14 poach fee
  And the Architect in p1's development team has 11 raid fee
  And the QA Engineer in p2's development team has 12 poach fee
  And the Veteran in p2's development team has 28 poach fee
  And the Full Stack Ninja in p2's development team has 12 poach fee
  And the Full Stack Ninja in p2's development team has 12 raid fee
  And the Junior Software Dev in p2's development team has 4 poach fee

Example: the lowest multiplier applies, so a Flight Risk target costs its base once to either card; and the base is the printed cost, though Chip Shortage raises what Hardware talent costs to hire (section 16, section 20, ruling 6)
  Given the event in play has the Chip Shortage
  And p1's development has a Smart Lock
  And the Smart Lock in p1's development has the Diva and a Junior Hardware Eng on it
  And the attributes in play has a Flight Risk
  And the Diva in p1's development team has 1 flight risk
  Then the Diva in p1's development team has 7 poach fee
  And the Diva in p1's development team has 7 raid fee
  And the Junior Hardware Eng in p1's development team has 5 cost
  And the Junior Hardware Eng in p1's development team has 4 poach fee

Example: during Recruiter Frenzy every poach costs its base once, its Token Value still counted (section 20, section 16)
  Given the event in play has the Recruiter Frenzy
  And p1's development has a Dating App
  And the Dating App in p1's development has the Hacker and a Junior Software Dev on it
  And the Junior Software Dev in p1's development team has 1 blue xp
  Then the Hacker in p1's development team has 6 poach fee
  And the Hacker in p1's development team has 6 raid fee
  And the Junior Software Dev in p1's development team has 4 poach fee

Example: a Headhunter takes a rival's Development staff member for the fee, paid to the bank, and no action; the poacher puts it on one of their projects with an Onboarding Token, even under an Agile PM; the Hacker brings his Bug, Pending XP stays, a declared mode stays behind, a Junior PM's Pending Badge holds only on a Tier 2 or 3 project, and the project left without its Lead Stalls (section 16, section 11, section 20, ruling 15)
  Given the phase is actions
  And p0 has 40 capital
  And p0's strategy hand has a Headhunter, a Headhunter and a Headhunter
  And p0's development has a Neobank and a To-Do List
  And the Neobank in p0's development has the Senior PM on it
  And p1's development has a Streaming Service
  And the Streaming Service in p1's development has the Hacker, a Junior Hardware Eng and a Junior PM on it
  And the Junior Hardware Eng in p1's development team has 1 blue skill
  And the Junior Hardware Eng in p1's development team has 1 pending red
  And the Junior Hardware Eng in p1's development team is blue mode
  Then the Junior PM in p1's development team is pending badge
  When p0 headhunts with a Headhunter to the Hacker
  Then the phase is placing
  And it is p0's turn
  And p0 has 28 capital
  And p0 has 3 actions
  When p0 places the Hacker to the Neobank
  Then the phase is actions
  And the Neobank in p0's development has the Senior PM and the Hacker on it
  And the Hacker in p0's development team is onboarding
  And the Hacker in p0's development team is not poached
  And the Neobank in p0's development has 1 bug
  And the Streaming Service in p1's development is stalled
  When p0 headhunts with a Headhunter to the Junior Hardware Eng
  And p0 places the Junior Hardware Eng to the Neobank
  And p0 headhunts with the Headhunter to the Junior PM
  And p0 places the Junior PM to the To-Do List
  Then p0 has 6 capital
  And the Junior Hardware Eng in p0's development team has 1 pending red
  And the Junior Hardware Eng in p0's development team is not blue mode
  And the Junior Hardware Eng in p0's development team is onboarding
  And the Junior PM in p0's development team is not pending badge
  And the strategy discard has a Headhunter, a Headhunter and a Headhunter

Example: a poacher who runs a product may put the employee in their ops team instead: a Sales Rep attaches to the product they name, anyone else joins the pool, and a declared mode stays behind (section 16, section 3, section 11, ruling 19)
  Given the phase is actions
  And p0 has 40 capital
  And p0's strategy hand has a Headhunter, a Headhunter and a Headhunter
  And p0's operations has a Dating App
  And p1's development has a Smart Lock
  And the Smart Lock in p1's development has a Sales Rep, the Fixer and a Firmware Specialist on it
  And the Fixer in p1's development team is qa mode
  And the Firmware Specialist in p1's development team is red mode
  When p0 headhunts with a Headhunter to the Sales Rep
  And p0 places the Sales Rep to the Dating App
  And p0 headhunts with a Headhunter to the Fixer
  And p0 places the Fixer to the Dating App
  And p0 headhunts with the Headhunter to the Firmware Specialist
  And p0 places the Firmware Specialist to the Dating App
  Then the phase is actions
  And p0 has 6 capital
  And p0's ops team has a Sales Rep, the Fixer and a Firmware Specialist
  And the Dating App in p0's operations has a Sales Rep on it
  And the Fixer in p0's ops team is not qa mode
  And the Fixer in p0's ops team is onboarding
  And the Firmware Specialist in p0's ops team is not red mode

Example: a Headhunter can't take anyone from a team with an HR Manager, the HR Manager included, which a Corporate Raider ignores for its $2 and half again the base; and an Investor can't poach their Founder with either card (section 16, section 17, section 20, ruling 15)
  Given 3 players
  And the phase is actions
  And p0 has 20 capital
  And p0's strategy hand has a Headhunter and a Corporate Raider
  And p0's development has a To-Do List
  And p0's portfolio has an Equity whose founder is p2
  And p1's development has a Dating App
  And the Dating App in p1's development has an HR Manager and a Junior Software Dev on it
  And p2's development has a Smart Lock
  And the Smart Lock in p2's development has a Junior Hardware Eng on it
  When p0 headhunts with the Headhunter to the Junior Software Dev
  Then it is rejected because "the target card is not hr shielded"
  When p0 headhunts with the Headhunter to the HR Manager
  Then it is rejected because "the target card is not hr shielded"
  When p0 headhunts with the Headhunter to the Junior Hardware Eng
  Then it is rejected because "they have no card in their portfolio whose founder is the target card's owner"
  When p0 raids with the Corporate Raider to the Junior Hardware Eng
  Then it is rejected because "they have no card in their portfolio whose founder is the target card's owner"
  When p0 raids with the Corporate Raider to the Junior Software Dev
  Then the phase is placing
  And p0 has 15 capital
  When p0 places the Junior Software Dev to the To-Do List
  Then the phase is actions
  And the To-Do List in p0's development has a Junior Software Dev on it
  And the Dating App in p1's development has an HR Manager on it
  And the strategy discard has a Corporate Raider

Example: during Headhunter Holiday no one can poach, with either card (section 20, section 16)
  Given the phase is actions
  And the event in play has the Headhunter Holiday
  And p0's strategy hand has a Headhunter and a Corporate Raider
  And p0's development has a To-Do List
  And p1's development has a Dating App
  And the Dating App in p1's development has a Junior Software Dev on it
  When p0 headhunts with the Headhunter to the Junior Software Dev
  Then it is rejected because "the target card is not safe from poaching"
  When p0 raids with the Corporate Raider to the Junior Software Dev
  Then it is rejected because "the target card is not safe from poaching"
  And p0 has 7 capital
  And p0's strategy hand has a Headhunter and a Corporate Raider

Example: a poach needs somewhere on the Board to put the employee, the right card, and the card's price and the fee in hand, else nothing is paid (section 16, section 20, ruling 15)
  Given the phase is actions
  And p0 has 10 capital
  And p0's strategy hand has a Headhunter, a Corporate Raider and a Hit Piece
  And p1's development has a Dating App
  And the Dating App in p1's development has the Hacker on it
  When p0 headhunts with the Headhunter to the Hacker
  Then it is rejected because "their development is not empty or their operations is not empty"
  When p0 raids with the Corporate Raider to the Hacker
  Then it is rejected because "their development is not empty or their operations is not empty"
  Given p0's operations has a To-Do List
  When p0 headhunts with the Headhunter to the Hacker
  Then it is rejected because "they have at least the card's price plus the target card's poach fee in capital"
  When p0 raids with the Corporate Raider to the Hacker
  Then it is rejected because "they have at least the card's price plus the target card's raid fee in capital"
  When p0 headhunts with the Hit Piece to the Hacker
  Then it is rejected because "it is a Headhunter card"
  When p0 raids with the Hit Piece to the Hacker
  Then it is rejected because "it is a Corporate Raider card"
  And p0 has 10 capital
  And p0's strategy hand has a Headhunter, a Corporate Raider and a Hit Piece
```

  **How the numbers come** (§11.E–G, §16, §17.B.2, §20.A–B, §20.D 9, 13, 15, rulings 6, 15, 24):
  - **The fee:** (printed cost + Token Value) × multiplier, to the bank (§16.B). Token Value is +$2 per XP, Skill, Pending XP token and Attribute, and +$4 for a Gold Badge on a University Junior; nothing for a Specialist's or the Junior PM's Badge (§16.B.2, ruling 24).
    - The multiplier is ×2; ×1.5 for the Corporate Raider or a Full Stack Ninja; ×1 for Flight Risk or Recruiter Frenzy; the lowest applies; ×1.5 rounds up (§16.B.3, ruling 24).
    - The rows of §16.C: Raw Junior $4; Trained Junior (1 Skill) $8; Super Junior (1 XP + Badge) $16; Standard Senior $12; Buffed Senior (1 Attribute) $16 — the Hacker and the Engineer cost $6 (§20.B).
    - Example 1's other cards:
      - the Junior Hardware Eng: (2 + 2 + 2 + 2) × 2 = 16;
      - the Architect ($7): ×2 = 14 and ×1.5 = 10.5, rounded up to 11 (§16.B.3's own example);
      - the QA Engineer ($4, 1 Training XP): (4 + 2) × 2 = 12, its Badge adding nothing;
      - the Veteran ($6, four Attributes): 14 × 2 = 28;
      - the Ninja ($8): ×1.5 = 12 to either card.
  - **Example 2:** the Diva ($5) with Flight Risk is (5 + 2) × 1 = 7, to either card.
    - Chip Shortage makes Hardware talent cost $3 more to hire (§20.D 9, 6-2b): the Junior Hardware Eng's cost reads 5.
    - Its fee reads the printed $2 (§16.B.1): 2 × 2 = 4.
  - **Example 3:** Recruiter Frenzy, ×1 (§20.D 13): the Hacker 6, the Junior 2 + 2 = 4.
  - **Example 4.**
    - The Hacker $12, the Junior Hardware Eng (2 + 2 + 2) × 2 = 12 and the Junior PM ($5) × 2 = 10: 40 − 34 = 6.
    - The Onboarding Token (§16.D.3), the Hacker's Bug on joining a project (§16.D.3 "Entry effects", §20.B), Pending XP staying (§11.B.2) and a Lead's project Stalling (§16.D.3).
    - The Pending Badge holds only on a Tier 2/3 project (§16.D.3, §11.E.2).
    - The declared mode stays behind (§11.C.2's mid-turn arrivals work in their native colour).
  - **Example 5:** the Sales Rep $8, the Fixer $14, the Firmware Specialist $12 (§20.B): 40 − 34 = 6. A Sales Rep attaches to a product the poacher names; others join the pool (§16.A.1, ruling 19).
  - **Example 6:** an HR Manager shields its team (§16.A.2, §20.B Gatekeeper); the Corporate Raider ignores it, for its $2 and ×1.5: 2 + 3 = 5, and 20 − 5 = 15. An Investor can't poach their Founder (§16.A.2, §17.B.2).
  - **Example 7:** Headhunter Holiday suspends poaching (§20.D 15).
  - **Example 8:**
    - Never to the Bench; a Development project, or the Ops Zone when the poacher runs a product (§16.A.1).
    - The Hacker is $12 to a Headhunter and 2 + 9 = $11 to a Raider, against $10.
    - Only a Headhunter or a Corporate Raider poaches (§16).
  - **Lines each example pins:**
    - 1: every `Token value:` line but flight risk; `Badged junior:`; the three class lines and the last line of `Poach base:`; `Cheaper to poach:`; the first two `Poach fee:` lines and the first `Raid fee:` line;
    - 2: the flight risk Token line; `Cheapest to poach:`'s Flight Risk line; the cheapest fee lines; the Chip Shortage poach base line;
    - 3: `Cheapest to poach:`'s Recruiter Frenzy line;
    - 4: the headhunt's four `Then:` lines, and the placing button's guard, `not poached`, `not blue mode`, its project line, `onboarding` and `Go back …`;
    - 5: the placing's `not qa mode`, `not red mode` and both product lines;
    - 6: `Gatekeeping:`, `HR covered:`, `HR shielded:`, the headhunt's HR guard and both Immunity guards, and the raid's price, fee and move lines;
    - 7: `Safe from poaching:` and both buttons' guards against it;
    - 8: both buttons' card, destination and capital guards.
    - Task 1's test pins the target zone.
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`, then the removal probe.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's Headhunter and Corporate Raider poach a rival's Development staff for twice or half again the printed cost and Token Value, past every defense but the HR Manager for the Raider, onto the poacher's project or ops team with an Onboarding Token

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 2: The counter-offer: Vest and Cease & Desist, and the Vest token destroyed

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count); `tableaux.test.ts` and `playtest-fitted.test.tsx` where they pin the per-player rows, the fitted table or the phase list

**Interfaces:**
- Consumes: Task 1; 8-1 Tasks 6–7; 5-1's `When a player's …:` frame; 8-2a's `acquire …` and `buy …`.
- Produces (rules):
  - the zone `locked equity`; the flag `raided`; the count `vest`;
  - worked `fee paid` and `holding equity`; player values `locked tokens`, `locks`;
  - the counter-offer ask in both poach buttons;
  - `Phase: counter-offer` with three buttons;
  - the strip and destruction rules in `In every phase:`;
  - the Vest strip in both buying buttons.
- Produces (test file):

```ts
const VEST = 'vest a card from their equity to a card in their development team';
const BLOCK = 'block the poach with a card from their strategy hand to a card in their development team';
const LET_POACH_GO = 'let the poach go ahead';
/** The cards in `seat`'s locked equity. */
const lockedOf = (state: GameState, seat: PlayerId): CardState[];
/** The vest and cto marks on the cards of `seat`'s bench, development team and ops team, summed (R1). */
const marksOf = (state: GameState, seat: PlayerId): number;
```

- [ ] **Step 1: Change the tests.**
  - **Pins.**
    - `results` is N₁₁ + 15; the designer page's count too.
    - `PHASES` gains `'counter-offer'` after `'placing'`. `ANSWERS` gains `VEST`, `BLOCK`, `LET_POACH_GO`. `playGame`'s skipped set adds moves whose `before.turn.phase` is `counter-offer`.
    - The values test adds `fee paid` (number) and `holding equity` (flag). `playerValues` gains `'locked tokens', 'locks'`.
    - `'lays out the table …'`: after `['portfolio', true, 'row', 'public']` add `['locked-equity', true, 'row', 'public']`.
  - **Money (judged moves).**
    - A `HEADHUNT` or `RAID` press pays as in Task 1, whether or not it opens an ask.
    - A `VEST` or `BLOCK`: the ask's `by` gains the target's `fee paid`, read in `before`.
    - `LET_POACH_GO` changes no capital.
  - **Invariants (R1, R4, the anti-goals):**
    - **The window (R4).** A `HEADHUNT` or `RAID` opens an ask exactly when the target's owner's equity or strategy hand held a card in `after`; it asks that owner alone.
    - **The flags.** `poached` sits only while the phase is `counter-offer` or `placing`; `raided` only on a `poached` card. 8-2a's ask invariant widens: `askOf(state)` is set only while the phase is `consent`, `market sale` or `counter-offer`.
    - **No double outcome.** No move both refunds a fee and moves a `poached` card to another seat (the spec's anti-goal).
    - **Locked equity.** For each seat F:
      - every card in `locked-equity-F` names F as `founder`;
      - their number equals `marksOf(state, F)`;
      - `vest` is 0 or 1 on every card, and sits only on cards in a bench, development team or ops team.
    - **Equity conservation.** 7-2a's invariant becomes: exactly `EQUITY_TOKENS` cards name F, each in `equity-F`, in `portfolio-S` for some S ≠ F, in `locked-equity-F`, or in the box; one in the box never leaves it. Delete 7-2a's line "`equity-F` is never empty" (§17.D: Vest may take the last token).
    - **The box.** 1b's pool invariant ("nothing else ever goes there") also lets an Equity token into the box.
    - **How a mark falls.** A card's `vest` rises only in a `VEST`, by 1, on its target. It falls only:
      - as the card moves to the open job market;
      - or in an `AGREE` or `BUY` of the product it sits on.

      Never in a Pivot, a Recall or a Fire Sale.
  - **The auto-player.**
    - **In `counter-offer`,** the current seat:
      - blocks with a Cease & Desist when it holds one and `t % 3 !== 2`;
      - else vests with the first card of its equity when it has one and `t % 5 === 1`;
      - else lets the poach go ahead.
    - **`isPlayable`** counts a Cease & Desist as playable (kept for a poach).
    - **Steering (P14):** `poaching()` tries a target that is `vest`ed before others; `pivotDiva()` and the dismiss cadence prefer a card with a `vest`.
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Change the rules text.**
  - **Table** (R1). After `  Each player has a portfolio row that everyone can see, where some cards are on other players' cards.` add `  Each player has a locked equity row that everyone can see.`
  - **Cards.**
    - After `  Cards can be poached.` add `  Cards can be raided.`
    - Right before `  Cards can host cards by their tag:` add `  Cards can have vest.`
  - **The Vest defends** (§16.A.2). `Safe from poaching:` becomes:

```text
Safe from poaching:
  Only if one of:
    The event in play has the Headhunter Holiday.
    Its vest is more than 0.
```

  - **The refund** (§16.D.2, ruling 24). Right after the `Raid fee:` section add:

```text
Fee paid:
  A poached card's fee paid is its poach fee.
  A raided card's fee paid is its raid fee.
```

  - **The poach buttons** (§16.D.2, R4).
    - In `raid with …`, right after `      The target card is poached.` add `      The target card is raided.`
    - In both `headhunt with …` and `raid with …`, right before `      The placing phase starts with them.` add:

```text
      The target card's owner has the counter-offer.
        Only if one of:
          Their equity is not empty.
          Their strategy hand is not empty.
```

  - **The placing.** Right after `      It is not poached.` add `      It is not raided.`
  - **The counter-offer** (§16.D.2, §20.A Cease & Desist, ruling 24). After the `Phase: placing` block add:

```text
Phase: counter-offer
  Players take turns.
  Hint: A rival is poaching one of your staff and has paid the fee. Vest them with one of your Equity tokens, or block it with a Cease & Desist, and the rival gets the fee back; or let them go.
  A player may vest a card from their equity to a card in their development team.
    Only if the target card is poached.
    Then:
      The player acting gets the target card's fee paid.
      Move it to their locked equity.
      The target card gains 1 vest.
      The target card is not poached.
      The target card is not raided.
      The action does not go ahead.
  A player may block the poach with a card from their strategy hand to a card in their development team.
    Only if it is a Cease & Desist card.
    Only if the target card is poached.
    Then:
      The player acting gets the target card's fee paid.
      Move it to the strategy discard.
      The target card is not poached.
      The target card is not raided.
      The action does not go ahead.
  A player may let the poach go ahead.
    Then:
      The action goes ahead.
```

  - **The locked tokens** (R1, §11.G.2, §16.D.2, §18.B, §15.A.3, ruling 16). Right after the `Crisis spent:` section add:

```text
Locked tokens:
  A player's locked tokens is the number of the cards in their locked equity.

Locks:
  A player's locks is the total vest of the cards in their bench, their development team and their ops team.
```

  - Right after the `Fee paid:` section add:

```text
Holding equity:
  Only if its vest is more than 0.
```

  - **Destruction.** At the end of `In every phase:` add:

```text
  When a card in the open job market is holding equity:
    It loses its vest.
  When a player's locked tokens is more than their locks:
    Move the top card of their locked equity to the box.
```

  - **A sale** (R1, §16.D.2 "can't be sold or moved"). In `acquire …` and in the market sale's `buy …`, right before `      They pay its sale price to its owner.` add `      For each card on it, it loses its vest.`
  - **6-2a's Cease & Desist examples.**
    - `Example: only a Debuff goes on a rival's staff, and a Cease & Desist waits in the hand for slice 8's poaching (section 20, the spec's call)` becomes `Example: only a Debuff goes on a rival's staff, and a Cease & Desist goes on no one: it only blocks a poach (section 20, section 16)`.
    - `…, and a Cease & Desist waits in the hand for slice 8 (section 20, the spec's call)` in "each Utility card plays only as itself" becomes `…, and a Cease & Desist only blocks a poach (section 20, section 16)`.
    - Their lines stay.
  - **Append these 7 examples.**

```text
Example: the victim may Vest the employee with one of their own Equity tokens, even the last: the poach is cancelled, the poacher gets the fee back but not the Corporate Raider's price, and the Vested employee can't be poached again (section 16, section 17, ruling 15, ruling 24)
  Given the phase is actions
  And p0 has 20 capital
  And p0's strategy hand has a Corporate Raider and a Headhunter
  And p0's development has a To-Do List
  And p1's equity has an Equity whose founder is p1
  And p1's development has a Dating App
  And the Dating App in p1's development has the Architect on it
  When p0 raids with the Corporate Raider to the Architect
  Then the phase is counter-offer
  And it is p1's turn
  And p0 has 7 capital
  When p1 vests the Equity whose founder is p1 to the Architect
  Then the phase is actions
  And it is p0's turn
  And p0 has 18 capital
  And the Architect in p1's development team has 1 vest
  And the Architect in p1's development team is not poached
  And the Architect in p1's development team is not raided
  And p1's locked equity has an Equity whose founder is p1
  And p1's equity is empty
  When p0 headhunts with the Headhunter to the Architect
  Then it is rejected because "the target card is not safe from poaching"

Example: the victim may block the poach with a Cease & Desist instead: it is cancelled, the card goes to the strategy discard, and the poacher gets back the fee, not a Corporate Raider's price (section 16, section 20, ruling 24)
  Given the phase is actions
  And p0 has 20 capital
  And p0's strategy hand has a Corporate Raider and a Headhunter
  And p0's development has a To-Do List
  And p1's strategy hand has a Cease & Desist, a Cease & Desist and a Hit Piece
  And p1's development has a Dating App
  And the Dating App in p1's development has a Junior Software Dev and a Junior QA Tester on it
  When p0 raids with the Corporate Raider to the Junior Software Dev
  Then the phase is counter-offer
  And it is p1's turn
  And p0 has 15 capital
  When p1 blocks the poach with the Hit Piece to the Junior Software Dev
  Then it is rejected because "it is a Cease & Desist card"
  When p1 blocks the poach with a Cease & Desist to the Junior QA Tester
  Then it is rejected because "the target card is poached"
  When p1 blocks the poach with a Cease & Desist to the Junior Software Dev
  Then the phase is actions
  And it is p0's turn
  And p0 has 18 capital
  And the Junior Software Dev in p1's development team is not poached
  And the Junior Software Dev in p1's development team is not raided
  When p0 headhunts with the Headhunter to the Junior QA Tester
  And p1 blocks the poach with the Cease & Desist to the Junior QA Tester
  Then p0 has 18 capital
  And p0's strategy hand is empty
  And p1's strategy hand has a Hit Piece
  And the Dating App in p1's development has a Junior Software Dev and a Junior QA Tester on it

Example: a victim with an Equity token in supply, or any card in their Strategy Hand, is asked before the employee goes and may let it go; one with neither is not asked, and the poacher places the employee at once (section 16, the slice's R4)
  Given 4 players
  And the phase is actions
  And p0 has 20 capital
  And p0's strategy hand has a Corporate Raider, a Headhunter and a Headhunter
  And p0's development has a To-Do List
  And p1's equity has an Equity whose founder is p1
  And p1's development has a Dating App
  And the Dating App in p1's development has a Junior Software Dev on it
  And p2's strategy hand has a Hit Piece
  And p2's development has a Smart Lock
  And the Smart Lock in p2's development has a Junior Hardware Eng on it
  And p3's development has a Health Tracker
  And the Health Tracker in p3's development has a Junior QA Tester on it
  When p0 raids with the Corporate Raider to the Junior Software Dev
  Then the phase is counter-offer
  And it is p1's turn
  When p1 lets the poach go ahead
  Then the phase is placing
  And it is p0's turn
  When p0 places the Junior Software Dev to the To-Do List
  Then the Junior Software Dev in p0's development team is not raided
  When p0 headhunts with a Headhunter to the Junior Hardware Eng
  Then the phase is counter-offer
  And it is p2's turn
  When p2 lets the poach go ahead
  And p0 places the Junior Hardware Eng to the To-Do List
  And p0 headhunts with the Headhunter to the Junior QA Tester
  Then the phase is placing
  And it is p0's turn
  When p0 places the Junior QA Tester to the To-Do List
  Then the phase is actions
  And p0 has 7 capital
  And the To-Do List in p0's development has a Junior Software Dev, a Junior Hardware Eng and a Junior QA Tester on it
  And p1's equity has an Equity whose founder is p1

Example: a Vested employee who is dismissed, fired by a Pivot as the Diva is, or laid off from the bench destroys the player's token on them, and goes to the open job market without the mark; one the Pivot sends to the bench keeps it until then (section 18, section 16, section 15, ruling 9, ruling 16, the slice's R1)
  Given the phase is actions
  And p0's development has a Dating App and a Smart Lock
  And the Dating App in p0's development has the Architect on it
  And the Smart Lock in p0's development has the Diva and a Junior Hardware Eng on it
  And the Architect in p0's development team has 1 vest
  And the Diva in p0's development team has 1 vest
  And the Junior Hardware Eng in p0's development team has 1 vest
  And p0's locked equity has an Equity whose founder is p0, an Equity whose founder is p0 and an Equity whose founder is p0
  Then p0's locks is 3
  And p0's locked tokens is 3
  When p0 dismisses the Architect
  Then the Architect in the open job market has 0 vest
  And p0's locked tokens is 2
  And the box has an Equity whose founder is p0
  When p0 pivots the Smart Lock
  Then the Diva in the open job market has 0 vest
  And the Junior Hardware Eng in p0's bench has 1 vest
  And p0's locked tokens is 1
  When p0 lays off the Junior Hardware Eng
  Then the phase is sourcing
  And the Junior Hardware Eng in the open job market has 0 vest
  And p0's locked equity is empty

Example: a Vested employee discarded from an overfull bench, or let go unpaid at Income, destroys its token too (section 5, section 18, section 15, ruling 16)
  Given the phase is bench cleanup
  And p0's bench has a Junior Software Dev, a QA Engineer, a QA Engineer, a QA Engineer, a Sales Rep and a Sales Rep
  And the Junior Software Dev in p0's bench has 1 vest
  And p0's locked equity has an Equity whose founder is p0
  And p1 has 1 capital
  And p1's development has a Dating App
  And the Dating App in p1's development has the Hacker on it
  And the Hacker in p1's development team has 1 vest
  And p1's locked equity has an Equity whose founder is p1
  When p0 discards the Junior Software Dev
  Then the Junior Software Dev in the open job market has 0 vest
  And p0's locked equity is empty
  And it is p1's turn
  And the phase is income
  When p1 lets go of the Hacker
  Then the phase is actions
  And the Hacker in the open job market has 0 vest
  And p1's locked equity is empty
  And the box has an Equity whose founder is p0 and an Equity whose founder is p1

Example: a Vested employee who leaves with a product the owner sold destroys the seller's token and arrives without the mark; a Fire Sale sends them to the seller's bench, token and all (section 16, section 7, the slice's R1)
  Given the phase is actions
  And p0 has 20 capital
  And p0's operations has a To-Do List and a Smart Lock
  And p0's ops team has a Junior Software Dev, a Junior Software Dev and a Junior Hardware Eng
  And the Smart Lock in p0's operations has a Growth Hacker on it
  And the Growth Hacker in p0's ops team has 1 vest
  And p0's locked equity has an Equity whose founder is p0
  And p1's operations has a Dating App
  And the Dating App in p1's operations has a Sales Rep on it
  And the Sales Rep in p1's ops team has 1 vest
  And p1's locked equity has an Equity whose founder is p1
  When p0 acquires the Dating App
  And p1 agrees to the sale
  Then the Dating App in p0's operations has a Sales Rep on it
  And the Sales Rep in p0's ops team has 0 vest
  And p1's locked equity is empty
  And the box has an Equity whose founder is p1
  And p0 has 9 capital
  When p0 divests the Smart Lock
  Then the phase is actions
  And p0's bench has a Growth Hacker
  And the Growth Hacker in p0's bench has 1 vest
  And p0's locked equity has an Equity whose founder is p0
  And p0 has 14 capital

Example: the same when a rival buys the product at a Market Sale: the seller's token on the Vested Sales Rep leaves the game (section 16, section 7, the slice's R1)
  Given the phase is actions
  And p0's operations has a Dating App
  And the Dating App in p0's operations has a Sales Rep on it
  And the Sales Rep in p0's ops team has 1 vest
  And p0's locked equity has an Equity whose founder is p0
  And p1 has 20 capital
  And p1's ops team has a Junior Software Dev
  When p0 divests the Dating App
  Then the phase is market sale
  And it is p1's turn
  When p1 buys the Dating App
  Then the Dating App in p1's operations has a Sales Rep on it
  And the Sales Rep in p1's ops team has 0 vest
  And p0's locked equity is empty
  And the box has an Equity whose founder is p0
  And p0 has 18 capital
  And p1 has 9 capital
```

  **How the numbers come** (§5 Phase B, §6 Pivot, §7, §13.B, §15.A.3, §16, §18.B, §20.A, rulings 9, 15, 16, 24, R1, R4):
  - **The counter-offer:** after the payment, the victim may Vest the employee with one of their own Equity tokens (§16.D.2), even their last (§17.D), or cancel with Cease & Desist (§20.A). Either way the poacher takes the fee back, not the card's price (§16.D.2, ruling 24).
    - Example 1: the Architect raided is 2 + 11 = $13, so 20 − 13 = 7, and 7 + 11 = 18.
    - Example 2: the Junior raided is 2 + 3, so 20 − 5 = 15 and back to 18. The Junior QA Tester headhunted is $4, gone and back.
  - **R4:** the window opens on an Equity token in supply or any Strategy card in hand, so p2's Hit Piece opens it though p2 can only let the poach go. Example 3's fees: 5 + 4 + 4 = 13, and 20 − 13 = 7.
  - **Destroyed:**
    - your own Equity on an employee is destroyed when it is fired or dismissed (§18.B), left unpaid (§5 Phase B), discarded from the Bench, a Layoff's discard included (§15.A.3, §13.B), or fired by a Pivot as the Diva is (ruling 9);
    - a Pivot that benches staff keeps their tokens (§6 Pivot, R1).
  - **Sales (R1):** a Vested Specialist that leaves with a product in an Acquisition or Market Sale destroys the seller's token; a Fire Sale returns it to the seller's Bench and keeps it.
    - Example 6 (the spec's "a Vested Sales Rep leaves with an Acquired product"): the Dating App with its Sales Rep is $11 (§7), so 20 − 11 = 9.
    - The Smart Lock with its Growth Hacker is $11, Fire Sale $5 (p1 has no Red room): 9 + 5 = 14.
    - Example 7: $11, so 7 + 11 = 18 and 20 − 11 = 9.
  - **Lines each example pins:**
    - 1: the ask and its Equity alternative, the vest button's lines, `Fee paid:`'s raided line, the raid's raided line, `Safe from poaching:`'s Vest line, the locked equity row;
    - 2: the ask's Strategy Hand alternative, the block button's lines, `Fee paid:`'s poached line;
    - 3: `let the poach go ahead`, and the placing's `not raided`;
    - 4: `Locks:`, `Locked tokens:`, `Holding equity:`, the strip rule and the destruction rule;
    - 6: `acquire …`'s Vest strip;
    - 7: `buy …`'s Vest strip.
    - Example 5 is a guard of the bench discard and Income routes.
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`, then the removal probe.
  - 8-1's checks give no diagnostic on the counter-offer phase or its ask, which reads a zone's size only for the hidden hand.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx README.md
# and each other designer test file this task re-pinned, by path
git commit -F - <<'EOF'
feat(games): Startup Simulator's poach victims may Vest the employee with an Equity token or block with a Cease & Desist, refunding the fee, asked only on public facts, and a Vest token leaves the game when its employee is fired, discarded or sold with a product

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 3: The CTO, and its token destroyed likewise

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `README.md` (count)
- Test pins: `src/pages/designer/designer-page.test.tsx` (count); `playtest-fitted.test.tsx` only where it pins the actions phase's offered buttons

**Interfaces:**
- Consumes: Tasks 1–2; 5-2a's `badged`; 6-2a's `visionary`.
- Produces (rules): the count `cto`; the flag `lead material`; the buttons `promote a card in their development team` and `promote a card in their ops team`; the CTO lines in `Safe from poaching:`, `Locks:`, `Holding equity:` and both buying buttons.
- Produces (test file): `const PROMOTE: Record<string, string> = { 'development team': 'promote a card in their development team', 'ops team': 'promote a card in their ops team' };`

- [ ] **Step 1: Change the tests.**
  - **Pins.** `results` is N₁₁ + 20; the designer page's count too. The values test adds `lead material` (flag).
  - **Money.** A `PROMOTE` press pays 5 to the bank.
  - **Invariants (the spec's Proof 2):**
    - at most one card of each seat's bench, development team and ops team has `cto` above 0, and `cto` is 0 or 1 on every card;
    - a card with `cto` is `lead material`;
    - a card's `cto` rises only in a `PROMOTE` of it, which also moves one card from the mover's equity to its locked equity, and falls only as Task 2 says of `vest`.
    - Task 2's locked-equity count reads `marksOf`, which now sums `cto` too.
  - **The auto-player.**
    - **`promoting()`** goes in the planned list for actions after the first, right before `investing()`. When `(t + a) % 10 === 4` and the seat has $7 or more, it promotes its first card that is `lead material`: in its development team when `t % 2 === 0`, else in its ops team, falling back to the other.
    - **Steering (P14):**
      - once a seat has a CTO, `promoting()` still tries one more press on that `t`, so the one-per-player refusal is tallied;
      - `poaching()` tries a CTO target first.
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Change the rules text.**
  - **Cards.** `  Cards can have vest.` becomes `  Cards can have vest and cto.`
  - **Tier 2 units** (§11.G.1; suwa's `tier3_eligible`). Right after the `Holding equity:` section add:

```text
Lead material:
  Only if one of:
    It is a Senior Developer card.
    It is badged junior.
    Its visionary is more than 0.
```

  - **The CTO defends** (§11.G.2 Effect A, §16.A.2). In `Safe from poaching:`, after `    Its vest is more than 0.` add `    Its cto is more than 0.`
  - **Its token** (§11.G.2 Risk, ruling 16).
    - At the end of `Locks:` add `  A player's locks goes up by the total cto of the cards in their bench, their development team and their ops team.`
    - `Holding equity:` becomes:

```text
Holding equity:
  Only if one of:
    Its vest is more than 0.
    Its cto is more than 0.
```

    - In the strip rule `  When a card in the open job market is holding equity:`, after `    It loses its vest.` add `    It loses its cto.`
    - In `acquire …` and in `buy …`, right after `      For each card on it, it loses its vest.` add `      For each card on it, it loses its cto.`
  - **Promote to CTO** (§11.G.2). In `Phase: actions`, right before `  A player may end their actions.` add:

```text
  A player may promote a card in their development team.
    It costs 1 action.
    Only if it is lead material.
    Only if they have no card in their bench, their development team and their ops team whose cto is more than 0.
    Only if their equity is not empty.
    Only if they have at least 5 capital.
    Then:
      They pay 5.
      Move the top card of their equity to their locked equity.
      It gains 1 cto.
  A player may promote a card in their ops team.
    It costs 1 action.
    Only if it is lead material.
    Only if they have no card in their bench, their development team and their ops team whose cto is more than 0.
    Only if their equity is not empty.
    Only if they have at least 5 capital.
    Then:
      They pay 5.
      Move the top card of their equity to their locked equity.
      It gains 1 cto.
```

  - **Append these 5 examples.**

```text
Example: promoting a Tier 2 unit to CTO costs an action, $5 to the bank and one of the player's own Equity tokens from their supply, even the last, which is locked on it; a Junior without a Badge is no Tier 2 unit, and a player has one CTO at most (section 11, section 17, ruling 16)
  Given the phase is actions
  And p0 has 4 capital
  And p0's development has a Dating App
  And the Dating App in p0's development has a Junior Software Dev, a Junior Hardware Eng, a Junior QA Tester and the Architect on it
  And the Junior Hardware Eng in p0's development team is badged
  And the attributes in play has a Visionary
  And the Junior QA Tester in p0's development team has 1 visionary
  Then the Junior Hardware Eng in p0's development team is lead material
  And the Junior QA Tester in p0's development team is lead material
  When p0 promotes the Junior Software Dev
  Then it is rejected because "it is lead material"
  When p0 promotes the Architect
  Then it is rejected because "their equity is not empty"
  Given p0's equity has an Equity whose founder is p0
  When p0 promotes the Architect
  Then it is rejected because "they have at least 5 capital"
  Given p0 has 5 capital
  When p0 promotes the Architect
  Then it is accepted
  And p0 has 0 capital
  And p0 has 2 actions
  And the Architect in p0's development team has 1 cto
  And p0's locked equity has an Equity whose founder is p0
  And p0's equity is empty
  When p0 promotes the Junior Hardware Eng
  Then it is rejected because "they have no card in their bench, their development team and their ops team whose cto is more than 0"

Example: a unit in the ops team may be promoted too; a CTO recalled to the bench is still the player's one CTO, and a rival can't poach a CTO (section 11, section 16, the slice's R1)
  Given the phase is actions
  And p0 has 4 capital
  And p0's operations has a Smart Lock
  And p0's ops team has the Engineer, the Fixer and a Junior Software Dev
  And p0's strategy hand has a Headhunter
  And p1's development has a Dating App
  And the Dating App in p1's development has the Hacker on it
  And the Hacker in p1's development team has 1 cto
  And p1's locked equity has an Equity whose founder is p1
  When p0 promotes the Junior Software Dev
  Then it is rejected because "it is lead material"
  When p0 promotes the Engineer
  Then it is rejected because "their equity is not empty"
  Given p0's equity has an Equity whose founder is p0 and an Equity whose founder is p0
  When p0 promotes the Engineer
  Then it is rejected because "they have at least 5 capital"
  Given p0 has 9 capital
  When p0 promotes the Engineer
  Then the Engineer in p0's ops team has 1 cto
  And p0 has 4 capital
  When p0 recalls the Engineer
  Then the Engineer in p0's bench has 1 cto
  And p0's locked equity has an Equity whose founder is p0
  Given p0 has 9 capital
  When p0 promotes the Fixer
  Then it is rejected because "they have no card in their bench, their development team and their ops team whose cto is more than 0"
  When p0 headhunts with the Headhunter to the Hacker
  Then it is rejected because "the target card is not safe from poaching"

Example: a player's own Equity on a CTO or a Vested employee scores nothing at the end (section 12, ruling 16)
  Given the crash pile has the Market Crash
  And it is p1's turn
  And p0's bench has the Architect and a Junior Software Dev
  And the Architect in p0's bench has 1 cto
  And the Junior Software Dev in p0's bench has 1 vest
  And p0's locked equity has an Equity whose founder is p0 and an Equity whose founder is p0
  When p1 ends their actions
  Then the game is over
  And p0 scores 1
  And p1 scores 1

Example: a CTO's token is destroyed like a Vest: when the CTO leaves with a product its owner sold, or is dismissed (section 11, section 18, section 16, the slice's R1)
  Given the phase is actions
  And p0 has 20 capital
  And p0's operations has a To-Do List
  And p0's ops team has the Engineer, a Junior Software Dev and a Junior Software Dev
  And the Engineer in p0's ops team has 1 cto
  And p0's locked equity has an Equity whose founder is p0
  And p1's operations has a Dating App
  And the attributes in play has a Visionary
  And the Dating App in p1's operations has a Growth Hacker on it
  And the Growth Hacker in p1's ops team has 1 visionary
  And the Growth Hacker in p1's ops team has 1 cto
  And p1's locked equity has an Equity whose founder is p1
  When p0 acquires the Dating App
  And p1 agrees to the sale
  Then the Growth Hacker in p0's ops team has 0 cto
  And p1's locked equity is empty
  When p0 dismisses the Engineer
  Then the Engineer in the open job market has 0 cto
  And p0's locked equity is empty
  And the box has an Equity whose founder is p1 and an Equity whose founder is p0

Example: the same when a CTO leaves with a product sold at a Market Sale (section 11, section 7, the slice's R1)
  Given the phase is actions
  And p0's operations has a Dating App
  And the attributes in play has a Visionary
  And the Dating App in p0's operations has a Sales Rep on it
  And the Sales Rep in p0's ops team has 1 visionary
  And the Sales Rep in p0's ops team has 1 cto
  And p0's locked equity has an Equity whose founder is p0
  And p1 has 20 capital
  And p1's ops team has a Junior Software Dev
  When p0 divests the Dating App
  And p1 buys the Dating App
  Then the Sales Rep in p1's ops team has 0 cto
  And p0's locked equity is empty
  And p0 has 18 capital
```

  **How the numbers come** (§7, §11.G, §12.4, §16.A.2, §18.B, §20.A–B, ruling 16, R1):
  - **Promote to CTO** (1 AP): pay $5 to the Bank and attach 1 Equity Token from your supply, even your last (§11.G.2, §17.D). At most 1 per player at a time, and "if your CTO leaves, you may promote another": one recalled to the Bench hasn't left.
    - It needs an existing Tier 2 unit on the Board: a Senior Developer, a Junior with a Gold Badge, or a unit with the Visionary Attribute (§11.G.1).
    - 5 − 5 = 0; 9 − 5 = 4.
  - **Effect A:** a CTO can't be poached (§11.G.2, §16.A.2).
  - **Risk:** firing it destroys the token (§11.G.2, §18.B), as does selling it with a product (R1). Example 4: the Dating App with its Growth Hacker is $11; p0's Blue room is 2 − 1 = 1.
  - **Scoring:** your own Equity Tokens, Vested or CTO ones included, score 0 VP (§12.4, ruling 16). p0's $7 is 1 point; the Architect and the 0-XP Junior hold no Human Capital.
  - **Lines each example pins:**
    - 1: the development team button's lines, and `Lead material:`'s three alternatives;
    - 2: the ops team button's lines and `Safe from poaching:`'s CTO line;
    - 4: `Locks:`'s CTO line, `Holding equity:`'s CTO line, the strip rule's CTO line, and `acquire …`'s CTO strip;
    - 5: `buy …`'s CTO strip.
    - 3 is ruling 16's guard.
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`, then the removal probe.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator promotes one Tier 2 unit per player to CTO for an action, $5 and an Equity token locked on it, which can't be poached and whose token leaves the game when it is fired or sold

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 4: Long runs: every slice-8b path tallied, whole games replayed; the README and the checks

**Files:**
- Modify: `src/games/startup-simulator.test.ts`, `README.md`

**Interfaces:**
- Consumes: every constant and policy above and in plans 4-2 to 8-2a; `poachFeeOf`, `lockedOf`, `marksOf`, `askOf`, `windowJudge`, `turnOf`, `enteredIncome`.
- **`happenings` gains these keys** (on judged moves, read through the runtime):
  - **Poaches:**
    - `a headhunt` and `a raid`, and `a raid past an HR Manager` for a `RAID` whose target was `hr shielded` in `before`;
    - from the `refused` callback, by the reason and the target in `before`:
      - `a poach refused: HR Manager`, `… Investor Immunity`, `… Headhunter Holiday`, `… Vest`, `… CTO`;
      - `a promotion refused: one CTO already`;
    - by the multiplier the fee read in `before`, for a `HEADHUNT` or `RAID`:
      - `a poach at ×2` and `a poach at ×1.5 by a Corporate Raider`;
      - `a poach at ×1.5 of a Full Stack Ninja` and `a poach at ×1 for Flight Risk`;
      - `a poach at ×1 in Recruiter Frenzy`;
      - `a poach of Hardware talent in Chip Shortage`, `a poach with Token Value`, `a poach with a Junior's Badge`.
  - **The counter-offer:**
    - `a counter-offer asked`, for a `HEADHUNT` or `RAID` that opened an ask, and `a poach with no counter-offer`, for one that didn't;
    - `a poach let go`, `a poach Vested`, `a poach Vested with the last token` (the victim's equity held 1 in `before`), `a poach blocked by a Cease & Desist`.
  - **The placing:**
    - `a poached card placed on a project`, `… in the ops pool`, `… on a product`;
    - `a Hacker's Bug from a poach`;
    - `a project Stalled by a poach`, for a project the target left that was not `stalled` in `before` and is in `after`;
    - `a poached Junior PM's Pending Badge lost` and `… kept`.
  - **The CTO:** `a CTO promoted in a development team`, `… in an ops team`, `a CTO promoted with the last token`.
  - **Tokens destroyed,** for each token the move put in the box, by the route:
    - `a token destroyed: dismissed`, `… let go at Income`, `… let go at a Regulation Audit`, `… bench discard`, `… layoff`, `… Diva fired by a Pivot`, `… sold with a product`;
    - `a mark kept on the bench`, for a `PIVOT`, `RECALL` or Fire Sale moving a card with `vest` or `cto` to a bench;
    - `a CTO's token destroyed`, for a destroyed token whose card had `cto` in `before`.
- **At each run's result** the long-run `it.each` also sums `tokens locked at the score`, every seat's locked equity, like `marketShare`.

- [ ] **Step 1: Write the tests.**
  - **`'made every move in those runs …'`** also expects `HEADHUNT`, `RAID`, `PLACE`, `VEST`, `BLOCK`, `LET_POACH_GO` and both `PROMOTE` buttons above 0.
  - **Append `it('played slice 8’s poaching and the CTO in those runs: headhunts and raids at every multiplier, past an HR Manager and refused by each defense, counter-offers asked or not and let go, Vested and blocked, poached staff placed on projects, pooled and attached, the Hacker’s Bug and a Stall, CTOs promoted in both teams, and tokens destroyed by every route and kept on the bench')`.** It expects every key above above 0, and the sum above 0.
  - **Append `it('takes back the last move and rebuilds whole games from their logs, through counter-offers, placings and promotions (Review Focus: 4 players, seeds 1 to 5)')`.**
    - Play each game to its result, keeping the state before each move.
    - A fresh engine given `loadLog(log)` equals the final state, and `engine.undo()` gives the state before the last move.
    - Across the five logs, some log holds a `VEST`, a `BLOCK`, a `PLACE` and a `PROMOTE` (count them through the watch).
    - For one move in a counter-offer, `engine.undo()` gives the state before it, its `waitingOf` equal to the stored one.
  - **The view check (Review Focus 5).**
    - For each move that opens a counter-offer, every seat's `seatExtras(…).waiting` has `by` the poacher.
    - Its `cards` are the Strategy card's name (it is in the public discard by then) and the target's name (in a development team everyone sees).
    - Its `JSON.stringify` holds no card id, and no name of a card in another seat's Strategy Hand.
  - **Kept as they are:** `'plays the same game through the page’s view as without it'` (now through counter-offers answered by other seats and placings) and every earlier tally.
- [ ] **Step 2: Run** `bunx vitest run src/games/startup-simulator.test.ts`.
  - If a required key stays at 0, print the tally and change the auto-player, never the rules. Ways to reach each key:
    - **×1 for Flight Risk:** `debuffing()` plays Flight Risk on a rival's Development staff, and `poaching()` prefers that target;
    - **Recruiter Frenzy and Chip Shortage:** poach whenever that Event is in play, a Hardware target in Chip Shortage;
    - **a Junior's Badge:** `training()` plays Leadership Masterclass on a Junior on a project;
    - **the Hacker's Bug and a Stall:** target a Senior lead on a rival's Tier 2/3 project;
    - **a Pending Badge lost and kept:** target a Junior PM on a Tier 2 project, and place it on a Tier 1 project at even `t`;
    - **destroyed by a sale:** assign a Sales Rep to a project so it can be Vested there, then launch and divest that product;
    - **a Regulation Audit let-go:** keep a Vested paid employee on the Board through the reveal;
    - **Vested with the last token:** vest when the victim's equity holds one card.
  - Report a key that stays unreachable, with the tally, and pin its path with an arranged test in the shape of 6-2b Task 5's.
- [ ] **Step 3: Write the README.**
  - **The Startup paragraph** becomes "**Startup Simulator (slice 8)**". After plan 8-2a's sentence, add:
    - a Headhunter or Corporate Raider poaches a rival's Development staff for twice, or half again, the printed cost and Token Value, unless an HR Manager, Investor Immunity, a Vest, a CTO or Headhunter Holiday stops it;
    - the victim may Vest the employee or play Cease & Desist, the poacher getting the fee back;
    - one Tier 2 unit per player may be promoted to CTO with an Equity token, which leaves the game when the CTO, or a Vested employee, is fired or sold.
    - Its rulings list adds 6, 15 and 16 where missing.
  - **"It still leaves out"** becomes: Stealth and audits, with Partners' Secured Access, the CTO's Audit Shield, Whistleblower Protection Act and Patent Trolls' other fees (slice 9); Bankruptcy and the Broken Chain, with Come Clean and Legacy Status (slice 10).
  - **Plan 8-1's README paragraph**'s Startup bullet (8-2a's) also names these lines:
    - `A cheaper to poach card's poach fee is 150% of its poach base, rounded up.`
    - `Only if they have at least the card's price plus the target card's poach fee in capital.` and `They pay the target card's poach fee.`
    - `The target card's owner has the counter-offer.` with `Their strategy hand is not empty.`
    - `The player acting gets the target card's fee paid.`
    - `When a player's locked tokens is more than their locks:`
- [ ] **Step 4: Run** `bun run test` and `bun run typecheck`. The passing count is the starting count plus this plan's new tests.
- [ ] **Step 5: Run the checks.** The first three print nothing. The fourth prints only the Startup count line in `designer-page.test.tsx` and any pin a task reported.

```bash
# no shared code and no page code changed
git diff --stat "$BASE" -- src/engine src/utils
git diff --stat "$BASE" -- src/pages ':!src/pages/designer/*.test.tsx' ':!src/pages/designer/*.test.ts'
# protected files
git diff --stat "$BASE" -- src/engine/core/game-state.ts src/engine/core/flow.ts src/engine/core/game-engine.ts src/pages/hearts-demo
# the page tests' changed lines
git diff "$BASE" -- src/pages/designer | grep -E '^[-+][^-+]'
```

  Also:
  - read every number in the new examples against each task's "How the numbers come";
  - check that no example arranges more than 3 Equity tokens naming one player;
  - run the removal probe once more over every line plans 8-2a and 8-2b added or changed.
- [ ] **Step 6: Run the games alone.** `bunx vitest run src/games/hearts.test.ts src/games/color-match.test.ts src/games/venom.test.ts src/games/rent-day.test.ts src/pages/hearts-demo` passes, and Rent Day still has 108 examples.
- [ ] **Step 7: Commit**

```bash
git add src/games/startup-simulator.test.ts README.md
git commit -F - <<'EOF'
feat(games): Startup Simulator's long runs poach, defend, place, promote and destroy Equity at 2 to 5 players, every path tallied and whole games rebuilt from their logs through counter-offers and placings

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

## Forward notes

- **Plan 8-3 (the page):**
  - Vest and CTO marks as badges on their employee, hidden with it on the bench (slice 9 R3: rivals see them on the Board);
  - each tableau's `locked equity` row;
  - the counter-offer prompt in the victim's strip, from `SeatExtras.waiting`;
  - the placing step's picker, its Hint naming both kinds of target;
  - the poach buttons' refusals in words, a fee shown before pressing (the fee is public: it reads only the target's public counts);
  - the browser check of a poach with each defense, a Vest, a Cease & Desist, a placing and a promotion.
- **Slice 9:**
  - the Audit Shield reads `its cto is more than 0` with `it is not onboarding` on a staff member of the project;
  - a Fold that fires the Diva destroys her token through Task 2's rule, with no new line;
  - rivals see `cto`/`vest` as counts on Board cards.
- **Slice 10:**
  - Bankruptcy's seizure moves only portfolio tokens, never locked ones;
  - Liquidation's sales strip the marks through 8-2a's buying lines as edited here.

## Gaps against plan 8-1

None that needs a new phrase: every line above is written with plans 4-1 to 8-1's phrases. These calls follow from what the language reads:
- **R1's "hooks into the firing strips tokens lines" can't be done as written.** 5-2a's strip rule runs on a card already in the open job market, where 8-1 Task 3's `its owner's locked equity` throws (a center zone has no owner).
  - So destruction is one rule about each player (5-1's `When a player's …:` frame in `In every phase:`), comparing `locked tokens` with the marks still on the player's bench and Board, plus a strip rule in the open job market.
  - It covers every route, slice 9's Fold included. A route that removed a mark any other way would be healed silently; the long-run invariant compares the two counts after every move to catch one.
- **The printed cost is read as `cost` less Chip Shortage's $3,** since 6-2b refines `cost` and no phrase reads a column's printed value past its section. The rulebook's 3 is written once more, beside 6-2b's two.
- **The destination is a second press** in `placing` (8-1's recorded limit: no button picks three cards); §16.A names it before the fee. The poach refuses a poacher with nowhere to put the employee, so the placing can't strand.
- **Two promote buttons:** a button picks its own card in one zone (5-1's several zones are for targets), so the CTO's lines are written twice.
- **Token Value lists each count:** 6-1's `goes up by {int} for each {attribute}` takes one count a line, and 5-2a's `skills` can't be named in it ("for each skill" also reads the `skill` column), so the three Skill counts are named one by one.
- **An example names a poach's target with "to the …"** (`When p0 headhunts with the Headhunter to the Hacker`), the wording for a card and its target card.
