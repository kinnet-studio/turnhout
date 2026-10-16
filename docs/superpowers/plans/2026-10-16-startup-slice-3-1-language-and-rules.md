# Startup Simulator Slice 3-1 (Language and Rules) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Startup Simulator plays slice 3: Tier 2 and Tier 3 products are Greenlit with their Tags, paying $3 Licenses to a provider the player chooses, Domain Expertise cuts a product's cost (a hybrid's owner choosing how), Matching Leads are worked out from role and skill, a project with no usable lead is Stalled, a hybrid Launches only with full lead coverage, the Diva can't be Reassigned and is fired by a Pivot, and the Engineer costs $1 in the Ops Zone. To get there the language gains phrases about the card a rule is about, comparisons between two cards' columns across players' zones, and choices a button's press carries: a player picked among those who qualify, or one of a block of options, each filled in when only one qualifies.

**Architecture:**
- **This is plan 3-1 of two** (spec R8). Plan 3-2 (the page: faces showing tier, Tag, need and Stalled; payee and cut pickers) is written after plan 1b-3 lands. This plan does not touch the page's components. Until 3-2, a press that needs a choice is refused in the playtest with the choice's prompt, and the 1b-1 picker stays open, as it does for any refusal.
- **It runs after plan 1b-2** and takes its interfaces from that plan as amended (see "Assumed from earlier plans"). Nothing here depends on plan 1b-3.
- **R8's eight pieces, as eight tasks:**
  1. phrases about the card a rule is about, and two value lines;
  2. comparing two cards;
  3. a chosen player in a press;
  4. choosing among options in a press;
  5. what the view and the examples see of choices;
  6. rules text A;
  7. rules text B;
  8. long runs, then the word check.

  R8's "a chosen player" and "choosing among options" each lists its view and example parts. Here those parts are one task for both kinds (Task 5), since they share one view shape and one example frame.
- **Choices (R1).** A choice is a line of a button's `Then:` block, compiled into a `lang` ref that keeps its place among the lines.
  - **A choice line** reads `<effect> to another player of their choice who <clause>`. The effect is read as `<effect> to that player` (the existing `that player` of a picked player). The clause is read about each candidate as "they", so "who has a card in their operations …" asks the candidate's operations.
  - **A block of options** reads `They choose one:`, with an indented line ending in `:` for each option, and that option's `Only if` lines and effects under it.
  - **The guard.** `Only if` lines directly under a choice line or a block say when the choice is made at all.
  - **When a press is checked,** after its cost and every `Only if`, each choice whose guard holds is judged on that state. A choice with one candidate is filled in. One with several needs the press's `choices[at]`. One with none is not asked, and its line does nothing.
  - **At apply,** the lines run in order. A choice line runs its effect about the filled-in player. A block runs the chosen option's effects.
  - Replaying a log recomputes the same fill from the same state.
- **Values on cards (R3).** The cut is stored as two counts, `blue cut` and `red cut`, set at every Greenlight and cleared by Pivot. `blue need` and `red need` are worked values (cost less cut), read by Feature complete, Commit, Stalled and Fully led.
- **Leads (R2)** are worked flags made of `Only if` lines (`Leading software`, `Leading hardware`, `Stalled`, `Fully led`). No column is added.
- **Builder calls this plan makes** (the spec leaves them open):
  - **A choice with no candidate does nothing.** The spec names one candidate and several; R1 says only those. "Nobody provides the Tag" is refused by the Greenlight's own `Only if` lines, as §14.B words it, and the language's Then lines keep never refusing.
  - **A value given for a choice the press doesn't ask is ignored.** A named value that isn't one of the candidates refuses the press (R1).
  - **Choices may sit only in the `Then:` of a button that picks a card, or that picks nothing.** Only those buttons' views can show them (Task 5). A choice can't sit inside `If …,`: its condition goes under it as an `Only if` line.
  - **Prompts.**
    - A player choice: `Pick who to pay the license to: p1 or p2.` The words come from the effect, without "they" and "to that player".
    - A block: `Choose one: Cut 2 blue, Cut 2 red or Cut 1 of each.`, with each label as written.
    - R1's "for Commerce" is left out, because the language doesn't know which value the clause compares. The view carries the line's position, and plan 3-2 can show the card's Tag beside it.
  - **Example suffixes.**
    - `…, paying p1 and p2` names the player choices the press asks, in line order.
    - `…, choosing cut 2 blue` names one option, matched without regard to case.
  - **The cut is written as a block of five options.**
    - Three are the options §19.A names: −2 blue, −2 red, −1 of each.
    - Two are 1-cube cuts that keep a single-colour 2-cube product at 1 cube. That is R3's `min(2, cost − 1)`.
    - Each option's `Only if` lines encode "each colour at 0 or more, the total at 1 or more" without a sum: for example, "blue cost more than 1, and blue cost more than 2 or red cost more than 0".
    - No printed product is cheap enough to reach the 1-cube options, so their example sets a cost with a Given and says so.
  - **The cut stays on a Launched product.** Only Pivot clears it, and Greenlight sets it again (R3). Nothing in Operations reads it.
  - **Names.**
    - Counts: `blue cut`, `red cut`.
    - Values: `blue need`, `red need`.
    - Flags: `leading software`, `leading hardware`, `stalled`, `fully led`, `efficient in ops`.
    - The game number `license`.
    - Option labels: `Cut 2 blue`, `Cut 2 red`, `Cut 1 of each`, `Cut 1 blue`, `Cut 1 red`.
  - **`whose` becomes a list,** optional on all three group kinds (1b-2's P17). Only one `whose …` is read today; slice 4 adds flag filters to the same list.
  - **Domain Expertise reads every product in operations,** since every Ops product is Active until slice 4 (ruling 5). Slice 4 adds "that is not offline".

**Tech Stack:** TypeScript (strict), Bun, Vitest + happy-dom.

**Spec:** `docs/superpowers/specs/2026-10-16-startup-slice-3-tiers-tags-leads-design.md` is binding, and its "Builder-check rulings" R1–R8 win where they differ from its body. It sits under `docs/superpowers/specs/2026-10-16-startup-simulator-overview-design.md`, also binding, especially its anti-goals: hidden information leaking, an auto-player that hides a rule, and Startup words in shared code. The evidence is `builder-check-startup-3.md` (C1–C11), in the session scratchpad. Every rule and number comes from `kinnet-studio/suwa`'s `rulebook.md` (Version 6.0): §3 Tech Tiers & Leads, §6 Greenlight, Launch, Reassign and Pivot, §7.B, §14.B.2, §19.A, §20.B.1, §20.C, §20.F, and rulings 3, 5, 8, 9, 18, 21 and 25. The Rust engine (`suwa/crates/core/src/project_rules.rs`, `resolvers/product_actions.rs`) settles meaning only where those are silent.

## Global Constraints

- **Controller amendment (pre-flight, after plan 1b-2 was built).** The scan is in the plan's SDD workspace
  (`preflight.md` §3, rulings P1–P21); each task's brief carries its rulings. In short:
  - **P1 (Task 3).** A player choice's clause is judged with the candidate as the move's player
    (`{ ...info, by: seat }`, subject player = seat); the effect runs with the press's own move and subject.
  - **P2 (Task 6).** Before Task 6, probe plan 1b-3's `countParts` on a product with the cut counts; if it shows a second
    `Blue …/…` part, the counts are named `cut blue cubes`/`cut red cubes` so the page shows `Blue 3/6 +2 cut`.
  - **P3.** The rules hold 55 examples; Task 6 ends at 72 and Task 7 at 84 (`startup-simulator.test.ts`,
    `designer-page.test.tsx`'s name and text, README).
  - **P4, P5, P19 (Task 2).** Reshaping `CardGroup` changes five existing test lines (`refs.test.ts` 994, 996, 1000, 1003;
    `compile-util.test.ts` 174) and `library/flow-phrases.ts`; the filter's `above` reads `numberIfAny` (an absent number
    fails the filter; a present non-number throws).
  - **P6, P7 (Task 1).** A Potter's `red left` reads 0 through the runtime (not a throw); the compile check uses `red cut`.
  - **P8, P9, P12, P13, P14, P21 (Tasks 3–4).** An `If` line holding a choice gets the "can't sit inside If" message; a
    choice named with a value outside its options is refused with its prompt (only absent/null is filled in); choices are
    allowed on one-card picks and on buttons that pick nothing; the hidden-card message lands on the choice line and its
    guard; the prompt strips `they ` and ` to that player`; an `Only if` after an option is refused.
  - **P10 (Task 7).** The money check reads the worked salary, so `keepsTheRules` gets a runtime.
  - **P11, P16, P20 (Tasks 6, 8).** The auto-player judges complete by the need, not the cost; a refused Launch doesn't
    drop the turn's action; choices go on the move before the view check.
  - **P15.** Task 7 deletes the README's "until Tier 2/3, growth cards are drafted but can't be greenlit"; re-read the
    README after plan 1b-3's edits.
  - **P17, P18.** `GUILD_GAME`'s Tower has 2 copies; `TIPPING`'s button goes before `A player may stop.`

- **Hard constraints (verbatim):**
  - Protected files must not change: `src/engine/core/game-state.ts`, `src/engine/core/flow.ts`, `src/engine/core/game-engine.ts`, and anything under `src/pages/hearts-demo/**`.
  - The core is pure: no pixi/react/DOM imports in `src/engine/core/**`, no `Math.random` or `Date.now`.
  - State stays Json-only, with new keys under `lang:*`.
  - No Startup Simulator words in shared code. The banned words are plan 1b-2's list plus slice 3's:
    - 1b-2's list: capital, talent, agency, junior, backlog, growth, crash, vaporware, university, bench, ideation, startup, research, recruit, product, job market, idea pool, "seed" meaning a deck/market/card/product, greenlight, launch, pivot, salary, payroll, project, cube, ops, operations, onboarding, scouting, source/sourcing in the game sense, market share;
    - slice 3's: **tag, lead, license, tier, stall, sector, expertise**, in every form: tags, leads, leading, licence, licenses, tiers, stalled, stalling, sectors.

    "Lead" is banned in its plain sense too ("leads to"), so write "goes to". These words stay in the rules text and its test.
  - Hearts, Color Match, Venom and Rent Day pass unchanged; `bun run typecheck` clean; full `bun run test` passes.
  - Every number in the rules text comes from the rulebook; examples state where (section or ruling).
- **Where the banned words may appear:**
  - `src/games/startup-simulator.rules` and `src/games/startup-simulator.test.ts`;
  - `src/pages/designer/designer-page.test.tsx`, `playtest-fitted.test.tsx` and `tableaux.test.ts`;
  - `src/pages/designer/samples.ts`, the README and docs.

  Anywhere else under `src/engine`, `src/pages` or `src/utils` they are banned, comments and test files included. `src/engine/core/lang/testing.ts` counts as shared. Fixtures use general words: guild, jobs, hands, workshop, stash, hall, scrap, crew, coins, moves, fee, mark, wants, mood, size, trim.
- **State and moves.**
  - No new `state.data` keys and no new keys in a card's `data` from shared code.
  - A press may carry `choices: (string | null)[]` (Json).
  - Every new field of `CompiledGame`, `PhraseRef` args, `Subject`, `ActionView` and `PickCardView` is Json. An optional field is left out, never set to `undefined`.
- **Example counts.** Read the count the committed `startup-simulator.rules` has when this plan starts. It is 25 today, and 54 if plan 1b-2 lands as planned; call it N₀. Task 6 ends at N₀ + 17: it removes one example and adds 18. Task 7 ends at N₀ + 29.
- **Commands.**
  - Single file: `bunx vitest run <path>`. Full suite: `bun run test`. Types: `bun run typecheck`.
  - Before Task 1, record `BASE=$(git rev-parse HEAD)` and run `bun run test` once to get the passing count.
- **No new dependencies.**
- **Existing tests.**
  - Tasks 1–5 change no existing test line, with these exceptions, each named in its task:
    - the pinned `VOCAB_TYPES` list in `refs.test.ts` (Task 2);
    - plan 1b-2's two `CardGroup` expectations in `refs.test.ts` (Task 2).

    They may add fixtures to `testing.ts` and append tests.
  - Tasks 6–7 change only:
    - `src/games/startup-simulator.test.ts`: the example count, a compile check, and the auto-player's greenlight (Task 6) and payroll read (Task 7);
    - the Startup count in `designer-page.test.tsx`;
    - the README.
  - Task 8 changes only the long runs in `startup-simulator.test.ts`.
  - If any other existing test fails, stop and report it instead of changing it.
- **Style and commits.**
  - 2-space indent, single quotes, chainable registrars, comments that say why.
  - Commit prefixes `feat(lang):` and `feat(games):`. Stage files by path, never `git add -A`.
  - TDD every task: failing test → watch it fail → implement → pass → `bun run typecheck` → commit.
  - A bullet marked "(guard: passes before and after)" is a regression guard that passes before its task is built.

## Review Focus

- **A choice nobody can answer.**
  - The case: no player meets a choice line's clause, or no option of a block holds.
  - Expected: the choice is not asked and its line does nothing.
  - So a rule that must refuse says so in an `Only if`, as the Greenlight does for "no one provides the Tag".
  - Tests: Task 3 (`NOGUARD`) and Task 4 (an option-less card); in the game, Task 6's "no one provides the Tag".
- **A press that names a choice wrongly.**
  - The cases: the presser themselves, a seat that is out, a seat that doesn't qualify, a number instead of a seat, a label from another block or with other capitals.
  - Expected:
    - a wrong name is refused with the prompt, and nothing changes;
    - a label's capitals don't matter;
    - a value for a choice the press doesn't ask is ignored.
  - Tests: Tasks 3 and 4.
- **Undo and replay of a press whose choice was filled in.**
  - The move carries no `choices`, yet replaying the log rebuilds the same state, with the same payee.
  - Tests: Task 3; in the game, Task 8.
- **A blank cell compared with a blank cell.**
  - A card that requires nothing must not be "provided" by a card that provides nothing (the expansion Tier 3s have no Tag).
  - Expected: an absent value matches nothing, on either side.
  - Test: Task 2.
- **The view and the engine on a card whose only missing piece is a choice.**
  - The view says the card is allowed and lists the choice.
  - Pressed with no choice, it is refused with the prompt; pressed with the view's first option, it is accepted.
  - Tests: Task 5; in the game, Task 8 (through the view).

## Assumed from earlier plans (check before Task 1)

Plans 1a-1, 1a-2 and 1b-1 are built. Plan 1b-2 is being built as this plan is written. Before Task 1, check each item below against the code. If one is missing or differs, stop and report it.

- **1b-1 (built):**
  - `DeclaredAction.pick` and `.cost`;
  - in `compile-phase.ts`:
    - `readRuleBody(node, ctx)`, private, returning `{ conditions, effects, cost, badCost }`;
    - `compileAction`, and `compileCardPick`, whose one-card lines get `{ inMove: true, card: true }` and whose set lines get `cards: true`;
    - `reportHiddenCardReads`;
  - `readsPressCard` in `compile-util.ts`;
  - in `declared-actions.ts`: `aboutPress` and `choose` (private), `declaredActionHandler`, `faceDownReady`;
  - in `board-view.ts`:
    - `allowedNow`, `pickVerdict`, `cardPickView` and `actionViews` (private);
    - `PickCardView = { id; name; allowed }`, `ActionView.cards`, `readSeatExtras`;
  - the example actions `{player} {cardaction} {cardlist}` and its `to`/`from` forms;
  - `examples.ts`'s When step calls `runtime.act` and then `engine.dispatch`.
- **1b-2 Task 1:**
  - `HOLDER_KEY = 'lang:on'` and `cardsOn(state, holderId)`, the only reader of "the cards on it";
  - the zone mark `, where every card is on a card` (`ZoneSpec.onCards: 'every'`);
  - the effects `it goes to {zone}, on the target card`, `every card on it goes to {zone}` and `every card on it is {cardflag}`;
  - the Given `{card} in {zone} has {cardlist} on it`. It adds the cards after what is there, and lives in `attach-phrases.ts` as built;
  - the Expect `… has no cards on it`;
  - `CREW_GAME` in `testing.ts`;
  - the check after every change.
- **1b-2 Task 2:**
  - `cardNumber(env, card, name)` in `support.ts`;
  - effects `it loses its {attribute}`, `its {attribute} go(es) up by its {attribute}[, up to its {attribute}]`, `it is {cardflag}`, and `it is not {cardflag}` (removes the key, P9);
  - conditions `its {attribute} is/are at least its {attribute}` and `its {attribute} is/are more than {int}`.
- **1b-2 Task 3:**
  - in `types.ts`: `PhraseKind` `'value'`, `ValueFn`, `WorkedValue`, `CompiledGame.worked`, and `PhraseEnv.workedValue`/`workedFlag`;
  - `runtime.workedValue(state, cardId, name)` and `runtime.workedFlag(state, cardId, flag)`, with one loop guard keyed by card and name (P4);
  - in `support.ts`: `cardValueOf`, `cardHasFlag`, `mustBeKept`;
  - `readCardSections` and `compileWorked`, with the check `This line is about “X”, but it is under H:.`;
  - `readCondition` exported from `compile-phase.ts`;
  - the value phrases `{cardclass}'s X is its Y`, `{cardclass}'s X is {int}` and `a/an {cardflag} card's X is {int}`, the last reading worked flags (P4's test);
  - `vocabFrom({ worked })`;
  - `fixtureEnv` taking `workedValue` and `workedFlag`.
- **1b-2 Task 4:**
  - `CardGroup` with `whose: { attribute; above } | null` (P17);
  - the `CARDGROUP` type (`'cardgroup'`);
  - in `support.ts`: `cardsIn(env, group)` and `totalOf`;
  - the `for each` frame;
  - `unmetNeed`'s group needs;
  - `runtime.readsCard` counting a `picked` or `on it` group as reading the press's card (P8);
  - `registerTotalPhrases`, placed after `registerCardValuePhrases`.
- **1b-2 Tasks 7–8 (the rules text),** whose exact lines this plan edits:
  - the Board zones `development`, `operations`, `development team` (`'every'`) and `ops team`, and `Cards can be onboarding.`;
  - the greenlight button, with `    Only if the card is a Tier 1 card.`;
  - the two reassign buttons, as plan 1b-2 Task 7 writes them;
  - the example "only Tier 1 products are greenlit until Leads and Tags arrive";
  - the sections `Blue output:`, `Red output:`, `Blue team output:`, `Red team output:` and `Feature complete:`;
  - the Launch, Pivot and Engine/Commit lines as plan 1b-2 Task 8 writes them;
  - `Cards can have blue cubes, red cubes, new blue cubes and new red cubes.`;
  - the README Startup paragraph.
- **1b-2 Task 9 (the long runs):**
  - `playGame` and `playTurn`, with the auto-player as 1b-2 Task 9 and P6 describe it, including "greenlight the first Tier 1 backlog card";
  - `keepsTheRules` with its money, Board and cube checks ("no card's blue cubes exceed its blue cost");
  - the tally and `happenings` keys (P5), `Run.until` (P12), the view checks for sets and targets (P12), and the word-check command.

---

### Task 1: Phrases about the card a rule is about, and value lines that subtract

**Files:**
- Create: `src/engine/core/lang/library/card-subject-phrases.ts` (`registerCardSubjectPhrases`, in `REGISTRARS` right after `registerTotalPhrases`); modify `library/index.ts`
- Modify: `src/engine/core/lang/compile.ts` (the "about another value" check of `compileWorked`)
- Test: `src/engine/core/lang/library/card-subject-phrases.test.ts` (new), `src/engine/core/lang/compile.test.ts`

**Interfaces:**
- Consumes 1b-2: `cardNumber`, `cardHasFlag`, `cardsOn`, kind `value`, `compileWorked`.
- **Conditions** (all `needsCard`, about `cardById(state, cardOf(env))`):
  - `it is {cardclass}`, `it is not {cardclass}`: `matchesCard`.
  - `it is not {cardflag}`: `!cardHasFlag`.
  - `its {attribute} is {int}`: `cardNumber(…) === n`.
  - `it is in a {perzone}`, `it is in an {perzone}`: the card's zone is that per-player zone of any seat (`zoneInfo`).
  - `some card on it is {cardflag}`, `no card on it is {cardflag}`: over `cardsOn(state, it)`, through `cardHasFlag`.
- **Values** (kind `value`):
  - `a card's {attribute} is its {attribute}`: the card's `cardNumber` under the second name. A card that lacks it throws `This card has no …`.
  - `a card's {attribute} goes down by its {attribute}`: the value so far less the second number. A null value so far stays null. There is no floor, since a floor would hide a cut larger than the cost.
- **`compileWorked`:** the name a number line is about ends at ` is`, ` are` or ` goes down by `.

- [ ] **Step 1: Write the failing tests.** In the new test file, `SUBJECT` is `CREW_GAME` with `  Cards can have red cut.` added after `  Cards can be tired.`, and these sections appended:

```text
Red left:
  A card's red left is its red need.
  A card's red left goes down by its red cut.

Working:
  Only if it is a red card.
  Only if it is not tired.

Busy:
  Only if some card on it is working.
```

  Phrases run with `runPhrase` about a card, and values and flags through `createEngine(…).runtime`, on a `SUBJECT` state with a Vase in `workshop-p0` and Potters 1 and 2 in `crew-p0` on it:
  - **Classes.**
    - `it is a red card` holds for a Potter and not for a Smith.
    - `it is not a gold card` holds for a Potter.
    - `it is a Potter card` holds for a Potter.
  - **Flags.**
    - `it is not tired` holds for an untired Potter. Once `tired: true` is set on it, it doesn't.
    - A Potter is `working`, and a tired one isn't.
  - **Numbers.** `its pay is 1` holds for the Vase and not for a Statue (pay 2).
  - **Zones.**
    - `it is in a crew` holds for a Potter in `crew-p1` too.
    - It doesn't hold for a Potter in the hall.
    - `it is in an idle` reads the "an" form.
  - **On it.**
    - `some card on it is working` holds for the Vase.
    - With both Potters tired it doesn't, and `no card on it is working` does.
    - The Vase is `busy` exactly when some Potter on it works: a worked flag read through another.
  - **Values.**
    - The Vase's `red left` is 2.
    - With `red cut: 1` set on it, it is 1.
    - A Potter's `red left` throws `This card has no red need.`
  - **Needs.** `    Only if it is a red card.` under `A player may stop.` gives the needs-a-card message on its line.

  In `compile.test.ts`:
  - `SUBJECT` compiles with `[]`.
  - `game.worked['red left']` has 2 refs.
  - `  A card's gold left goes down by its red cut.` under `Red left:` gives `This line is about “gold left”, but it is under Red left:.` on its line.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/library/card-subject-phrases.test.ts src/engine/core/lang/compile.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** them and `bunx vitest run src/engine/core/lang src/games`, then `bun run test` and `bun run typecheck`. The four games must stay unchanged: the new `it is …` and `its … is …` conditions sit beside Rent Day's space phrases.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/library/card-subject-phrases.ts src/engine/core/lang/library/index.ts src/engine/core/lang/compile.ts \
  src/engine/core/lang/library/card-subject-phrases.test.ts src/engine/core/lang/compile.test.ts
git commit -m "feat(lang): what kind of card it is, a number or zone it has, a flag on the cards on it, and a value that goes down by another"
```

---

### Task 2: Comparing two cards

**Files:**
- Modify: `src/engine/core/lang/types.ts` (`CardFilter`; `CardGroup.whose`)
- Modify: `src/engine/core/lang/refs.ts` (`CARDFILTER`; `CARDGROUP` reads `whose {cardfilter}`)
- Modify: `src/engine/core/lang/library/support.ts` (`passes`; `cardsIn` uses it)
- Modify: `src/engine/core/lang/compile-util.ts` (needs and `readsPressCard` for filters), and `runtime.ts` wherever P8 counts groups
- Create: `src/engine/core/lang/library/compare-phrases.ts` (`registerComparePhrases`, right after `registerCardSubjectPhrases`); modify `library/index.ts`
- Modify: `src/engine/core/lang/testing.ts` (`GUILD_GAME`)
- Test: `src/engine/core/lang/refs.test.ts`, `src/engine/core/lang/compile-util.test.ts`, `src/engine/core/lang/library/compare-phrases.test.ts` (new)

**Interfaces:**
- **`types.ts`:**

```ts
/**
 * One test a card of a group passes: a number above a whole number, a value equal to one written, or equal to a value of the card
 * a rule is about ('the card' a press moves, or 'it'). A card without the value never passes an equality.
 */
export type CardFilter =
  | { attribute: string; above: number }
  | { attribute: string; is: Json }
  | { attribute: string; sameAs: { of: 'the card' | 'it'; attribute: string } };
export type CardGroup =
  | { kind: 'in'; zones: ZoneRef[]; whose?: CardFilter[] }
  | { kind: 'on it'; whose?: CardFilter[] }
  | { kind: 'picked'; whose?: CardFilter[] };
```

- **`refs.ts`:**
  - **`CARDFILTER`**, type `'cardfilter'`, label `'[test]'`, joins `VOCAB_TYPES`. It reads:
    - `{attribute} is more than {int}` and `{attribute} are more than {int}`;
    - `{attribute} is the card's {attribute}`;
    - `{attribute} is its {attribute}`;
    - `{attribute} is {int}`;
    - `{attribute} is <value>`. The value must be one some card has under that attribute (`vocab.cardValues`, compared as `canon` does) and is kept as the table writes it. Any other value is the error `` `No card has “${text}” as its ${attribute}.` ``
    - A misnamed attribute is explained as `{attribute}` explains it.
  - **`CARDGROUP`** reads an optional `whose {cardfilter}` after `the cards in {zones}`, `the cards on it` and `the picked cards`, as a one-item `whose`. With none, `whose` is left out.
- **`support.ts`:**
  - `passes(env: PhraseEnv, card: CardState, filters: CardFilter[]): boolean`.
    - `above` reads `cardNumber`, as 1b-2 built it.
    - `is` and `sameAs` read `cardValueOf` on both sides. A null on either side fails.
    - Text is compared with `canon`, numbers with `===`.
  - `cardsIn` keeps the cards that pass `group.whose ?? []`.
- **`compile-util.ts`:**
  - A `CardFilter` anywhere in a line's args, as `{cardfilter}` or in a group's `whose`, needs something from the line's context:
    - with `sameAs.of === 'the card'` it needs `ctx.inMove`, and gives the needs-a-move message;
    - with `'it'` it needs `ctx.card`, and gives the needs-a-card message.
  - `readsPressCard`, and the group check P8 added for `runtime.readsCard`, count such a filter as reading the press's card.
- **`compare-phrases.ts`** (the filter about the candidate card, "the card" or "it" as the filter says):
  - Condition `they have a card in {zones} whose {cardfilter}` (`needsPlayer`) and its negation `they have no card in {zones} whose {cardfilter}`.
  - Condition `some player has a card in their {perzone} whose {cardfilter}`:
    - any seat still in (`playersIn`), the subject included;
    - "their" is that seat (`zoneIdFor(perzone, seat)`).
  - Condition `another player has a card in their {perzone} whose {cardfilter}` (`needsPlayer`): the same, without the subject.
  - Condition `the card has no {attribute}` (`needsMove`) and `it has no {attribute}` (`needsCard`): `cardValueOf(…) === null`.
  - Effect `every card on it whose {cardfilter} goes to {zone}` (`needsCard`): `relocate` of the passing cards of `cardsOn(it)`, in that order.
- **`testing.ts`:** `GUILD_GAME`. Tasks 3–5 add buttons before `A player may stop.`.

```ts
/**
 * A card game of jobs that want a mark another job makes. Players start jobs from their stash in their workshop, hire hands from the
 * hall onto a job, and finish a job, which sends a grumpy hand to the scrap and the rest back to the hall. A Vase or Bowl wants no mark
 * and a Tower makes none.
 */
export const GUILD_GAME = [
  'Game: Guild', 'Players: 2 to 4', '  Each player has 9 coins that everyone can see.', '  Each player has 2 moves each turn.',
  '  Players pay with coins.', '  The game has a fee of 2.', '',
  'Cards:', '  A deck called jobs, starting in the pile:',
  '    | name   | mark  | wants | red size | gold size | copies |', '    | Vase   | clay  |       | 3        | 0         | 2      |',
  '    | Bowl   | clay  |       | 1        | 1         | 2      |', '    | Statue | stone | clay  | 2        | 4         | 2      |',
  '    | Tower  |       | stone | 0        | 5         | 1      |',
  '  A deck called hands, starting in the hall:', '    | name   | craft | mood   | copies |', '    | Potter | red   | calm   | 2      |',
  '    | Smith  | gold  | grumpy | 1      |',
  '  Cards can have red trim and gold trim.', '',
  'Table:', '  The pile is a pile in the center that no one can see.', '  The hall is a row in the center that everyone can see.',
  '  The scrap is a row in the center that everyone can see.', '  Each player has a stash row that only they can see.',
  '  Each player has a workshop row that everyone can see.',
  '  Each player has a crew row that everyone can see, where every card is on a card.', '',
  'Setup:', '  Deal 2 cards from the pile to each stash.', '',
  'Phase: working', '  Players take turns.',
  '  A player may start a card in their stash.', '    Then:', '      Move it to their workshop.',
  '  A player may hire a card from the hall to a card in their workshop.', '    Then:', '      It goes to their crew, on the target card.',
  '  A player may finish a card in their workshop.', '    Then:', '      Every card on it whose mood is grumpy goes to the scrap.',
  '      Every card on it goes to the hall.', '      Move it to the scrap.',
  '  A player may stop.', '    Then:', '      Their moves go back to 0.',
  '  When they have less than 1 move:', '    The turn passes to the left.', '',
  'End:', '  The game ends when the pile is empty.', '  The highest score wins.',
].join('\n');
```

- [ ] **Step 1: Write the failing tests.**

  In `refs.test.ts`, with `vocabFor(compileGame(GUILD_GAME).game)`:
  - `mark is the card's wants` gives `{ attribute: 'mark', sameAs: { of: 'the card', attribute: 'wants' } }`.
  - `mark is its wants` gives `of: 'it'`.
  - `mood is Grumpy` gives `{ attribute: 'mood', is: 'grumpy' }`.
  - `red size is 3` gives `is: 3`.
  - `red size is more than 1` gives `above: 1`.
  - `mood is glum` gives `No card has “glum” as its mood.`
  - `the cards in their workshop whose mark is clay` gives `{ kind: 'in', zones: [<their workshop>], whose: [{ attribute: 'mark', is: 'clay' }] }`.
  - `the cards on it whose mood is grumpy` gives `{ kind: 'on it', whose: [{ attribute: 'mood', is: 'grumpy' }] }`.
  - `the cards on it` gives `{ kind: 'on it' }` (guard: passes before and after).
  - **Changed lines.**
    - The pinned `VOCAB_TYPES` list gains `['cardfilter', '[test]']`.
    - Plan 1b-2's two `CardGroup` expectations change: `whose: null` becomes no `whose` key, and `whose: { attribute: 'skill', above: 1 }` becomes `whose: [{ attribute: 'skill', above: 1 }]`.

  In the new `compare-phrases.test.ts`, on a 3-player `GUILD_GAME` state:
  - **The arrangement.**
    - p0's workshop holds a Vase.
    - p1's workshop holds a Bowl and a Statue.
    - p2's workshop holds a Tower.
  - **Conditions are judged about a press.** `env.move` is a card move of the named card from p0's stash.
  - **Have.**
    - Moving a Statue (wants clay): `they have a card in their workshop whose mark is the card's wants` holds about p0 and p1, and not about p2.
    - Moving a Tower (wants stone): it holds about p1 (its Statue) and not about p0.
  - **Review Focus: blank against blank.** Moving a Vase (wants nothing), it holds about no seat, p2 included, although p2's Tower makes nothing.
  - **Have no.** `they have no card in their workshop whose mark is the card's wants` is its negation in each case above.
  - **Some player.**
    - `some player has a card in their workshop whose mark is the card's wants` holds for a Tower.
    - `another player has …` about p1 with a Tower doesn't: only p1 makes stone.
    - About p0 it does.
    - With p1 marked out, `some player has …` for a Tower doesn't hold.
  - **Has no.**
    - `the card has no wants` holds for a Vase and not for a Statue.
    - `it has no mark` about a Tower holds.
  - **Filters in a group.** `the total red size of the cards in their workshop whose mark is clay is 4` holds about p1 with a Vase added to p1's workshop. That is 3 + 1, and the Statue's stone mark is left out.
  - **Finishing a job.**
    - A Smith and a Potter are hired onto p0's Vase, then p0 finishes it.
    - The Smith is in the scrap, the Potter in the hall and the Vase in the scrap.
    - No `lang:on` is left.

  In `compile-util.test.ts`:
  - `    Only if they have a card in their workshop whose mark is the card's wants.` under `A player may stop.` gives the needs-a-move message on its line.
  - `whose mark is its wants` in a line about no card gives the needs-a-card message.
  - `readsPressCard` is true for a group of `they have a card in their workshop whose mark is the card's wants`, and false for `… whose mark is clay`.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/refs.test.ts src/engine/core/lang/compile-util.test.ts src/engine/core/lang/library/compare-phrases.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** them and `bunx vitest run src/engine/core/lang src/games`, then `bun run test` and `bun run typecheck`. The new `it has no {attribute}` sits beside Rent Day's `it has no {spaceattr}` and `it has no {spaceflag}`. If a board game's line or misspelling is now read differently, stop and report it: don't change its test.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/types.ts src/engine/core/lang/refs.ts src/engine/core/lang/library/support.ts src/engine/core/lang/compile-util.ts \
  src/engine/core/lang/runtime.ts src/engine/core/lang/library/compare-phrases.ts src/engine/core/lang/library/index.ts src/engine/core/lang/testing.ts \
  src/engine/core/lang/refs.test.ts src/engine/core/lang/compile-util.test.ts src/engine/core/lang/library/compare-phrases.test.ts
git commit -m "feat(lang): cards compared by a column with a value or with another card's column, in a player's own zones or anyone's, and blank cells that match nothing"
```

---

### Task 3: A chosen player in a press

**Files:**
- Modify: `src/engine/core/lang/refs.ts` (`theyForm`)
- Modify: `src/engine/core/lang/compile-util.ts` (`CHOICE_LINE`, `CHOOSE_ONE_LINE`, `LineCtx.choices`, the misplaced-choice messages in `matchEffectLine`)
- Create: `src/engine/core/lang/compile-choice.ts` (`readChoiceLine`)
- Modify: `src/engine/core/lang/compile-phase.ts`:
  - `readRuleBody` reads choice lines when `ctx.choices`;
  - `compileAction` and `compileCardPick` set it;
  - `reportHiddenCardReads` covers choices.
- Create: `src/engine/core/lang/choices.ts`
- Modify: `src/engine/core/lang/types.ts` (`Subject.choices`; the `lang` comment), `src/engine/core/lang/runtime.ts` (`run`)
- Modify: `src/engine/core/lang/declared-actions.ts` (`choose` fills choices; `pressChoices`)
- Modify: `src/engine/core/lang/library/game-numbers.ts` (two phrases), `src/engine/core/lang/testing.ts` (`GUILD_GAME`'s `open` button)
- Test: `src/engine/core/lang/choices.test.ts` (new), `src/engine/core/lang/refs.test.ts`, `src/engine/core/lang/library/game-numbers.test.ts`

**Interfaces:**
- **`refs.ts`:** `theyForm(words: string): string`. It turns the first word of a clause about one player into the "they" form:
  - `has` → `have`, `is` → `are`, `does` → `do`;
  - any other word reverses `thirdPerson`: `-ies` → `-y`, `-(s|sh|ch|x|z|o)es` → stem, `-s` → stem.
- **`compile-util.ts`:**
  - **The lines.**
    - `CHOICE_LINE = /^(.+) to another player of their choice who (.+)$/i`.
    - `CHOOSE_ONE_LINE = /^they choose one:?$/i`.
  - **`LineCtx.choices?: boolean`** is true only for the lines of a button that picks a card, or picks nothing (no target, amount or player). Those `Then:` lines may ask for a choice.
  - **`matchEffectLine`** reports:
    - a line matching either pattern, anywhere it reaches: `Only the Then: lines of a button that picks a card, or nothing, can ask for a choice.`;
    - an `If …,` frame whose effect matches `CHOICE_LINE`: `A choice can't sit inside “If …,”: write its condition under it as an “Only if …” line.`
- **`compile-choice.ts`:** `readChoiceLine(node: OutlineNode, found: RegExpExecArray, at: number, ctx: LineCtx): PhraseRef`. It gives `{ kind: 'lang', phrase: CHOOSE_PLAYER, args: [at, guard, who, effect], line, text }`:
  - `effect` is ``matchLine('effect', `${found[1]} to that player`, node.line, { ...ctx, picked: true })``;
  - `who` is ``matchLine('condition', `they ${theyForm(found[2])}`, node.line, { ...ctx, player: true })``;
  - `guard: CondGroup[]` is the node's children read with `readCondition`. Any other child is `Under a choice, write only “Only if …” lines.`
  - `compile-choice.ts` and `compile-phase.ts` import each other (`readCondition` one way, `readChoiceLine` the other). Each uses the other's functions only while compiling, never while the module loads, which ES modules allow.
- **`compile-phase.ts`, `readRuleBody`:** with `ctx.choices`, a `Then:` child matching `CHOICE_LINE` is read by `readChoiceLine`. `at` counts the button's choices in line order, from 0.
- **`reportHiddenCardReads`:** a choice's guard groups and its `who` ref, read like an `Only if`, are reported the same way under a pick the presser may not see.
- **`types.ts`:** `Subject.choices?: (string | null)[]`, what a press filled in for each of its button's choices, in order.
- **`choices.ts`:**

```ts
export const CHOOSE_PLAYER = 'choose player';
export const CHOOSE_ONE = 'choose one';
/** A choice a press asks: `at` its place among the button's choices, `prompt` what to ask, `options` the seats or labels that answer it, in order. */
export type AskedChoice = { at: number; kind: 'player' | 'option'; prompt: string; options: string[] };
/** The button's choice refs, top-level `Then:` lines, in order of `at`. */
export function choicesOf(action: DeclaredAction): PhraseRef[];
/**
 * The choices a press asks, judged on `state` about the press: each choice whose guard holds and that has a candidate, in order.
 * A player choice's candidates are the seats still in, other than the presser, in seat order, for which `who` holds about them
 * (`{ ...subject, player: seat }`, with the press's `info`).
 */
export function askChoices(runtime: LangRuntime, action: DeclaredAction, state: GameState, info: MoveInfo | undefined, subject: Subject): AskedChoice[];
/**
 * One entry per choice of the button (`count`), from what the press named (`given`, anything): a choice asked with one option is filled
 * in; one named with a valid option takes it; one asked with several and named with none or a wrong one refuses the press with its
 * prompt. A choice not asked is null, whatever was named for it.
 */
export function fillChoices(asked: AskedChoice[], count: number, given: unknown): (string | null)[] | string;
```

  - **Prompts.** A player choice's prompt is `` `Pick who to ${doing} to: ${joinOr(options)}.` ``. `doing` is `secondPersonWords` of the effect's text, without its leading `they ` and trailing ` to that player`.
  - **Matching.** A player is matched exactly. A non-string value is wrong.
- **`runtime.ts`, `run`:** a `CHOOSE_PLAYER` ref runs its effect about `{ ...subject, picked: subject.choices[at] }` when that is a seat. Otherwise it changes nothing.
- **`declared-actions.ts`:**
  - **`choose`.** After the cost and `failedGroup`, a button with choices:
    - fills them with `fillChoices(askChoices(…), choicesOf(action).length, m.choices)`;
    - returns its refusal, or puts the result on `subject.choices`.

    A button without choices is untouched.
  - **`pressChoices(runtime: LangRuntime, state: GameState, move: Move): AskedChoice[] | string`.** The press of `move` up to its choices:
    - the refusal its button, pick, cost or `Only if` lines give;
    - else `askChoices`, or `[]` for a button with no choices.
- **`game-numbers.ts`:**
  - Effect `they pay the {gamenumber} to that player` (`needsPlayer`, `needsPick`, `needsPayment`): `transfer` to `thePick(env)`.
  - Condition `they have at least {int} times the {gamenumber} in {counter}` (`needsPlayer`).
- **`testing.ts`:** `GUILD_GAME` gains, before `  A player may stop.`:

```text
  A player may open a card in their stash.
    Only if one of:
      The card has no wants.
      Some player has a card in their workshop whose mark is the card's wants.
    Then:
      They pay the fee to another player of their choice who has a card in their workshop whose mark is the card's wants.
        Only if they have no card in their workshop whose mark is the card's wants.
      Move it to their workshop.
```

- [ ] **Step 1: Write the failing tests.**

  In `refs.test.ts`, `theyForm`:
  - `has a card` → `have a card`, `is ready` → `are ready` and `does well` → `do well`;
  - `owns a field` → `own a field`, `passes` → `pass` and `carries` → `carry`.

  In `game-numbers.test.ts`, with `fee` 2:
  - `they have at least 2 times the fee in coins` holds at 4 coins and not at 3.
  - `they pay the fee to that player` with `picked: 'p1'` moves 2 coins from p0 to p1.
  - In a button that picks no player, it gives the existing needs-a-pick message.

  In the new `choices.test.ts`, a 3-player `GUILD_GAME` engine, p0 to act. `open(card, extra = {})` is `{ type: 'open a card in their stash', by: 'p0', cardId: card, ...extra }`.
  - **Compiled.**
    - `GUILD_GAME` compiles with `[]`.
    - The open button's first effect is `{ kind: 'lang', phrase: 'choose player' }`, with `at` 0, one guard group and `who.phrase` `they have a card in {zones} whose {cardfilter}`.
    - Its `effect.phrase` is `they pay the {gamenumber} to that player`.
  - **One provider.**
    - The arrangement: p1's workshop holds a Vase, p0's stash a Statue.
    - `open(statue)` is accepted: p0 has 7 coins, p1 11 and p2 9.
    - `pressChoices` gives `[{ at: 0, kind: 'player', prompt: 'Pick who to pay the fee to: p1.', options: ['p1'] }]`.
  - **Two providers.**
    - The arrangement adds a Bowl to p2's workshop.
    - `open(statue)` is refused with `Pick who to pay the fee to: p1 or p2.`, and the state is unchanged.
    - `open(statue, { choices: ['p2'] })` is accepted, and p2 has 11.
  - **Review Focus: wrong names.**
    - With two providers, `choices: ['p0']`, `['p3']`, `[5]` and `['P2']` are each refused with the prompt.
    - With p2 marked out, `open(statue)` is filled in with p1.
  - **Own provider.**
    - The arrangement: p0's workshop holds a Bowl, p1's a Vase.
    - `open(statue, { choices: ['p1'] })` is accepted, and no one is paid: the guard fails, and the named value is ignored.
  - **No wants.** `open(vase)` pays no one.
  - **No provider.** With no clay anywhere, `open(statue)` is refused with `the card has no wants or some player has a card in their workshop whose mark is the card's wants`.
  - **Review Focus: nobody can answer.**
    - `NOGUARD` is `GUILD_GAME` without the open button's `Only if one of:` block and its two lines.
    - With no clay anywhere, `open(statue)` is accepted, nobody is paid, and the Statue is in `workshop-p0`.
  - **Review Focus: undo and replay.**
    - With one provider, `open(statue)` is accepted.
    - `engine.undo()` gives back the state before it.
    - A fresh engine given `loadLog(engine.getLog())` equals the engine's state: p1 was paid with no `choices` on the move.
  - **Misplaced choices,** each reported on its line with the message above:
    - a choice line under `When they have less than 1 move:`;
    - one in a card move's `Then:`;
    - one in `A player may tip another player.`'s `Then:`;
    - `If they have no card in their workshop, they pay the fee to another player of their choice who has a card in their workshop.`;
    - `Pay 1 coin.` indented under a choice line gives `Under a choice, write only “Only if …” lines.`
  - **Misnamed.** `… who has a card in their workshp whose …` gives the zone's misnamed message.
  - **Hidden.** `A player may peek a card in the pile.` with the open button's `Then:` lines gives the hidden-card message (1b-1's) on the choice line.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/choices.test.ts src/engine/core/lang/refs.test.ts src/engine/core/lang/library/game-numbers.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** them and `bunx vitest run src/engine/core/lang src/games`, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/refs.ts src/engine/core/lang/compile-util.ts src/engine/core/lang/compile-choice.ts src/engine/core/lang/compile-phase.ts \
  src/engine/core/lang/choices.ts src/engine/core/lang/types.ts src/engine/core/lang/runtime.ts src/engine/core/lang/declared-actions.ts \
  src/engine/core/lang/library/game-numbers.ts src/engine/core/lang/testing.ts src/engine/core/lang/choices.test.ts \
  src/engine/core/lang/refs.test.ts src/engine/core/lang/library/game-numbers.test.ts
git commit -m "feat(lang): a line that pays another player of the presser's choice who qualifies, filled in when one does and asked for when several do"
```

---

### Task 4: Choosing among options in a press

**Files:**
- Modify: `src/engine/core/lang/compile-choice.ts` (`readChoiceBlock`), `src/engine/core/lang/compile-phase.ts` (`readRuleBody` reads blocks)
- Modify: `src/engine/core/lang/choices.ts` (options in `askChoices`), `src/engine/core/lang/runtime.ts` (`run`), `src/engine/core/lang/testing.ts` (`GUILD_GAME`'s `trim` button)
- Test: `src/engine/core/lang/choices.test.ts`

**Interfaces:**
- **`choices.ts`:** `export type ChoiceOption = { label: string; conditions: CondGroup[]; effects: PhraseRef[] }`. `label` is as written, without its colon.
- **`compile-choice.ts`:** `readChoiceBlock(node: OutlineNode, at: number, ctx: LineCtx): PhraseRef` gives `{ kind: 'lang', phrase: CHOOSE_ONE, args: [at, guard, options], line, text }`.
  - **Its children.** A child is either an `Only if` line or `Only if one of:` block, which joins `guard`, or an option: a line ending in `:` whose children are `Only if` lines (its `conditions`) and effect lines (`matchEffectLine`, with `ctx`).
  - **Problems,** each on its line:
    - fewer than two options: `Give “They choose one:” two or more options, each a line ending in “:” with its lines under it.`;
    - two labels equal by `canon`: `` `Two options here are both called “${label}”.` ``;
    - any other child: `Under “They choose one:”, write its “Only if …” lines, then each option as a line ending in “:”.`;
    - a choice inside an option: `A choice can't sit inside another choice.`
- **`readRuleBody`:** with `ctx.choices`, a `Then:` child matching `CHOOSE_ONE_LINE` is read by `readChoiceBlock`. Choice lines and blocks share one `at` sequence.
- **`askChoices`:**
  - A block whose guard holds asks for the options whose conditions all hold (`failedGroup === null`), with their labels as written.
  - Its prompt is `` `Choose one: ${joinOr(labels)}.` ``
  - A label is matched by `canon` and filled in as written.
- **`run`:** a `CHOOSE_ONE` ref runs the effects of the option whose label is `subject.choices[at]`, in order, about the same subject and move. With none, it changes nothing.
- **`reportHiddenCardReads`:** an option's condition groups are covered too.
- **`testing.ts`:** `GUILD_GAME` gains, before `  A player may stop.`:

```text
  A player may trim a card in their workshop.
    Then:
      They choose one:
        Only if it is not a Tower card.
        Trim 2 red:
          Only if its red size is more than 1.
          It gains 2 red trim.
        Trim 2 gold:
          Only if its gold size is more than 1.
          It gains 2 gold trim.
        Trim 1 of each:
          Only if its red size is more than 0.
          Only if its gold size is more than 0.
          It gains 1 red trim.
          It gains 1 gold trim.
```

- [ ] **Step 1: Write the failing tests** (appended to `choices.test.ts`). `trim(card, extra = {})` is the trim press by p0.
  - **Compiled.** The trim button's effect is a `choose one` ref:
    - `at` 0, one guard group;
    - labels `['Trim 2 red', 'Trim 2 gold', 'Trim 1 of each']`;
    - condition counts `[1, 1, 2]` and effect counts `[1, 1, 2]`.
  - **Several valid.**
    - `trim(statue)`, with sizes 2 and 4, is refused with `Choose one: Trim 2 red, Trim 2 gold or Trim 1 of each.`
    - `trim(statue, { choices: ['trim 2 GOLD'] })` is accepted: `gold trim` 2, and no `red trim` key.
  - **Review Focus: wrong names.** `['Trim 3']` and `['p1']` are refused with the prompt.
  - **Filled in.**
    - `trim(vase)` (3/0) gives `red trim` 2.
    - `trim(bowl)` (1/1) gives 1 and 1.
  - **Guard.** `trim(tower)` is accepted with no trim.
  - **Review Focus: no valid option.** A Vase with `red size` set to 1 is accepted, and nothing changes but the press.
  - **One sequence.**
    - `BOTH` is `GUILD_GAME` with the trim block, its three options unchanged, added to the open button's `Then:` before `Move it to their workshop.`.
    - Its choices are `at` 0 (the payee) and 1 (the trim).
    - With two providers, `open(statue, { choices: ['p2', 'Trim 1 of each'] })` pays p2 and trims 1 and 1.
    - `open(statue, { choices: [null, 'Trim 1 of each'] })` is refused with the payee prompt.
  - **Problems.** Each of these gives its message on its line:
    - a block with one option;
    - two `Trim 2 red:` options;
    - `Pay 1 coin.` directly under `They choose one:`;
    - a choice line inside an option;
    - `They choose one:` under `When they have less than 1 move:`.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/choices.test.ts`. Expected: FAIL (the new tests).
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** it and `bunx vitest run src/engine/core/lang src/games`, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/compile-choice.ts src/engine/core/lang/compile-phase.ts src/engine/core/lang/choices.ts src/engine/core/lang/runtime.ts \
  src/engine/core/lang/testing.ts src/engine/core/lang/choices.test.ts
git commit -m "feat(lang): a block of options a press chooses one of, each with its own Only if lines, filled in when only one holds"
```

---

### Task 5: What the view and the examples see of choices

**Files:**
- Modify: `src/engine/core/lang/board-view.ts` (`ChoiceView`, `PickCardView.choices`, `ActionView.choices`, the verdicts, `readSeatExtras`)
- Modify: `src/engine/core/lang/declared-actions.ts` (`namedChoices`)
- Modify: `src/engine/core/lang/compile-example.ts` (the choosing frame), `src/engine/core/lang/examples.ts` (When steps that name choices)
- Test: `src/engine/core/lang/board-view.test.ts`, `src/engine/core/lang/compile-example.test.ts`, `src/engine/core/lang/examples.test.ts`

**Interfaces:**
- **`board-view.ts`:**

```ts
/**
 * A choice a press asks, as the view shows it: `at` is its place in the move's `choices`, `prompt` what to ask, and each value that
 * may answer it with the engine's verdict on the press given that value and every other choice's first option.
 */
export type ChoiceView = { at: number; prompt: string; options: { value: string; allowed: true | string }[] };
```

  - **Where choices show.**
    - `PickCardView` gains `choices?: ChoiceView[]`. It is present only when the press of that card asks a choice: the card alone, or the card with its target in `onto.targets`.
    - `ActionView` gains `choices?: ChoiceView[]` for a button that picks nothing, judged for the bare press.
  - **The verdicts.**
    - Each press is asked of the engine with `choices` filled from `pressChoices`: every asked choice at its first option, null elsewhere.
    - So a card whose only missing piece is a choice is allowed (R1).
    - `allowedNow`'s pick argument gains `choices?: (string | null)[]`.
  - **Hidden cards.** A card the seat can't see gets no `choices`. Its verdict stays `faceDownVerdict`'s.
  - **`readSeatExtras`** accepts `choices` on both shapes and rejects a malformed one: `at` not a number, a missing `prompt`, or an option without `value` or `allowed`.
- **`declared-actions.ts`:** `namedChoices(runtime: LangRuntime, state: GameState, move: Move, players: string[], option: string | null): (string | null)[] | null`. These are the press's `choices`, from what an example names.
  - **Returns null** when `pressChoices` refuses the press before its choices: the dispatch then gives its own reason. It also returns null when nothing is named.
  - **Otherwise,** an array of `choicesOf(button).length`:
    - `players` fill the asked player choices in order;
    - `option` fills the first asked block that has that label (by `canon`).
  - **RuleErrors:**
    - more players than asked: `` `The press asks for ${counted(n, 'players')}, but the example names ${players.length}.` ``;
    - an unknown label: `` `“${option}” isn't a choice here. The choices are: ${joinOr(labels)}.` ``, or, with no block asked, `` `“${option}” isn't a choice here: this press chooses nothing.` ``
- **`compile-example.ts`:** a When line that ends in `, paying {players}`, `, choosing <words>` or both, in that order, is read as the action before them plus the choices.
  - The ref is `{ kind: 'lang', phrase: 'choosing', args: [action, players: string[], option: string | null], line, text }`.
  - The action is `matchLine('action', head, …)`, and its diagnostics are the line's.
  - The players are `parseParam('players', …)`; its error goes on the line.
  - Any other When line is read as before.
- **`examples.ts`:** a `choosing` step acts its action. It then dispatches the move with `choices` from `namedChoices`, when that gives some.

- [ ] **Step 1: Write the failing tests.**

  In `board-view.test.ts`, `describe('choices in the view')`, a 3-player `GUILD_GAME` engine with p0 to act:
  - **Two providers.**
    - The arrangement: p1's workshop holds a Vase, p2's a Bowl, p0's stash a Statue and a Vase.
    - The open button's Statue view is `{ id, name: 'Statue', allowed: true, choices: [{ at: 0, prompt: 'Pick who to pay the fee to: p1 or p2.', options: [{ value: 'p1', allowed: true }, { value: 'p2', allowed: true }] }] }`.
    - The stash's Vase has no `choices` key.
  - **Review Focus: the view and the engine agree.**
    - `engine.canDispatch` of the Statue with no `choices` is the prompt.
    - With `choices: ['p1']` it is true.
    - The button's `allowed` is true.
  - **Refused by an Only if.**
    - With no clay anywhere, the Statue's `allowed` is `the card has no wants or some player has a card in their workshop whose mark is the card's wants`.
    - It has no `choices`.
  - **Options.** p0's workshop Statue under the trim button lists `Trim 2 red`, `Trim 2 gold` and `Trim 1 of each`, each allowed.
  - **A button that picks nothing.**
    - `TIPPING` is `GUILD_GAME` plus `  A player may tip.\n    Then:\n      They pay the fee to another player of their choice who has a card in their workshop whose mark is clay.`
    - With two providers, its `ActionView` has `allowed: true` and `choices` listing p1 and p2.
  - **`readSeatExtras`.**
    - It accepts the extras above.
    - It returns null when a choice's `at` is `'0'` or an option lacks `allowed`.

  In `compile-example.test.ts`:
  - `When p0 opens the Statue, paying p2` reads as a `choosing` ref with players `['p2']` and option null.
  - `When p0 trims the Statue, choosing trim 2 gold` gives players `[]` and option `'trim 2 gold'`.
  - `…, paying p1 and p2, choosing trim 2 gold` gives both.
  - `When p0 opens the Statue, paying p9` in a 4-player game gives the players type's error.
  - `When p0 opns the Statue, paying p2` gives the action's own diagnostic.

  In `examples.test.ts`, `GUILD_GAME` (3 players) with these appended passes `runExamples`:

```text
Example: the opener pays a provider of their choice
  Given 3 players
  And p1's workshop has a Vase
  And p2's workshop has a Bowl
  And p0's stash has a Statue
  When p0 opens the Statue
  Then it is rejected because "Pick who to pay the fee to: p1 or p2."
  When p0 opens the Statue, paying p2
  Then it is accepted
  And p2 has 11 coins
  And p1 has 9 coins

Example: a trim is chosen when more than one fits
  Given p0's workshop has a Statue
  When p0 trims the Statue, choosing trim 1 of each
  Then the Statue in p0's workshop has 1 gold trim
```

  - Two players named for one asked choice fail with `The press asks for 1 player, but the example names 2.`
  - `choosing trim 3` fails with `“trim 3” isn't a choice here. The choices are: Trim 2 red, Trim 2 gold or Trim 1 of each.`
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/board-view.test.ts src/engine/core/lang/compile-example.test.ts src/engine/core/lang/examples.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** them, `bunx vitest run src/engine/core/lang src/games src/pages/designer`, `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/board-view.ts src/engine/core/lang/declared-actions.ts src/engine/core/lang/compile-example.ts src/engine/core/lang/examples.ts \
  src/engine/core/lang/board-view.test.ts src/engine/core/lang/compile-example.test.ts src/engine/core/lang/examples.test.ts
git commit -m "feat(lang): the view lists each choice a press asks with a verdict for each answer, and examples say “…, paying p2” or “…, choosing …”"
```

---

### Task 6: Startup Simulator, rules text A: Tags, Licenses, Domain Expertise and the 1b changes

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `src/pages/designer/designer-page.test.tsx` (the count)

**Interfaces:**
- Consumes Tasks 1–5.
- **Choices.** The greenlight's choices are `at` 0 (the License for `requires`), 1 (for `also requires`) and 2 (the cut).
- **New names.**
  - The game number `license`.
  - The counts `blue cut` and `red cut`.
  - The worked values `blue need` and `red need`.

- [ ] **Step 1: Change the rules text.**
  - **Players.** After `  Players pay with capital.`, add `  The game has a license of 3.`
  - **Cards.** After `  Cards can have blue cubes, red cubes, new blue cubes and new red cubes.`, add `  Cards can have blue cut and red cut.`
  - **Worked values.** Before `Feature complete:`, add the two need sections, and make Feature complete read them:

```text
Blue need:
  A card's blue need is its blue cost.
  A card's blue need goes down by its blue cut.

Red need:
  A card's red need is its red cost.
  A card's red need goes down by its red cut.

Feature complete:
  Only if its blue cubes are at least its blue need.
  Only if its red cubes are at least its red need.
```

  - **The actions hint** becomes `  Hint: Spend 3 actions on hiring, drafting, research and your board. Greenlighting and dismissing cost no actions, though a product may need Licenses. Press a button, then pick the cards.`
  - **The greenlight button** becomes:

```text
  A player may greenlight a card in their backlog.
    Only if their development has fewer than 3 cards.
    Only if one of:
      The card has no requires.
      Some player has a card in their operations whose tag is the card's requires.
    Only if one of:
      The card has no also requires.
      Some player has a card in their operations whose tag is the card's also requires.
    Only if one of:
      The card has no requires.
      They have a card in their operations whose tag is the card's requires.
      They have at least the license in capital.
    Only if one of:
      The card has no also requires.
      They have a card in their operations whose tag is the card's also requires.
      They have at least the license in capital.
    Only if one of:
      The card has no requires.
      The card has no also requires.
      They have a card in their operations whose tag is the card's requires.
      They have a card in their operations whose tag is the card's also requires.
      They have at least 2 times the license in capital.
    Then:
      They pay the license to another player of their choice who has a card in their operations whose tag is the card's requires.
        Only if they have no card in their operations whose tag is the card's requires.
      They pay the license to another player of their choice who has a card in their operations whose tag is the card's also requires.
        Only if they have no card in their operations whose tag is the card's also requires.
      It loses its blue cut.
      It loses its red cut.
      They choose one:
        Only if they have a card in their operations whose sector is the card's sector.
        Only if the card is not an Infra card.
        Only if the card is not a Concept card.
        Cut 2 blue:
          Only if its blue cost is more than 1.
          Only if one of:
            Its blue cost is more than 2.
            Its red cost is more than 0.
          It gains 2 blue cut.
        Cut 2 red:
          Only if its red cost is more than 1.
          Only if one of:
            Its red cost is more than 2.
            Its blue cost is more than 0.
          It gains 2 red cut.
        Cut 1 of each:
          Only if its blue cost is more than 0.
          Only if its red cost is more than 0.
          Only if one of:
            Its blue cost is more than 1.
            Its red cost is more than 1.
          It gains 1 blue cut.
          It gains 1 red cut.
        Cut 1 blue:
          Only if its blue cost is 2.
          Only if its red cost is 0.
          It gains 1 blue cut.
        Cut 1 red:
          Only if its red cost is 2.
          Only if its blue cost is 0.
          It gains 1 red cut.
      Move it to their development.
```

  - **Pivot.** After `      It loses its red cubes.`, add `      It loses its blue cut.` and `      It loses its red cut.`
  - **Commit.** `up to its blue cost` becomes `up to its blue need`, and `up to its red cost` becomes `up to its red need`.
  - **Remove** the example "only Tier 1 products are greenlit until Leads and Tags arrive (this slice's call)".
  - **Re-check** every example that Greenlights while an Active product of the card's sector is in Operations (R7). Under plan 1b-2's text only "greenlighting is free (ruling 7)" Greenlights, with p0's operations empty, so no number changes. Report any other.

  Where the rules come from:
  - **Licenses.** $3 per missing Tag, to a provider of the player's choice: §6 Greenlight (Dependency), §14.B.2, ruling 25.
  - **No provider.** The card can't be Greenlit: §14.B.2.
  - **Development provides nothing:** §14.B.2. Every Launched product provides its Tag: ruling 5.
  - **The License must be affordable:** §6, "You may only take an action you can pay for".
  - **Domain Expertise:**
    - the sectors Consumer (Pink), FinTech (Gold), Deep Tech (Gray) and Life Sci (Green); never Infra (Blue) or Concept (White);
    - the hybrid's split, locked at Greenlight;
    - the 1-cube floor.

    These come from §19.A and ruling 25. Every Ops product is Active until slice 4 (ruling 5).
  - **Tier 1 included,** and the cut set every time and cleared by Pivot: spec R3 (Rust's `domain_expertise_cost` has no tier test).
  - **Commit and Feature complete read the need:** R3 (Rust reads the reduced cost in Generate, Commit and Launch).
- [ ] **Step 2: Append these 18 examples,** for N₀ + 17 in all. The numbers come from §20.C and §20.F.

```text
Example: a Tier 2 Greenlight is free when you provide its Tag (section 14)
  Given p0's operations has a Tech Blog
  And p0's backlog has a Server Farm
  When p0 greenlights the Server Farm
  Then it is accepted
  And p0 has 7 capital
  And p0's development has a Server Farm

Example: a License is $3 to the only provider (section 6)
  Given p1's operations has a Tech Blog
  And p0's backlog has a Server Farm
  When p0 greenlights the Server Farm
  Then it is accepted
  And p0 has 4 capital
  And p1 has 10 capital

Example: the player chooses whom to pay when several provide the Tag (section 6, ruling 25)
  Given 3 players
  And p1's operations has a Tech Blog
  And p2's operations has a VPN Service
  And p0's backlog has a Server Farm
  When p0 greenlights the Server Farm
  Then it is rejected because "Pick who to pay the license to: p1 or p2."
  And p0's backlog has a Server Farm
  When p0 greenlights the Server Farm, paying p2
  Then it is accepted
  And p0 has 4 capital
  And p1 has 7 capital
  And p2 has 10 capital

Example: two missing Tags cost a License each, to a provider of each (section 6)
  Given 3 players
  And p1's operations has a Neobank
  And p2's operations has a Server Farm
  And p0's backlog has a Global Currency
  When p0 greenlights the Global Currency
  Then it is accepted
  And p0 has 1 capital
  And p1 has 10 capital
  And p2 has 10 capital

Example: with no one providing the Tag the card can't be Greenlit (section 14)
  Given p0's backlog has a Server Farm
  When p0 greenlights the Server Farm
  Then it is rejected because "the card has no requires or some player has a card in their operations whose tag is the card's requires"
  And p0's backlog has a Server Farm

Example: a product in development provides nothing (section 14)
  Given p1's development has a Tech Blog
  And p0's backlog has a Server Farm
  When p0 greenlights the Server Farm
  Then it is rejected because "the card has no requires or some player has a card in their operations whose tag is the card's requires"

Example: a Greenlight is refused when its License can't be paid, and nothing changes (section 6)
  Given p0 has 2 capital
  And p1's operations has a Tech Blog
  And p0's backlog has a Server Farm
  When p0 greenlights the Server Farm
  Then it is rejected because "the card has no requires or they have a card in their operations whose tag is the card's requires or they have at least the license in capital"
  And p0 has 2 capital
  And p1 has 7 capital
  And p0's backlog has a Server Farm

Example: Fusion Reactor needs Robotics and AI, and one provider of both is paid a License for each (ruling 3, section 6)
  Given p0 has 5 capital
  And p1's operations has a Drone Delivery and a Search Engine
  And p0's backlog has a Fusion Reactor
  When p0 greenlights the Fusion Reactor
  Then it is rejected because "the card has no requires or the card has no also requires or they have a card in their operations whose tag is the card's requires or they have a card in their operations whose tag is the card's also requires or they have at least 2 times the license in capital"
  Given p0 has 7 capital
  When p0 greenlights the Fusion Reactor
  Then it is accepted
  And p0 has 1 capital
  And p1 has 13 capital
  And p0's development has a Fusion Reactor

Example: a player who provides the Tag pays nobody, even when rivals provide it too (section 14)
  Given 3 players
  And p0's operations has a Tech Blog
  And p1's operations has a VPN Service
  And p2's operations has a Dev Tools
  And p0's backlog has a Server Farm
  When p0 greenlights the Server Farm
  Then it is accepted
  And p0 has 7 capital
  And p1 has 7 capital
  And p2 has 7 capital

Example: drafting a Tier 2 needs no Tag (ruling 18)
  Given the growth market has a Neobank and a Search Engine
  When p0 drafts the Neobank
  Then it is accepted
  And p0's backlog has a Neobank

Example: card text wins: NFT Marketplace needs Platform, not Commerce (ruling 21)
  Given p0's operations has a Mobile Wallet
  And p0's backlog has an NFT Marketplace
  When p0 greenlights the NFT Marketplace
  Then it is rejected because "the card has no requires or some player has a card in their operations whose tag is the card's requires"
  Given p1's operations has a Tech Blog
  When p0 greenlights the NFT Marketplace
  Then it is accepted
  And p0 has 4 capital
  And p1 has 10 capital

Example: an Active product of the sector cuts 2 cubes, Tier 1 included (section 19, ruling 25)
  Given p0's operations has a Dating App
  And p0's backlog has a Viral Video App and a Streaming Service
  When p0 greenlights the Viral Video App
  Then it is accepted
  And the Viral Video App in p0's development has 2 blue cut
  And the Viral Video App in p0's development has 4 blue need
  When p0 greenlights the Streaming Service
  Then it is accepted
  And p0 has 7 capital
  And the Streaming Service in p0's development has 8 blue need

Example: no Domain Expertise for Infrastructure or the Concept cards (section 19, ruling 25)
  Given p0's operations has a Tech Blog and a Basic Website
  And p0's backlog has a Dev Tools and a To-Do List
  When p0 greenlights the Dev Tools
  Then the Dev Tools in p0's development has 6 blue need
  When p0 greenlights the To-Do List
  Then the To-Do List in p0's development has 4 blue need

Example: a hybrid's owner chooses how to split the cut (section 19, ruling 25)
  Given p0's operations has a Health Tracker
  And p0's backlog has a Sleep Monitor
  When p0 greenlights the Sleep Monitor
  Then it is rejected because "Choose one: cut 2 blue, cut 2 red or cut 1 of each."
  When p0 greenlights the Sleep Monitor, choosing cut 2 red
  Then it is accepted
  And the Sleep Monitor in p0's development has 2 blue need
  And the Sleep Monitor in p0's development has 2 red need

Example: the cut is locked at Greenlight (section 19, ruling 25)
  Given p0's operations has a Dating App
  And p0's backlog has a Viral Video App
  When p0 greenlights the Viral Video App
  Given p0's operations is empty
  Then the Viral Video App in p0's development has 4 blue need

Example: a pivot clears the cut, so the card costs its full price again (this slice's call)
  Given the phase is actions
  And p0's operations has a Dating App
  And p0's backlog has a Viral Video App
  When p0 greenlights the Viral Video App
  And p0 pivots the Viral Video App
  Then the Viral Video App in the open idea pool has 0 blue cut
  And the Viral Video App in the open idea pool has 6 blue need

Example: cubes beyond the need are lost (section 6, this slice's call)
  Given the phase is actions
  And p0's operations has a Dating App
  And p0's backlog has a Viral Video App
  When p0 greenlights the Viral Video App
  Given the Viral Video App in p0's development has 3 blue cubes
  And the Viral Video App in p0's development has a Junior Software Dev and the Architect on it
  When p0 ends their actions
  Then the Viral Video App in p0's development has 4 blue cubes
  And the Viral Video App in p0's development is feature complete

Example: Domain Expertise never takes a product below 1 cube (section 19; no printed product is this cheap, so the cost is set)
  Given p0's operations has a Dating App
  And p0's backlog has a Messaging App
  And the Messaging App in p0's backlog has 2 blue cost
  When p0 greenlights the Messaging App
  Then the Messaging App in p0's development has 1 blue need
```

  How the numbers come:
  - **Tags and sectors.**
    - Server Farm: Infra, 0/8, requires Platform.
    - Tech Blog, VPN Service and Dev Tools: Infra, providing Platform.
    - Global Currency: FinTech 18/0, requires Crypto and Cloud.
    - Neobank provides Crypto, Server Farm provides Cloud.
    - Fusion Reactor: Deep Tech 4/20, requires Robotics and AI.
    - Drone Delivery provides Robotics, Search Engine provides AI.
    - NFT Marketplace: FinTech 10/0, requires Platform.
  - **Money.**
    - 7 − 3 = 4 and 7 + 3 = 10.
    - Two Licenses: 7 − 6 = 1, and one provider of both gets 7 + 6 = 13.
    - At 5 capital the 2× block refuses, since 5 < 6.
  - **Cuts.**
    - Viral Video App 6/0 Consumer, with a Dating App (Consumer) in operations: only "cut 2 blue" holds, so need 4.
    - Streaming Service 10 → 8, with its Social Tag from p0's own Dating App, so no License.
    - Dev Tools stays 6: Infra. To-Do List stays 4: Concept.
    - Sleep Monitor 2/4 Life Sci, with a Health Tracker (Life Sci): all three options hold, and "cut 2 red" gives 2/2.
    - Messaging App set to 2/0: only "cut 1 blue" holds, so need 1.
    - Commit: 3 + 1 (Junior) + 3 (Architect) is capped at need 4.
- [ ] **Step 3: Update `startup-simulator.test.ts`.**
  - **Examples:** N₀ + 17 results, all `pass`.
  - **Compiles** with `diagnostics` `[]`.
  - **The greenlight's choices.** `choicesOf(<the greenlight button>)` gives three refs:
    - `['choose player', 'choose player', 'choose one']`;
    - the last with the labels `Cut 2 blue`, `Cut 2 red`, `Cut 1 of each`, `Cut 1 blue` and `Cut 1 red`.
  - **The auto-player** answers every choice a greenlight press asks with that choice's first option:
    - through the view, from the card's `choices`;
    - without it, from `pressChoices(runtime, state, move)`.

    For the second path, `playGame` passes its runtime to `playTurn` in both runs and gives `throughView` as a flag of its own. Otherwise its strategy is 1b-2's: Task 8 changes it. The 1b-1 test that both paths play the same moves must still pass.
  - **Designer page.** In `designer-page.test.tsx`, the Startup test's name and `'… of … examples pass'` read N₀ + 17.
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`. 1b-2's long runs must still pass:
  - their seats Greenlight only Tier 1, which pays no License;
  - cubes stay within cost, since the need is at most the cost.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx
git commit -m "feat(games): Startup Simulator greenlights Tier 2 and 3 with their Tags, a License to a provider the player chooses, and Domain Expertise's cut"
```

---

### Task 7: Startup Simulator, rules text B: leads, Stalled, the hybrid Launch, the Diva and the Engineer

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `src/pages/designer/designer-page.test.tsx`, `README.md`

**Interfaces:**
- **New worked names:**
  - flags `leading software`, `leading hardware`, `stalled`, `fully led` and `efficient in ops`;
  - `salary`, now refined.

- [ ] **Step 1: Change the rules text.**
  - **Worked values.** After `Red need:`, add:

```text
Leading software:
  Only if it is a Senior Developer card.
  Only if one of:
    It is a software card.
    It is a flex card.
  Only if it is not onboarding.

Leading hardware:
  Only if it is a Senior Developer card.
  Only if one of:
    It is a hardware card.
    It is a flex card.
  Only if it is not onboarding.

Stalled:
  Only if it is not a Tier 1 card.
  Only if one of:
    Its blue need is 0.
    No card on it is leading software.
  Only if one of:
    Its red need is 0.
    No card on it is leading hardware.

Fully led:
  Only if one of:
    It is a Tier 1 card.
    Its blue need is 0.
    Some card on it is leading software.
  Only if one of:
    It is a Tier 1 card.
    Its red need is 0.
    Some card on it is leading hardware.

Efficient in ops:
  Only if it is an Efficient card.
  Only if it is in an ops team.

Salary:
  An efficient in ops card's salary is 1.
```

  - **Team output.** At the end of `Blue team output:`, add `  A stalled card's blue team output is 0.` At the end of `Red team output:`, add `  A stalled card's red team output is 0.`
  - **Launch.** After `    Only if it is feature complete.`, add `    Only if it is fully led.`
  - **Both reassign buttons.** Right after `    It costs 1 action.`, add `    Only if the card is not an Ego card.`
  - **Pivot.** Before `      Every card on it is onboarding.`, add `      Every card on it whose trait is Ego goes to the open job market.`

  Where the rules come from:
  - **Leads, Stalled and Launch.**
    - Matching Leads and cross-functional leads: §3 Tech Tiers & Leads.
    - The lead table, where PMs and Specialists never lead: §7.B, §20.B.1.
    - Stalled, whole team: §3; Rust `engine.rs` stops the whole team.
    - Launch's lead check: §6.
    - Greenlight without a lead: §14.B.2.
  - **Onboarding leads nothing:** §6 ("cancels all the effects"), ruling 8, and Rust's lead coverage skipping onboarding staff (R2).
  - **The type follows the cut:** R2 and R3 (Rust `project_rules.rs:549-586`).
  - **The Diva:** §6 Reassign and Pivot, §20.B.1, ruling 9.
  - **The Engineer:** §20.B.1.
- [ ] **Step 2: Append these 12 examples,** for N₀ + 29 in all.

```text
Example: a Tier 2 Software project with only a Hardware Senior and a Specialist is Stalled, so its whole team generates nothing (section 3, section 7)
  Given the phase is actions
  And p0's development has a Neobank
  And the Neobank in p0's development has the Diva, a Junior PM and a Junior Software Dev on it
  When p0 ends their actions
  Then the Neobank in p0's development has 0 blue cubes
  And the Neobank in p0's development is stalled

Example: a hybrid led by one Senior Backend progresses, its Hardware Junior generating Red too (section 3)
  Given the phase is actions
  And p0's development has a Drone Delivery
  And the Drone Delivery in p0's development has the Architect and a Junior Hardware Eng on it
  When p0 ends their actions
  Then the Drone Delivery in p0's development has 3 blue cubes
  And the Drone Delivery in p0's development has 1 red cube

Example: a hybrid Launches only with both leads or one cross-functional lead (section 6)
  Given the phase is actions
  And p0's development has a Drone Delivery
  And the Drone Delivery in p0's development has 6 blue cubes
  And the Drone Delivery in p0's development has 6 red cubes
  And the Drone Delivery in p0's development has the Architect on it
  When p0 launches the Drone Delivery
  Then it is rejected because "it is fully led"
  Given the Drone Delivery in p0's development has a Firmware Specialist on it
  When p0 launches the Drone Delivery
  Then it is accepted
  And p0's operations has a Drone Delivery

Example: an onboarding Senior leads nothing that turn (section 6, ruling 8)
  Given the phase is actions
  And p0's development has a Neobank and a Dating App
  And the Dating App in p0's development has the Architect on it
  And the Neobank in p0's development has a Junior Software Dev on it
  When p0 reassigns the Architect to the Neobank
  And p0 ends their actions
  Then the Neobank in p0's development has 0 blue cubes
  When p1 ends their actions
  And p0 pays salaries
  And p0 ends their actions
  Then p0 has 5 capital
  And the Neobank in p0's development has 4 blue cubes

Example: a Launch is refused when its only lead was Reassigned away this turn (section 6)
  Given the phase is actions
  And p0's development has a Neobank and a Dating App
  And the Neobank in p0's development has 10 blue cubes
  And the Neobank in p0's development has the Architect on it
  When p0 reassigns the Architect to the Dating App
  And p0 launches the Neobank
  Then it is rejected because "it is fully led"

Example: Greenlighting without a lead is allowed, and the project is Stalled (section 14)
  Given p0's operations has a Mobile Wallet
  And p0's backlog has a Neobank
  When p0 greenlights the Neobank
  Then it is accepted
  And the Neobank in p0's development is stalled

Example: the type follows the cut: Smart Grid cut by 2 blue is pure Hardware (this slice's call)
  Given the phase is actions
  And p0's operations has a Smart Thermostat
  And p0's backlog has a Smart Grid
  When p0 greenlights the Smart Grid, choosing cut 2 blue
  Then the Smart Grid in p0's development has 0 blue need
  Given the Smart Grid in p0's development has the Hacker on it
  Then the Smart Grid in p0's development is stalled
  Given the Smart Grid in p0's development has 10 red cubes
  And the Smart Grid in p0's development has the Engineer on it
  Then the Smart Grid in p0's development is not stalled
  When p0 launches the Smart Grid
  Then it is accepted

Example: the Diva can't be Reassigned from a project (section 6, section 20)
  Given the phase is actions
  And p0's development has a Smart Lock and a Smart Toy
  And the Smart Lock in p0's development has the Diva on it
  When p0 reassigns the Diva to the Smart Toy
  Then it is rejected because "the card is not an Ego card"
  And p0 has 3 actions

Example: the Diva in the ops team can't be Reassigned, but can be Recalled (section 6, section 20)
  Given the phase is actions
  And p0's development has a Smart Lock
  And p0's operations has a USB Gadget
  And p0's ops team has the Diva
  When p0 reassigns the Diva to the Smart Lock
  Then it is rejected because "the card is not an Ego card"
  When p0 recalls the Diva
  Then it is accepted
  And p0's bench has the Diva

Example: a Pivot fires the Diva to the open job market instead of benching her (ruling 9)
  Given the phase is actions
  And p0's development has a Smart Lock
  And the Smart Lock in p0's development has the Diva and a Junior Hardware Eng on it
  When p0 pivots the Smart Lock
  Then it is accepted
  And the open job market has the Diva
  And p0's bench has a Junior Hardware Eng
  And the Diva in the open job market is not onboarding

Example: the Engineer's salary is $2 on a project (section 20)
  Given p1's development has a Smart Lock
  And the Smart Lock in p1's development has the Engineer on it
  And the turn passes to the left
  When p1 pays salaries
  Then p1 has 5 capital

Example: the Engineer's salary is $1 in the ops team (section 20)
  Given p1's operations has a USB Gadget
  And p1's ops team has the Engineer
  And the turn passes to the left
  Then p1 has 8 capital
  When p1 pays salaries
  Then p1 has 7 capital
```

  How the numbers come (§20.B.1, §20.C):
  - **Output and leads.**
    - The Architect makes 3 Blue and a Junior 1. The Neobank is 10/0, the Drone Delivery 6/6, the Smart Grid 2/10 cut to 0/10.
    - The Diva and the Engineer are Hardware Seniors, and the Hacker is Software. A Firmware Specialist is flex. A Junior PM is a Specialist.
    - Onboarding: the Architect's 3 and the Junior's 1 are lost in the reassign turn, and make 4 the next.
  - **Salaries.**
    - The Architect's $2: 7 − 2 = 5.
    - The Engineer: $2 on a project (7 − 2 = 5); $1 in the ops team, after the USB Gadget's $1 revenue (7 + 1 − 1 = 7).
- [ ] **Step 3: Update the tests and the README.**
  - **`startup-simulator.test.ts`.**
    - Examples: N₀ + 29, all `pass`. It compiles with `[]`.
    - `game.worked` has `blue need` and `red need` (numbers), the five flags (`kind: 'flag'`), and `salary` (`refines: true`).
    - If plan 1b-2's money check reads the payroll from the `salary` column, it now reads `runtime.workedValue(state, id, 'salary')`, since the Engineer is $1 in the ops team.
  - **`designer-page.test.tsx`** reads N₀ + 29.
  - **README, the Startup paragraph.**
    - It now plays slice 3: Tier 2 and 3 products with Tags and Licenses, Domain Expertise, Matching Leads, Stalled projects, the hybrid Launch, the Diva and the Engineer.
    - Its N₀ + 29 examples pin rulings 3, 9 and 21, besides those 1b-2 lists.
  - **README, what it still leaves out.**
    - Remove Tier 2/3.
    - Narrow "the Senior traits" to the Hacker's, the Architect's, the Veteran's, the Fixer's and the Full Stack Ninja's.
    - Add Partners' free License, Patent Trolls, badged Juniors and the Visionary as leads.
  - **README, a new "Choices and comparing cards" paragraph:**
    - `… to another player of their choice who …` with `Only if` lines under it;
    - `They choose one:` with options ending in `:`;
    - filling in a lone candidate, and the prompts;
    - `whose … is the card's …`, `they have a card in … whose …`, `some player has a card in their … whose …` and `the card has no …`;
    - `it is a … card`, `it is in a …` and `some card on it is …`;
    - `a card's … goes down by its …`;
    - examples `…, paying p2` and `…, choosing cut 2 red`.
- [ ] **Step 4: Run** `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`. 1b-2's long runs must still pass:
  - Tier 1 projects are never Stalled;
  - a refused reassign of the Diva falls back as any refused move does;
  - a pivoted Diva enters the open job market's queue.

  If one fails, find out why before Task 8 changes the runs.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/designer-page.test.tsx README.md
git commit -m "feat(games): Startup Simulator's Matching Leads, Stalled projects and the hybrid Launch, the Diva who can't be reassigned, and the Engineer's \$1 in Ops"
```

---

### Task 8: Long runs with Tier 2/3, choice tallies and the new invariants; the checks

**Files:**
- Modify: `src/games/startup-simulator.test.ts`

**Interfaces:**
- Consumes `pressChoices`, `choicesOf`, `ChoiceView`, `runtime.workedValue` and `workedFlag`, `gameNumber`, `cardsOn`, and 1b-2's `playGame`, `playTurn`, `keepsTheRules`, `happenings`, `Run.until` and view checks.
- **The auto-player** keeps 1b-2's turn (with P6's dismiss rhythm) and 1a's Ideation, which digs into the Growth Deck, so games still drain to the Crash. It changes:
  - **The free greenlight.**
    - It greenlights the first backlog card the view allows (Tier 2 and 3 included) while the development has fewer than 3.
    - It answers choice `at` with option `(t + at) % options.length`, from the card's `choices` (through the view) or from `pressChoices` (without).
  - **Hiring.** When the first project is stalled (`runtime.workedFlag`):
    - option 1 hires the first affordable agency Senior Developer who leads one of its colours (software or flex when its blue need is above 0; hardware or flex when its red need is) straight onto it;
    - option 3 assigns the bench's first such Senior to it.

    Otherwise both are as 1b-2's.
  - **The pivot.** When `t % 13 === 0`, it pivots the first project with the Diva on it, else the first project.
- **`happenings` gains:**
  - `a license paid to the only provider` and `a license paid to a chosen provider`, for each License of a greenlight whose `pressChoices` (on `before`) offered one option or several;
  - `a cut filled in` and `a cut chosen among options`;
  - `the cut: <label>` for each option taken;
  - `a Tier 2 or 3 card greenlit` and `a Tier 2 or 3 card launched`;
  - `a stalled project at the engine`;
  - `the Diva fired by a pivot`;
  - `the Engineer paid 1 in the ops team`;
  - `two licenses in one greenlight`, reported but not required.
- **`keepsTheRules` gains, after every move:**
  - **Licenses.** For a greenlight of card C by `by`, `missing` is C's present requirements that no card in `by`'s operations had as its tag in `before`.
    - `by` pays `license × missing.length`, with `license` read by `gameNumber`.
    - Each other seat gains a multiple of `license`, at most `license ×` the number of `missing` Tags it provides in `before`.
    - The gains sum to what `by` paid.
    - Every requirement of C was provided by some seat in `before`.
    - This replaces 1b-2's "0 for any other move" for greenlights. Every other move keeps 1b-2's money rule.
  - **No cubes while stalled.** For each development card whose blue or red cubes rose in the move, `runtime.workedFlag(atGenerate, id, 'stalled')` is false.
    - `atGenerate` is `after` with every card's `onboarding` flag as in `before`.
    - It is also set on `move.cardId` when the move is a reassign, since the turn may have started again within the move.
  - **The need.**
    - No card's blue cubes exceed its blue need, nor its red cubes its red need, through `runtime.workedValue`. This replaces 1b-2's check against cost.
    - Every development card's cuts are at most its costs, colour by colour, and its needs sum to at least 1.
    - No card outside development and operations has a `blue cut` or `red cut`.
  - **The Diva.** No accepted reassign moves a card whose trait is Ego.
  - **The payroll** is read through `runtime.workedValue(…, 'salary')`.

- [ ] **Step 1: Write the tests.**
  - **Every count ends.** `it.each([2, 3, 4, 5])` with seeds 1–5, timeout 120000, as 1b-2's, with the new invariants and the same end-of-game score.
  - **Every button and path is used.** The tally expects above 0:
    - every key 1b-2's expects;
    - every new happening above but `two licenses in one greenlight`;
    - `the cut: Cut 2 blue`, `the cut: Cut 2 red` and `the cut: Cut 1 of each`.

    `Cut 1 blue` and `Cut 1 red` are unreachable with §20's cards (Task 6 pins them by example). If a key stays at 0, print the tallies and change the auto-player, never the rules.
  - **Review Focus: undo and replay with choices.**
    - At 4 players, seeds 1 to 5 in turn, play until the log holds a greenlight whose press asked a choice (`Run.until`).
    - A fresh engine given `loadLog` equals the state.
    - Undoing back to before that greenlight gives back the state then, payee included.
  - **Through the view.** The 1b-1 test that a run plays the same move for move through the view still passes, now with choices.
- [ ] **Step 2: Run** `bunx vitest run src/games/startup-simulator.test.ts`.
  - Fix failures in the auto-player.
  - When an invariant shows a wrong rule, fix the text or the phrases.
  - Report a rule the text can't express rather than relaxing an invariant.
- [ ] **Step 3: Run** `bun run test` and `bun run typecheck`. The passing count is the starting count plus this plan's new tests.
- [ ] **Step 4: Run the checks.** Each must print nothing.

```bash
# Startup Simulator's words in shared code, slice 3's included, tests included
git diff "$BASE" -- src/engine src/pages src/utils ':!src/pages/designer/designer-page.test.tsx' ':!src/pages/designer/playtest-fitted.test.tsx' \
  ':!src/pages/designer/tableaux.test.ts' ':!src/pages/designer/samples.ts' | grep '^+[^+]' \
  | grep -iE '\b(capital|talents?|agency|juniors?|backlogs?|growth|crash(es)?|vaporware|universit(y|ies)|bench(es)?|ideation|start-?ups?|research(es)?|recruit(s|ed|ing)?|products?|job market|idea pool|greenlight(s|ed|ing)?|launch(es|ed|ing)?|pivot(s|ed|ing)?|salar(y|ies)|payroll|projects?|cubes?|ops|operations|onboarding|scouting|sourcing|market share|tags?|leads?|leading|licen[cs]es?|tiers?|stall(s|ed|ing)?|sectors?|expertise)\b|\bseed (decks?|markets?|cards?|products?)\b'
# protected files
git diff --stat "$BASE" -- src/engine/core/game-state.ts src/engine/core/flow.ts src/engine/core/game-engine.ts src/pages/hearts-demo
# a pure core
git diff "$BASE" -- src/engine/core ':!*.test.ts' | grep '^+' | grep -E "from '(pixi|react|@/components|@/utils)|\b(document|window)\.|Math\.random|Date\.now"
# no existing test line removed outside the lines this plan names
git diff "$BASE" -- '*.test.ts' '*.test.tsx' ':!src/games/startup-simulator.test.ts' ':!src/pages/designer/designer-page.test.tsx' | grep -E '^-[^-]'
```

  The last check prints exactly the lines this plan names, and nothing else:
  - in `refs.test.ts`, the pinned `VOCAB_TYPES` list;
  - plan 1b-2's two `CardGroup` expectations.

  Also read the `+` lines of `src/engine` and `src/pages` for "source" in the game sense.
- [ ] **Step 5: Run the four games alone.** `bunx vitest run src/games/hearts.test.ts src/games/color-match.test.ts src/games/venom.test.ts src/games/rent-day.test.ts src/pages/hearts-demo` passes, and Rent Day still has 108 examples.
- [ ] **Step 6: Commit**

```bash
git add src/games/startup-simulator.test.ts
git commit -m "feat(games): Startup Simulator's long runs greenlight and launch Tier 2 and 3 at 2 to 5 players, pay every License to a provider and never build a Stalled project"
```
