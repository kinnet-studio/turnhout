# Pre-flight report: plan 7-2a (Startup Simulator slice 7, "Equity held")

Plan: `/home/user/turnhout/docs/superpowers/plans/2026-10-16-startup-slice-7-2a-rules-and-runs-equity-held.md`, 1243 lines. Line numbers below are the plan's.

Probe:
- Clone: `/tmp/claude-0/-home-user/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/pf72a/work`.
- BASE is `21ed452`: d3b054c plus 7-1's probe commits.
- Branch `probe72a`, HEAD `6740cc7`, clean.
- An optional time cut sits on branch `opt-cut` (`bdafc5c`).
- Logs are in `/tmp/claude-0/-home-user/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/pf72a/logs`.
- The real repo was not touched.

## Summary

**Blockers.** None in the plan's text. Every task builds and its rules match the rulebook. The timing is over budget (R29): it needs a ruling before 7-2b, which has no time left.

**Findings.** 29 in all: 27 fix-in-plan and 2 ruling-needed.
- R23: four earlier long-run keys fall under 2 games once the seats invest.
- R29: timing.

**Tests.**
- Full suite: 4002 at BASE, 4006 at the end (+4 new `it()`s: the Share Price test, the dividend test, the slice-7 tally test and the 4-player replay). All pass, typecheck clean.
- Startup file: 111 tests at BASE, 115 at the end.
- Startup examples: 307 at BASE, 331 at the end (+24, all named below). The task counts land at N₈+2, +6, +10, +14, +22 and +24.
- The other games alone: 100 tests pass, and Rent Day still has 108 examples.
- Checks 1–3 print nothing. Check 4 prints only:
  - the Startup count lines;
  - Task 1's page pins (R4);
  - Task 6's event-check pin (R17).

**Timing.** The vitest `tests` figure for `src/games/startup-simulator.test.ts`, best of 3, alternating, under `nice -n 19`:

| Run | BASE | End | Change | `opt-cut` |
|---|---|---|---|---|
| Set 1 | 20.66 s | 28.93 s | +8.3 s, ×1.40 | — |
| Set 2 | 21.78 s | 29.29 s | +7.5 s, ×1.34 | 27.14 s (+5.4 s, ×1.25) |

- The brief allows about 3 s.
- At the brief's ≈24 s BASE, the end projects to about 32–34 s, over the 30 s watch.
- The long runs alone are 41% slower than at BASE. The Global Constraints (l.125) say to report anything over a third.

## Results table

"S+D" is the Startup file plus `src/pages/designer` (17 files).

| Commit | What | Passing |
|---|---|---|
| BASE `21ed452` | full suite | 4002/4002 (122 files) |
| T1 `a886364` as written | Startup file | 96/111. Fails: the score example, the University stacks test, 13 arranged long-run tests (R1–R3). Before the page re-pins its Files line allows, 13 page tests also failed (R4). |
| A-T1 `5a42cbb` | S+D | 522/522 |
| T2 `1eeef10` as written | Startup file | 110/112. Fails: the guard test (R5) and the undo pin 52→53 (R6). |
| A-T2 `706a6f8` | S+D | 523/523 |
| T3 `a21d380` as written | S+D | 522/524. Fails: example "Operational Revenue counts bonuses…" (R8), and the designer test that loads the examples. |
| A-T3 `e268fb7` | S+D | 524/524 |
| T4 `49f3888` as written | S+D | 521/524. Fails: two refusal reasons (R9), the designer test, and the slice-3 tally (R10). |
| A-T4 `973ac8d` | S+D | 524/524 |
| T5 `9db53c5` as written | S+D | 514/524. Fails: 3 Startup shown-value pins and 6 playtest-fitted gauge tests (R11), and the reshuffle test (R15). |
| A-T5 `2416ad0`, A-T5b `e054c56` | S+D | 524/524 |
| T6 `08b919d` as written | S+D | 514/524. Fails: 4 long runs on the money check (R16), 4 tallies with them, the undo pin (R6), and playtest-fitted's event-check test (R17). |
| A-T6 `9ae7859` | full suite | 4004/4004 |
| T7 `184fbc1` as written | Startup file | 114/115. The new tally test fails with 7 keys at 0 (R21). |
| A-T5c `b1043ec` (made after T7) | — | The Toxic project check (R13), which only failed under the steer |
| A-T7 `d0bc981` | S+D | 526/526 |
| A-T7b `9b1f8ff` | full suite | 4006/4006, typecheck clean |
| A-T7c `605bde3`, A-T6b `6740cc7` | S+D | 526/526 |
| `opt-cut` `bdafc5c` (optional, R29) | Startup file | 114/114, typecheck clean |

## Findings

### R1 (fix-in-plan) — T1: the score example reads scores before the game is over

**Evidence.** As written, example 2 fails with "The game hasn't ended." 7-1's R17 hit the same thing.

**Amendment.**
- Replace l.259–262 with:
  ```
    Given 3 players
    And the crash pile has the Market Crash
    And it is p2's turn
    And p1's portfolio has an Equity whose founder is p0 and an Equity whose founder is p2
    And p0's equity has an Equity whose founder is p0
    When p2 ends their actions
    Then the game is over
    And p1 scores 11
  ```
  l.263–264 stay as they are.
- At the end of l.269, add: "p2, the round's last seat, ends their actions with the Market Crash in the crash pile, so the game ends and is scored (§12)."

### R2 (fix-in-plan) — T1: the Equity invariant fails every game arranged without Setup

**Evidence.** As written, the invariant fails 13 arranged long-run tests ("0 tokens name p0", "p0's equity is empty"). These tests have no Setup, so no Equity tokens exist.

**Amendment.**
- l.225 becomes: "exactly `EQUITY_TOKENS` cards in play name F as `founder`, or none in a game arranged without Setup (the arranged tests make no Equity), and no move changes how many; each is in `equity-F` or in `portfolio-S` for some S ≠ F;"
- l.227 becomes: "`equity-F` is never empty while some card names F (§17.D: nobody sells the last; slice 8's Vest and CTO will change this line)."
- The code as built:
  ```ts
  const named = after.cards.filter((c) => founderOf(c) === founder);
  const was = before.cards.filter((c) => founderOf(c) === founder).length;
  ...
  ...([EQUITY_TOKENS, 0].includes(named.length) && named.length === was ? [] : [`${was} then ${named.length} tokens name ${founder}`]),
  ...misplaced.map((c) => `${c.id} names ${founder} in ${c.zoneId}`),
  ...(named.length === 0 || zoneCards(after, zoneIdFor('equity', founder)).length > 0 ? [] : [`${founder}'s equity is empty`]),
  ```
  Its comment gains: "A game arranged without Setup, as the arranged tests below are, has none, as it has no Milestone out of the deck; no move changes how many."

### R3 (fix-in-plan) — T1: the University stacks test gains the Equity stack

**Evidence.** `'has the three University stacks, which never run out (§20.B.2)'` fails: the Equity stack is endless too.

**Amendment.** After l.219, add a pin bullet:

"`'has the three University stacks, which never run out (§20.B.2)'` expects `[...JUNIORS.map((name) => [name]), ['Equity']]`, with the comment `// And §17's Equity tokens, 3 made per player at Setup after the Juniors (§2, §4.4).`"

### R4 (fix-in-plan) — T1: the Files line leaves out the Board-text and Board-layout pins the two rows change

**Evidence.** The rows change pins that l.199 doesn't name:
- in `tableaux.test.ts`, 1 tableau line;
- in `playtest-fitted.test.tsx`, 2 tableau lines, 8 Board-text pins, the empty-Board pin and the Board-place test.

The Global Constraints (l.103) allow these pins. Task 1's own list does not.

**Amendment.** l.199 becomes:

"- Test pins: `src/pages/designer/designer-page.test.tsx` (count); `tableaux.test.ts` and `playtest-fitted.test.tsx` where they pin:
  - the per-player rows: each tableau line gains ` · equity 3 · portfolio 0`;
  - the Board text: each seat's Board line gains ` · equity: Equity; Equity; Equity`, and `'lists every seat's Board as text, whichever seat is looked at'` now expects `equity: Equity; Equity; Equity` for the seat with nothing on its Board, where it expected none;
  - the fitted table: `'puts the Board in two lines between the shared lines and the strip, the milestones alone on the second, each slot 418 tall'` becomes `'…, the milestones, the equity and the portfolio on the second, each slot 418 tall'`, with milestones at `{ x: -420, y: 192 }`, equity at `{ x: 0, y: 192 }` and portfolio at `{ x: 420, y: 192 }`, all 418 tall, the table's height unchanged;
  - or the next card id."

At l.276, add `tableaux.test.ts playtest-fitted.test.tsx` to the `git add`.

### R5 (fix-in-plan) — T2: Venture Capital Rain's cell still says "Not in effect yet.", and the README's Events sentence goes stale

**Evidence.**
- As written, the guard test fails: `expected [ 'Headhunter Holiday', …(3) ] to deeply equal [ …(2) ]`.
- The handoff's "7–10 (from 6-3)" note asks for the cell to change in the same task.
- The README still says "fourteen Events act … and Venture Capital Rain … wait for their slices". Task 7's README text (l.1171–1179) does not fix it.

**Amendment.**
- After l.359, add:

  "- **The Event's cell** (§20.D 1). Venture Capital Rain's row becomes:
  ```text
      | Venture Capital Rain         | Whenever a player Invests in a Founder this round, the Bank pays that Founder $3 extra cash (not on Secondary Trades or Buybacks). | 1 |
  ```"
- After l.312, add: "`'ends an Event's effect "Not in effect yet." exactly when no rule outside the Event table names that Event'` expects `['Headhunter Holiday', 'Recruiter Frenzy', 'Whistleblower Protection Act']`. The next test's comment reads 'the three of later slices end "Not in effect yet."'."
- l.290: `README.md` (count, and the Events sentence). Its sentence becomes:

  "fifteen Events act (revenue and decay, output and bandwidth, hiring, Training, TechCrunch and License prices, Crunch Time, Venture Capital Rain's $3 to a Founder on each Invest, and Angel Investors' and Regulation Audit's one-off effects taken in turn), and Recruiter Frenzy, Headhunter Holiday and Whistleblower Protection Act wait for their slices."

### R6 (fix-in-plan) — T2, T6 and T7: the 3-player seed 1 undo test's length moves three times

**Evidence.** `'takes back every move with undo, and rebuilds the game from its log, through recruits and research (3 players, seed 1)'` pins the log length:
- BASE: 52 moves;
- T2: 53 (an Invest at move 12);
- T6: 51;
- T7 with the steer: 52.

l.124 says to stop on any existing test the task doesn't name.

**Amendment.** In each task's Step 1 Pins, add the re-pin to the length the run gives (the probe's values below).
- **T2 (after l.312):** 53. The comment ends "…, the Event deck reshuffled the game from plan 6-2b, and an Invest came before it from plan 7-2a)."
- **T6 (after l.1005):** 51. The comment ends "…, and plan 7-2a's Invest and Round Start steps, a placement and two confirms among them, reshuffled it again)."
- **T7 (Step 2, after the steer):** 52. The comment ends "…, and plan 7-2a's Invests and Round Start steps reshuffled it again: an Invest, a placement, a confirm and a placing Invest come before it, so undo takes each back)."

### R7 (fix-in-plan) — T2, T3, T5 and T6: "the values test" names no test

**Evidence.** Several values tests exist:
- `tier number`, the consultant values and the `playerValues` keys live in `'works out slice 4’s values for cards and players (§5, §11.C.2, §20.B)'`;
- `acting once` lives in `'works out slice 5’s values and flags for cards: …'`.

**Amendment.**
- l.311, l.456 and l.726: "the values test" becomes "`'works out slice 4’s values for cards and players (§5, §11.C.2, §20.B)'`".
- l.1004: "`'works out slice 5’s values and flags for cards: …'` drops `acting once`."

### R8 (fix-in-plan) — T3: example 2 boxes its Sales Rep

**Evidence.** As written: "Expected p1's operational revenue to be 6, but it is 4." The ops-team Given replaces the zone, and the Sales Rep on the product lives in it.

**Amendment.**
- Swap l.497 and l.498:
  ```
    And p1's ops team has a Junior Software Dev and a Junior Software Dev
    And the Search Engine in p1's operations has a Sales Rep on it
  ```
- At l.535, add: "(the ops team is arranged first: a Given naming the ops team replaces it, and the Sales Rep on the product with it)."

### R9 (fix-in-plan) — T4: two existing examples quote the Greenlight refusal, which now names the tie

**Evidence.** As written, both examples fail on their reason text.

**Amendment.** After l.602, add:

"- Two existing examples quote the refusal.
  - In `Example: a Greenlight is refused when its License can't be paid, and nothing changes (section 6)`:
    `  Then it is rejected because "the card has no requires or they have a card in their operations whose tag is the card's requires or another player tied to them by a card in their portfolio has a card in their operations whose tag is the card's requires or they have at least the license in capital"`
  - In `Example: Fusion Reactor needs Robotics and AI, and one provider of both is paid a License for each (ruling 3, section 6)`:
    `  Then it is rejected because "the card has no requires or the card has no also requires or they have a card in their operations whose tag is the card's requires or they have a card in their operations whose tag is the card's also requires or another player tied to them by a card in their portfolio has a card in their operations whose tag is the card's requires or another player tied to them by a card in their portfolio has a card in their operations whose tag is the card's also requires or they have at least 2 times the license in capital"`"

l.571's Expected becomes "FAIL (the count, two refusal reasons)".

### R10 (fix-in-plan) — T4 and T6: a required key reaches 0 games before Task 7's steer

**Evidence.**
- At T4, no game pays 'a license paid to a chosen provider': Partners waive it. The slice-3 tally fails.
- At T6, no game holds "a Workaholic's +2 at the Engine".
- Task 7's steer brings both back to 2 games:
  - the chosen provider in 4p seeds 2 and 4;
  - the Workaholic in 2p seed 2 and 5p seed 5.

**Amendment.**
- **T4 Step 1:** `HELD_BY_FEWER_THAN_TWO` gains `'a license paid to a chosen provider'` provisionally, with the bullet:

  " * - Plan 7-2a: a License paid to a provider chosen among several, which 3 players seed 2 alone held once the seats invested and no game held once Partners waived the License (two rivals must run products of the Tag a seat's Greenlight lacks, and neither may be its Partner); the arranged test 'names the provider it pays a License to by t when two rivals provide the Tag, …' pins it."
- **T6 Step 1:** it gains `"a Workaholic's +2 at the Engine"` provisionally.
- **T7 Step 2:** remove both, with the bullet.

### R11 (fix-in-plan) — T5: the supply lines as written hide the supplies and their gauges

**Evidence.**
- `worked-view.ts`'s `shownPlayerValues` shows only `a player's X is the total Y of …` (`PLAYER_TOTAL`) lines. A `goes up by the total` line makes the value unshown.
- As written, 4 Startup tests and 6 playtest-fitted gauge tests fail, including `expected [ 'blue demand', … ] to deeply equal [ 'blue supply', … ]`.
- l.727 already requires that "The supplies must stay shown".
- Changing `worked-view` is shared code.

**Amendment.** Replace l.769–772 with:

"- **Ops** (§17.B.4, ruling 25). Each product adds its Consultants to its pool, and each supply totals the pools of the ops team and the operations, Offline products included. The supply stays a total the page shows.
  - In `Pool blue:`, after `  A card's pool blue goes up by its blue bandwidth.` add `  A card's pool blue goes up by its consultant blue.`
  - In `Pool red:`, after `  A card's pool red goes up by its red bandwidth.` add `  A card's pool red goes up by its consultant red.`
  - In `Pool qa:`, after `  A card's pool qa goes up by its qa output.` add `  A card's pool qa goes up by its consultant qa.`
  - `  A player's blue supply is the total pool blue of the cards in their ops team.` becomes `  A player's blue supply is the total pool blue of the cards in their ops team and their operations.`
  - Likewise `… total pool red of the cards in their ops team and their operations.` and `… total pool qa of the cards in their ops team and their operations.`"

Follow-on edits:
- l.52 becomes: "each product's pool goes up by its consultant values, and each supply totals the pools of the ops team and the operations, Offline products included".
- l.66 and l.711 add `pool blue`, `pool red`, `pool qa` to the refined values.
- l.708 drops "7-1 Task 4's `goes up by the total`".
- l.971's "5:" item becomes "the three pool lines and the three supply lines".

With this wording, no shown-value pin changes.

### R12 (fix-in-plan) — T5: Pivot returns the tokens still coloured (7-1's R8; 7-3's G1)

**Evidence.** The notes for 7-preflight ask 7-2a to clear the three flags when a token comes off a product: "the page labels a stale flag". 7-1's R8 phrase exists in the probe.

**Amendment.**
- l.797 becomes:

  "- **Pivot** (§17.B.4 "Lost product", R1, 7-1's R8). In `A player may pivot a card in their development.`, right before its `      Move it to the open idea pool.` add:
  ```text
        Every other player's card on it is not blue consultant.
        Every other player's card on it is not red consultant.
        Every other player's card on it is not qa consultant.
        The other players' cards on it go to their owners' portfolio.
  ```"
- Example 8 (l.938–949) becomes:
  ```text
  Example: a Pivot sends the Founder's staff to the bench and the Investors' Consultants back to them, unplaced and with no colour (section 6, section 17, the slice's R1)
    Given 4 players
    And the phase is actions
    And p0's development has a Dating App
    And the Dating App in p0's development has a Junior Software Dev on it
    And p1's portfolio has an Equity whose founder is p0
    And p2's portfolio has an Equity whose founder is p0
    And p3's portfolio has an Equity whose founder is p0
    And the Equity whose founder is p0 in p1's portfolio is on the Dating App in p0's development
    And the Equity whose founder is p0 in p1's portfolio is blue consultant
    And the Equity whose founder is p0 in p2's portfolio is on the Dating App in p0's development
    And the Equity whose founder is p0 in p2's portfolio is red consultant
    And the Equity whose founder is p0 in p3's portfolio is on the Dating App in p0's development
    And the Equity whose founder is p0 in p3's portfolio is qa consultant
    When p0 pivots the Dating App
    Then the open idea pool has a Dating App
    And p0's bench has a Junior Software Dev
    And p1's portfolio has an Equity whose founder is p0
    And the Equity whose founder is p0 in p1's portfolio is on no card
    And the Equity whose founder is p0 in p1's portfolio is not blue consultant
    And the Equity whose founder is p0 in p2's portfolio is on no card
    And the Equity whose founder is p0 in p2's portfolio is not red consultant
    And the Equity whose founder is p0 in p3's portfolio is on no card
    And the Equity whose founder is p0 in p3's portfolio is not qa consultant
  ```
- l.973 becomes "8: the Pivot's return line and its three clearing lines (p1's token blue, p2's red, p3's QA)".
- l.965 adds "on no card and with no colour".
- l.141 adds ", with no colour" after "on no card".
- l.733 adds: "and every Equity card on no card has none of them".
  - Code, as the next branch of the attachment check:
    ```ts
    } else if (founderOf(c) !== undefined && Object.values(CONSULTANT_COLOURS).some((flag) => c.data?.[flag] === true)) {
      // An unplaced token keeps no colour: the Pivot's return clears it (7-1's R8), and the page labels no stale one (7-3's G1).
      board.push(`${which()} sits on no card with a colour`);
    ```
- l.45 becomes: "Pivot clears all three as it returns the token (7-1's R8), so an unplaced token has no colour, and every placement picks again (§17.B.4 "made when you place the token")."
- l.1240 becomes: "**A Consultant's colour is three flags,** cleared and set again by each placement button (two here, a third in 7-2b), and cleared by the Pivot as it returns the token (7-1's R8), so an unplaced token has no colour."
- l.1231 and l.1234: "with the Pivot's three clearing lines and `The other players' cards on it go to their owners' portfolio.`"

### R13 (fix-in-plan) — T5: 6-2a's Toxic Personality checks count the Consultants as the team's

**Evidence.**
- The ops-team check compares the team's bandwidth with supplies that now include Consultants.
- Under the steer, the project check failed: `c65 (Drone Delivery) keeps 1 QA of the 0 it makes …`. A QA Consultant was on a project with a Toxic card.

**Amendment.** After l.737, add:

"- **6-2a's Toxic Personality checks leave the Consultants out** (§17.B.4: their output is the product's, and Toxic never takes it).
  - The ops team's compares with each supply less the total `consultant blue` / `consultant red` / `consultant qa` of the seat's operations.
  - A project's compares with its `qa made` less its `consultant qa`."

The code as built:
```ts
// The Consultants on its products add to its supplies too, outside the team, and Toxic Personality never takes their cube (§17.B.4).
const products = zoneCards(after, zoneIdFor('operations', seat));
const consulted = ['consultant blue', 'consultant red', 'consultant qa']
  .map((name) => products.reduce((total, on) => total + ((runtime.workedValue(after, on.id, name) as number | null) ?? 0), 0));
const supplies = ['blue supply', 'red supply', 'qa supply'].map((name, i) => runtime.playerValue(after, seat, name) - consulted[i]);
```
```ts
// A QA Consultant on it adds its Bug removed to what it makes, outside the team, and Toxic Personality never takes it (§17.B.4).
const consulted = (runtime.workedValue(after, c.id, 'consultant qa') as number | null) ?? 0;
const made = read(MADE).map((value, i) => (MADE[i] === 'qa made' ? value - consulted : value));
toxicity.push(...toxicCube(`${c.id} (${nameOf(c)})`, read(TEAM), made, toxic.data?.onboarding !== true));
```

### R14 (fix-in-plan) — T5: the placing Invest's action cost survives the removal probe

**Evidence.** Example 1 arranges 4 actions but checks none. Removing `It costs 1 action.` from the placing Invest fails no example.

**Amendment.**
- After l.820 (`  And p0 has 0 capital`), add `  And p0 has 1 action`.
- l.967's "1:" item adds "the action cost".
- l.953 adds "the three Invests leave 1 of the 4 actions".

### R15 (fix-in-plan) — T5: the reshuffle Review Focus test loses its 2-player seed 4 reshuffle

**Evidence.** As written: `expected +0 to be 1`. Once the seats invest, 2-player seed 2 is the only 2- or 3-player game that reshuffles the strategy discard, through to the end.

**Amendment.** Add to T5 Step 1 Pins:

"In `'Review Focus: a reshuffle no seat can follow (plan 6-1, Task 6)'`, the test plays `playGame(2, 2, …)`, and its title ends 'at 2 players seed 2'."

### R16 (fix-in-plan) — T6: the money check pays Angel Investors' $3 in the reveal move only

**Evidence.** As written, the 4 long runs fail. For example: `capital gained by p0, p1, p2 after p1's end their actions: expected [ 3, +0, 3 ] to deeply equal [ 3, 3, 3 ]`. An Investor's step now stops the steps, so a later seat is funded in the move that starts its step.

**Amendment.** After l.1007, add:

"6-2b's Angel Investors' $3 is checked in the move that starts each seat's step."

The code replaces `funded`:
```ts
// Angel Investors funds each seat as its step starts, and an Investor's step stops the steps (plan 7-2a), so a seat after it is
// funded in the move that starts its step.
const begun = (state: GameState) => {
  const done = stepsDone(state, seats);
  return done === null ? null : [...done, state.turn!.current as PlayerId];
};
const begunBefore = begun(before) ?? [];
const starting = stepping ? (begun(after) ?? seats).filter((seat) => !begunBefore.includes(seat)) : [];
const funded = (seat: PlayerId) => starting.includes(seat) && eventOf(after) === 'Angel Investors' && products(before, seat).length > 0
  && products(before, seat).every((product) => product.data?.tier === 'Tier 1');
```
- Its comment reads "$3 to each seat the Angel Investors fund whose step started in it, …".
- `EVENT_CHECK`'s doc becomes: "The step each player takes in turn from the start player at each Round Start: Angel Investors' $3, Regulation Audit's tax and the Consultants (§5 Phase A, §17.B.4, §20.D)."

### R17 (fix-in-plan) — T6: playtest-fitted's event-check test lists the two new buttons

**Evidence.** As written, `'Review Focus: follows the event check to the seat it waits on, lets staff go there, and Undo brings the step back'` fails (in describe 'a Debuff on another seat's staff, and the steps as a round starts').

**Amendment.** Add to T6 Step 1 Pins: "That test's `seatButtons()` expects:"
```ts
'Let go of a card in your development team', 'Let go of a card in your ops team',
"Place a card from your portfolio to a card in another player's development or another player's operations", 'Confirm your consultants',
```

### R18 (fix-in-plan) — T6: the Hint names moving a Consultant, not placing one held unplaced

**Evidence.** The step also places an unplaced token: example 1 does, and the overview calls for it. The Hint is not pinned literally; the page reads it through `hint('event check')`. Built as A-T6b, S+D 526/526.

**Amendment.** At l.1017, the Hint's first sentence becomes: "Place each Consultant you hold on one of its Founder's products, or move it to another, if you like, picking its colour again, then confirm."

### R19 (fix-in-plan) — T6: the `t % 3 === 1` placement cadence always picks the same colour

**Evidence.**
- A choice is answered `(t + at) % 3`, so every Round Start placement picked Red.
- At T7 as written, 'a Consultant placed: Blue' came up in 1 game.
- With `t % 4`, Blue is placed in 20 games, Red in 9 and QA in 13.

**Amendment.** At l.1010: "when the seat's portfolio is not empty, `t % 4 === 1` (not `t % 3`: the colour is answered `(t + at) % 3`) and it has placed nothing yet this step, it places …".

The comment as built: "… the colour answered as any choice is (`t % 3`, so not `t % 3 === 1`, which answers Red each time); then it confirms (§5 Phase A, §17.B.4)."

### R20 (fix-in-plan) — T7: the keys read `othersOn`, which the test file doesn't import

**Amendment.** At l.1136, add: "`othersOn` (add `import { othersOn } from '@/engine/core/lang/attach';`)."

### R21 (fix-in-plan) — T7: the steer

**Evidence.**
- At T7 as written, 7 keys stood at 0: an Invest at $10, at $15 and during Venture Capital Rain; the hard cap; dividends of $2 and $3; and Ops QA.
- The hard cap key needs a refused press, which `investing()` never makes: it presses only allowed cards.
- More than 25 variants were tried.

**Amendment.** Replace l.1163–1168 with the adopted steer:
- `investing(a)` invests when `(t + a) % 7 === 0`, and on every action while Venture Capital Rain is in play.
- It picks the dearest allowed Founder, then the higher Operational Revenue.
- It buys a second token of a Founder only in the Rain or above $5.
- A `capped(a)` press goes before it in the planned list.
- R19's placement cadence applies.

The code as built:
```ts
const investing = (a: number): Move | null => {
  const raining = eventOf(engine.getState()) === 'Venture Capital Rain';
  if ((t + a) % 7 !== 0 && !raining) return null;
  const priceOf = (card: CardState) => sharePriceOf(runtime, engine.getState(), founderOf(card)!);
  const revenueOf = (card: CardState) => runtime.playerValue(engine.getState(), founderOf(card)!, 'operational revenue') as number;
  const keeps = (card: CardState) => capital() - priceOf(card) >= 2;
  const second = (card: CardState) => cards(own('portfolio')).some((c) => founderOf(c) === founderOf(card));
  const wanted = (card: CardState) => !second(card) || raining || priceOf(card) > 5;
  const dearest = (row: CardState[], pressing: Pressing) => row.filter((card) => pressing.allows(card) && keeps(card) && wanted(card))
    .reduce<CardState | undefined>((top, card) => (top === undefined || priceOf(card) > priceOf(top)
      || (priceOf(card) === priceOf(top) && revenueOf(card) > revenueOf(top)) ? card : top), undefined);
  const plain = pick(INVEST, equitiesFrom(runtime.seats, by), dearest);
  // ...the rest as Task 5 (INVEST_PLACING on an even t onto the founder's first product)
};
/** On the Invest cadence, the press of a Founder's last token in their equity, which the hard cap refuses at no cost before the seat invests (§17.D). */
const capped = (a: number): Move | null => ((t + a) % 7 !== 0 ? null
  : pick(INVEST, equitiesFrom(runtime.seats, by), (row) => row.find((card) => cards(card.zoneId).length === 1)));
```
The planned list becomes `… makersToProject(), capped(a), investing(a), brainstorming(a), ...board(),`.

Holds at the end, as games of the 20:

| Key | Games |
|---|---|
| Invest at $5 | 20 |
| Invest at $10 | 1 |
| Invest at $15 | 0 |
| Invest during Venture Capital Rain | 3 |
| Hard cap refused | 3 |
| Dividend of $1 | 16 |
| Dividend of $2 | 2 |
| Dividend of $3 | 0 |
| License waived between Partners | 14 |
| Placed: Blue | 20 |
| Placed: Red | 9 |
| Placed: QA | 13 |
| Consultant's cube at the Engine | 20 |
| Consultant's Bug at the Engine | 6 |
| Consultant on a Stalled project | 9 |
| Consultant's bandwidth at an Income | 15 |
| Consultant's Bug in Ops QA | 0 |
| Kept by a Launch | 16 |
| Sent back by a Pivot | 3 |
| Placed at a Round Start | 13 |
| Moved at a Round Start | 17 |
| Two Consultants on one product | 2 |

The new move types are made in 16 (INVEST), 18 (INVEST_PLACING), 17 (PLACE) and 20 (CONFIRM_CONSULTANTS) games.

### R22 (fix-in-plan) — T7: four slice-7a keys the runs can't reach

**Evidence.** The max probes found:
- no run puts a Tier 3 product in operation, so no Invest at $15;
- the highest Operational Revenue at any Income is $17, so no dividend of $3;
- an Invest at $10 is held by 1 game (2p seed 4);
- a Consultant's Bug in Ops QA by none.

**Amendment.** l.1169 is met as the earlier slices' excused keys are: `HELD_BY_FEWER_THAN_TWO` gains the four keys, each pinned by its example.
- The Set entries: `'an Invest at $10'`, `'an Invest at $15'`, `'a dividend of $3'`, `"a Consultant's Bug in Ops QA"`.
- The doc bullet:

  " * - Plan 7-2a, out of reach of the runs: an Invest at $15 (no run puts a Tier 3 product in operation), at $10 (one game, 2 players seed 4, where a rival holds the $12 while a Tier 2 product is in operation), a dividend of $3 (no Income comes to $21; one of $12 is the most) and a Consultant's Bug in Ops QA (a Bug on a product in operation is rare, and a QA Consultant must sit on it), each pinned by its example ('Invest pays the Founder their Share Price: $5 with only Tier 1, $10 with an Active Tier 2, $15 with a Tier 3 …', '$21 of Operational Revenue pays $3 a token, …', 'a Consultant on a Maintenance product adds 1 Ops bandwidth of its colour at the Founder's Income, or removes 1 Bug in Ops QA …')."

  (The bullet says "one of $12 is the most", which was true without the steer; under the steer the most is $17 (2p seed 4). Both stay under $21.)

### R23 (ruling-needed) — T7: four earlier required keys fall under 2 games once the seats invest

**Evidence.** The Invests and the Round Start steps replay every game:

| Key | Games |
|---|---|
| A Junior PM promoted at a Launch | 0 |
| Pending tokens returned by a pivot | 1 (5p seed 4) |
| Trade Show: a TechCrunch Feature for $2 | 1 (4p seed 2) |
| A trained Junior declared blue | 1 (4p seed 1) |

No cadence tried kept all four at 2. Eight older keys now sit at exactly 2.

**Options.**
- **(a) Recommended.** Demote all four to `HELD_BY_FEWER_THAN_TWO`, each with its pin named. This is built in A-T7. The bullet reads:

  " * - Plan 7-2a, held by fewer once the seats invest (the Invests and the Round Start steps replay every game; nine cadences tried kept none of these four at 2): a Junior PM promoted at a Launch (none; 'claims First Mover Advantage, Platform Power and Full Stack Founder at one auto-player Launch of a Tier 2 card, which promotes its Junior PM, …'), Pending tokens returned by a pivot (5 players seed 4; 'Pending tokens stay with a Junior who is Reassigned, and a Pivot returns them all …'), Trade Show's TechCrunch Feature for $2 (4 players seed 2; 'during Trade Show TechCrunch Feature costs $2, …') and a trained Junior declared blue (4 players seed 1; 'a Junior Hardware Eng with a Blue Skill token declared Blue makes 1 Blue, its Red XP idle …')."
- **(b)** Retune the slice-4 to slice-6 drivers further. This is open-ended, and each change moves other keys.
- **(c)** Accept 1 game for keys an arranged test pins. This is a policy change.

### R24 (fix-in-plan) — T7: the 4-player replay plays its games again, and no 4-player log holds a Consultant pivot

**Evidence.**
- As written, it calls `playGame(4, seed, …)`, which costs about 1.5 s more again.
- Under the steer, 'Pivots of a product with a Consultant' is 0 across the 4-player logs. Consultant pivots happen in 2p seed 4, 3p seed 4 and 5p seed 4.

**Amendment.** l.1158–1160 become: "reuse the long run's games (`keptGame(4, seed)`; `keeping` covers `players <= 4`). Count the placing Invests and the Round Start placements from the 4-player logs, and the Consultant pivots across the kept 2-, 3- and 4-player logs (`REPLAYED` gains `'Consultant pivots'`, counted from `CONSULTANT_PIVOTED`; the 2-player test's `Required` leaves it out)."

The code as built:
```ts
const { log, beforeLast, end } = keptGame(4, seed);
seen['placing Invests'] += log.filter((move) => move.type === INVEST_PLACING).length;
seen['Round Start placements'] += log.filter((move) => move.type === PLACE).length;
// ... loadLog(log), toEqual(end), replayed.undo(), toEqual(beforeLast)
for (const players of [2, 3, 4]) {
  for (let seed = 1; seed <= 5; seed++) seen['Consultant pivots'] += keptGame(players, seed).seen['Consultant pivots'];
}
```

### R25 (fix-in-plan) — T7: the Engine keys need no second `atTheEngine`

**Evidence.** l.1142 reads "read in `atTheEngine`". A second call makes a fresh `cards` array, so the runtime's per-`state.cards` caches miss and every value is worked out again. The slice-3 block already holds that state as `generating`.

**Amendment.** At l.1142–1144, add: "inside the slice-3 `if (ranTheEngine(before, after, by))` block, reading its `generating` and `stalled`."

The code as built:
```ts
for (const project of zoneCards(generating, zoneIdFor('development', by))) {
  if (stalled.includes(project)) { if (othersOn(generating, project.id).length > 0) keys.push(CONSULTANT_STALLED); continue; }
  if (consulting(generating, project.id, 'consultant blue') + consulting(generating, project.id, 'consultant red') > 0) keys.push(CONSULTANT_CUBE);
  const had = cardById(before, project.id);
  if (consulting(generating, project.id, 'consultant qa') > 0 && had !== undefined && bugsOn(had) > 0) keys.push(CONSULTANT_BUG);
}
```

### R26 (fix-in-plan) — T7: the assign, launch, pivot and reassign undo test's log nearly doubles

**Evidence.** Under the steer, 3-player seed 2 needs 131 moves (69 at BASE). Undo replays the log at each step, so the test goes from 1.4 s to 5.3 s. Seed 4 needs 64 moves and takes about 1.3 s.

**Amendment.** Add to T7 Step 2: "`'takes back every move with undo, and rebuilds the game from its log, across an assign, a launch, a pivot and a reassign (Review Focus: 3 players, seed 2)'` moves to seed 4." That means:
- `playGame(3, 4, …)`;
- `fresh` uses `initialState(game!, 4)`;
- the title ends "(Review Focus: 3 players, seed 4)";
- the comment reads "Seed 4 makes all four by its 64th move, the soonest of the 3-player seeds 1 to 5 once plan 7-2a's seats invest (seeds 3, 1, 5 and 2 take 122, 125, 129 and 131; seed 2 took 69 before). Undo plays the log again from the start, so a short log keeps it quick."

### R27 (fix-in-plan) — T7: the 2- and 3-player replay comments name seeds that no longer hold

**Evidence.** These facts were re-read from the end's logs. Built as A-T7c.

**Amendment.** l.1161's "Kept as they are" adds: "their comments' per-seed facts are re-read."

- **2-player test.** The second sentence becomes "It requires every path `REPLAYED` counts but the Design Sprints, which the 3-player test below requires, and the Consultant pivots, which the 4-player test below counts across the 2-, 3- and 4-player logs." The seed sentence becomes:

  "The declarations are in seeds 1, 2 and 4, the Debuffs in seeds 2, 4 and 5, the reshuffle in seed 2, the TechCrunch Feature in seeds 2 and 4, the strips in seeds 2, 4 and 5, the Event reshuffle in seeds 2 and 4 (only 2-player games last the 19 rounds a reshuffle takes) and a let-go in the event check in seeds 1 and 2 (plan 7-2a's Invests and Round Start steps replayed every game). The last move taken back is a backlog cleanup's discard in seeds 1, 3 and 5, the end of the actions in seed 2 and a final-check switch-off in seed 4."
- **3-player test:**

  "A Debuff is in seeds 2, 4 and 5, the strips (Attributes discarded with a fired Talent) in seed 4, a TechCrunch Feature in seeds 2 and 4 (none before the second retune kept the TechCrunch Feature first) and a Design Sprint in seed 4, since plan 7-2a's Invests and Round Start steps replayed every game. The last move taken back is the end of the actions in seed 1, a final-check switch-off in seeds 2 and 5 and a backlog cleanup's discard in seeds 3 and 4."
- The "no log holds a clean, keep or Mentor press" sentences were re-checked and still hold.

### R28 (fix-in-plan) — T7: "It still leaves out" drops the Full Stack Ninja's trait

**Evidence.** BASE's README lists the trait, and this plan doesn't build it.

**Amendment.** At l.1179, insert "the Full Stack Ninja's trait," after "Flight Risk's effect,".

### R29 (ruling-needed) — Timing: 7-2a costs +7.5 to +8.3 s, against a share of about 3 s

**Evidence.** Per test, best of 3 at BASE against best of 2 at the end:

| Test | BASE | End |
|---|---|---|
| Long runs, 2 players | 3.25 s | 5.01 s |
| Long runs, 3 players | 3.23 s | 4.52 s |
| Long runs, 4 players | 2.91 s | 3.82 s |
| Long runs, 5 players | 2.82 s | 3.81 s |
| All four long runs | 12.2 s | 17.2 s (+4.95 s, +41%) |
| New 4-player replay | — | 1.58 s |
| 2-player replay | 1.44 s | 2.11 s |
| 3-player replay | 1.41 s | 1.95 s |
| Page-view game, 2p seed 2 | 0.47 s | 1.01 s (that game is 343 moves at BASE, 458 at the end) |
| Everything else | | about +0.7 s |

Long-run moves go from 4615 to 5406 (+17%):
- 563 new moves: 393 confirms (R20 (b): every Investor stops at every Round Start), 123 Round Start placements, 21 Invests and 26 placing Invests;
- 228 more from longer games.

Time per move rises about 20%. At 4 players the moves fall 1% but the time rises 31%. The causes:
- 3 more cards per seat;
- the consultant, share price and dividend values every state works out;
- both Invest buttons judged across every rival's equity and products;
- the new invariants.

Turning T7's tally block on and off moves less than the noise.

**Options.**
- **(a) Built on `opt-cut` (`bdafc5c`), passes.** Drop the 4-player replay test.
  - `REPLAYED` gains `'placing Invests'` and `'Round Start placements'`, counted in `keepingForReplay`. The 2-player replay test requires them and the Consultant pivots.
  - Every 2- and 3-player log holds a placing Invest and a Round Start placement, and 2-player seed 4 holds a Consultant pivot.
  - `keeping` goes back to `players <= 3`.
  - In the same alternating set, the file's best is 27.14 s against 29.29 s at the end and 21.78 s at BASE.
- **(b)** Reopen R20: an auto-pass for an Investor whose Founders have no product would cut part of the 393 confirms. It needs 7-1's `its {cardplayer} has a card in their {perzone}`. Not recommended now.
- **(c)** Thin the auto-player: Round Start placements on `t % 8 === 1`, or move the page-view test to a shorter 2-player seed. Each saves a few percent. Neither is built or re-measured for coverage.
- **(d)** Re-split or raise the 30 s watch for 7-2a and 7-2b. 7-2b's Veto window adds a stop at every Invest.

**Recommendation.** Take (a) now, which leaves 7-2a at about +5.4 s here (×1.25, about 30 s at a 24 s BASE). Rule a new budget under (d) before 7-2b's pre-flight.

## Gaps (with homes)

- **Equity on the page (7-3).** The equity and portfolio rows join the Board text and the fitted Board's second line (R4). How they look belongs to 7-3, with its Gaps 1–3 and G2 (the Share Price before pressing).
- **Tally details (7-2b or a cleanup; all harmless).**
  - `ANGEL_PAID` is tallied at the reveal move, though a seat after an Investor is now paid in a later move.
  - 'two Consultants on one product' is pushed on every move while a product holds two. It counts moves, not stackings.
  - `stepsEndedIn` keeps its Angel/Audit special case though the steps run every round. Only the Regulation Audit tally reads it.
- **A stale name (7-3).** The plan 6-3 view test's `eventFlags` list still names `acting once` after the flag is removed. It is harmless.
- **The Round Start stop (7-3 pre-flight, as the notes say).** R20's auto-pass is wanted for the page and for timing (R29 (b)).
- **Immunity (slice 8).** No line yet, as the plan's Gaps say.

## Checked and clean

- **The rulebook, line by line.**
  - 3 tokens a player (l.26).
  - The Share Price of $5 / $10 / $15 by the highest Active Tier, with Offline not Active (§17.A, §9 "Active").
  - Dividends of $0 / $1 / $2 / $3 at $1, $11 and $21, from the bank, at the Founder's Income, cumulative per token (§17.B.1, §17.D, §5 Phase B step 3).
  - Dividends are not revenue (§9.A).
  - The hard cap: at most 2 tokens for sale (§17.D).
  - Partners both ways, with the License at $0 (§17.B.3).
  - The Consultant: one card, development or maintenance, never a Talent; +1 cube or Bug, none while Stalled; Ops bandwidth or Ops QA; returned when the product is lost; moved at a Round Start; two make +2 (§17.B.4, §17.D).
  - Venture Capital Rain's +$3, not on trades (§20.D 1).
  - 5 VP per rival token and 0 for your own (§12.4).
- **The examples.** All 24 numbers were re-read against "How the numbers come". No example arranges more than 3 tokens naming one player.
- **The 24 new examples (307 → 331).**

  | # | Task | Example |
  |---|---|---|
  | 1 | T1 | each player starts with 3 Equity tokens of their own in their supply, and holds none |
  | 2 | T1 | each rival's Equity token held scores 5 points, and a player's own tokens score nothing |
  | 3 | T2 | Invest pays the Founder their Share Price: $5 with only Tier 1, $10 with an Active Tier 2, $15 with a Tier 3 |
  | 4 | T2 | an Offline product isn't Active, so a Founder whose only Tier 2 product is Offline sells at $5 |
  | 5 | T2 | a Founder never sells the last token in their supply, and an Investor must pay the full price; a Founder with no product sells at $5 |
  | 6 | T2 | during Venture Capital Rain the bank pays the Founder $3 more on every Invest |
  | 7 | T3 | at the Founder's Income the bank pays each of their Equity tokens a dividend: $12 of Operational Revenue pays $2 a token |
  | 8 | T3 | Operational Revenue counts bonuses and Bug decay, and $6 pays $1 a token |
  | 9 | T3 | $21 of Operational Revenue pays $3 a token, and an Investor with two tokens is paid twice |
  | 10 | T3 | dividends are not Operational Revenue: a Founder paid a dividend but earning nothing from products pays their own Investors nothing |
  | 11 | T4 | Partners use each other's Tags for free, both ways: the Investor's Greenlight and the Founder's pay no License |
  | 12 | T4 | a Tier 3 card pays a License only for the Tag no Partner provides: a Partner's Tag counts toward the two Licenses' worth of capital |
  | 13 | T4 | a Partner providing a Tier 3 card's second Tag is paid nothing, and the provider of its first is paid |
  | 14 | T4 | a player who provides one Tag and is Partners with the provider of the other Greenlights a Tier 3 card with no capital to spare |
  | 15 | T5 | an Investor may place the token as a Consultant on one of the Founder's products as they buy it, picking its colour afresh, never on another Founder's product |
  | 16 | T5 | an Invest that places the token pays the same price, keeps the hard cap and earns Venture Capital Rain's $3 |
  | 17 | T5 | a Consultant on a Development project adds 1 cube of its colour at the Engine, or removes 1 Bug, and is no teammate |
  | 18 | T5 | a Consultant on a Stalled project adds no cube and removes no Bug |
  | 19 | T5 | a Consultant on a Maintenance product adds 1 Ops bandwidth of its colour at the Founder's Income, or removes 1 Bug in Ops QA |
  | 20 | T5 | two Consultants on one product give it +2 |
  | 21 | T5 | a Launch moves the Founder's staff to the ops team and leaves the Investor's Consultant on the product |
  | 22 | T5 | a Pivot sends the Founder's staff to the bench and the Investors' Consultants back to them, unplaced and with no colour (as amended in R12) |
  | 23 | T6 | at each Round Start an Investor may move a Consultant to another of the Founder's products, or place one held unplaced, picking its colour again; players holding none pass at once |
  | 24 | T6 | an Investor's Round Start step also pays a Regulation Audit, letting staff go until they can |

- **The removal probe at the end.** Of the 89 non-example lines added or changed, 63 are pinned and 26 give a compile diagnostic (structural lines). None survives. T6's lines are all pinned.
- **The Assumed section.** Every anchor it names was found exactly once at BASE; the edit script asserts this.
- **R21 (a).** 7-2a needs no `, choosing p3`. Its examples use `, choosing red` and `, choosing qa`, option choices that exist at BASE.
- **Classification.** The card-alone classifier judges `consultant blue/red/qa`, `blue added`, `red added`, `qa made` and `pool blue/red/qa` not card-alone, as they must be. `tier number` is card-alone.
- **Shown values.** With R11, no `shownFlags`, `standIns` or `shownPlayerValues` pin changes.
- **Global Constraints.** No shared code, page code or protected file changes. The plan adds no state key. The other games pass unchanged.

## The probe's commit list

| Task | Commit | Title |
|---|---|---|
| T1 | `a886364` | T1 (as written, with the page re-pins its Files line allows) |
| | `5a42cbb` | A-T1 (R1, R2, R3) |
| T2 | `1eeef10` | T2 (as written) |
| | `706a6f8` | A-T2 (R5, R6) |
| T3 | `a21d380` | T3 (as written) |
| | `e268fb7` | A-T3 (R8) |
| T4 | `49f3888` | T4 (as written) |
| | `973ac8d` | A-T4 (R9, R10) |
| T5 | `9db53c5` | T5 (as written) |
| | `2416ad0` | A-T5 (R11, R12, the ops half of R13, R15) |
| | `e054c56` | A-T5b (R14) |
| | `b1043ec` | A-T5c (the project half of R13; made after T7) |
| T6 | `08b919d` | T6 (as written) |
| | `9ae7859` | A-T6 (R16, R17, R6, R10) |
| | `6740cc7` | A-T6b (R18; made last) |
| T7 | `184fbc1` | T7 (as written, with the import R20 asks for) |
| | `d0bc981` | A-T7 (R19, R21, R22, R23 option (a), R24, R6, R28) |
| | `9b1f8ff` | A-T7b (R25, R26) |
| | `605bde3` | A-T7c (R27) |
| Optional | `bdafc5c` | On branch `opt-cut`: R29 option (a) |

R7 is a text-only clarification and has no commit.
