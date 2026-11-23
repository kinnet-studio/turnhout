# Startup Simulator: the second auto-player retune (proposal)

Measured in a scratch clone of a526ffe (`$S/work`, branch `final`). Here `$S` is
`/tmp/claude-0/-home-user/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/retune2`. Nothing was written in `/home/user/turnhout`.

**Outcome**

- **Six of the 17 keys** come to 2 or more games and become required:
  - TechCrunch Features in a 3-player log;
  - Trade Show's $2 TechCrunch;
  - TechCrunch for $5;
  - Workaholic played;
  - the reassign from the ops team to a product in operation;
  - Intern Season's free recruit.
- **Five other keys** come newly to 2 or more games. They become required too, by the R3 precedent:
  - a License paid to a chosen provider;
  - a Junior PM promoted at a Launch;
  - Toxic Personality in the ops team;
  - a Workaholic's +2 at the Engine;
  - Platform Power claimed.
- **No required key is lost.** Every required key is still held by 2 or more games. The replay keys that one game held at a526ffe now
  have 2 or more:
  - the 2-player reshuffles, strips and let-gos;
  - the 3-player strips.
- **Every move is chosen through `choose`.** The invariants still run after every move, and `MAX_TURNS` is unchanged.
- **The Startup file passes 109 of 109.** The full suite, run once at the end, passes 121 files and 3817 tests, with Startup's 306
  examples. Only `src/games/startup-simulator.test.ts` differs from a526ffe.
- **Cost:**
  - moves in the 20 long runs go from 4464 to 4615 (+3.4%);
  - Launches go from 52 to 61;
  - the Startup file's `tests` figure: best of 9 alternating runs is 28.38 s at a526ffe and 28.74 s with the retune (+0.4 s); best
    of the first 3 is 30.91 s and 28.77 s. Other agents' vitest runs shared the machine throughout, so §6 gives every run;
  - CPU time in 3 quiet-start pairs is 55.5 s at a526ffe and 52.7 s with the retune (-5%).

The change is test-side only, in `src/games/startup-simulator.test.ts`. It touches no rules, engine, utils or protected file.

## 1. The 17 keys

| Key | Games at a526ffe | Games after | Status |
|---|---|---|---|
| TechCrunch Features (3-player replay) | 0 (2p: 1) | **3** (3p s1, s2, s4) | required |
| Trade Show: a TechCrunch Feature for $2 | 0 | **2** (2p s2, 3p s2) | required |
| TechCrunch for $5 | 1 (2p s4) | **8** (2p s2, s4; 3p s1, s2, s4; 4p s2; 5p s2, s4) | required |
| an Attribute played: Workaholic | 1 (5p s5) | **8** (2p s1, s2; 3p s1, s2, s3, s5; 4p s5; 5p s5) | required |
| reassign from the ops team to a product in operation | 1 (3p s4) | **3** (2p s2, 2p s4, 3p s4) | required |
| Intern Season: a free recruit | 1 (2p s4) | **6** (2p s2, s4; 3p s2, s4; 4p s2; 5p s2) | required |
| Attributes kept through a bench discard | 0 | 1 (2p s2) | counted |
| hire from the agency row to the bench | 0 | 1 (4p s2) | counted |
| Patent Trolls: a $5 License | 1 (2p s4) | 1 (2p s4) | counted |
| Toxic: a Red cube taken | 0 | 0 | counted |
| the Engineer paid 1 in the ops team | 0 | 0 | counted |
| Legacy Code at an Income | 0 | 0 | counted |
| Crunch Time: a Bug stopped by Clean Code | 0 | 0 | counted |
| a trained Junior declared red | 1 (5p s2) | 0 | counted |
| a milestone claimed: Revenue Leader | 0 | 0 | counted |
| Training: Leadership Masterclass on a Sales Rep | 0 | 0 | counted |
| keep red on a card in the ops team | 0 | 0 | counted |
| (optional) a 4-player game revealing past round 18 | none | none: the longest 4-player game lasts 13 rounds | not attempted |

## 2. The drivers

There are four drivers, each a few lines in `playTurn`. Each steers only which move a seat tries first. Every press still goes through
`choose`, which takes the first move the rules accept, so the rules still decide what is legal.

The probe labels below are runs of the long-run tests with a per-game tally, written by `tools/run.sh` and read by
`tools/analyse.py`:

- `base` is a526ffe.
- `d1f`, `d2`, `d3` and `d6` are one driver alone on a526ffe.
- `f1-minus-d1` is D2, D3 and D4 together.
- `final` is all four. Its tallies are identical to probe `f1`.

### D1: Intern Season's free recruit, as the turn's last action (`drivers/D1-intern-season.patch`)

- **What and when.** `internRecruit(a)`:
  - It fires while Intern Season is the Event in play and the seat has exactly 1 action left.
  - It presses the recruit that `recruitMaker(a)` would press. That is the Junior QA Tester while a project's Bugs go uncleaned, else
    the Junior who makes a colour the first unfinished project lacks, else the recruit `recruit(a)` picks.
  - It sits in the later actions right after `reassignDiva()` and `launch()`, so on the last action it comes before the rest of the
    plan.
- **Why within the rules.** Intern Season makes a University recruit cost $0 (§20.D). A recruit is an ordinary action that the rules
  accept or refuse.
- **Why the last action.** The first form, before every other later action (rejected D1a), took the Brainstorm's action, and 2
  players seed 4 lost the strategy reshuffle that the Review Focus test pins. The last-action form leaves the turn's other plans
  their actions.
- **Alone (`d1f`).** It brings these keys:
  - Intern recruit: 6 games;
  - TechCrunch for $5: 4;
  - Workaholic: 2;
  - reassign from the ops team to a product: 2 (3p s2, s4);
  - 3-player TechCrunch: 1;
  - Trade Show $2: 1;
  - Attributes kept: 1;
  - agency row to the bench: 1.

  Its cost:
  - moves 4464 to 4545 (+81) and Launches 52 to 60;
  - a trained Junior declared red drops 1 to 0;
  - **a Debuff on an ops team card drops 2 to 1**, a required key below the 2-game bar.
- **In `final`.** D1 is what brings:
  - Intern Season (6 games);
  - Trade Show's $2 (2 games, with D2);
  - 3p s2's TechCrunch;
  - 2p s2's reassign;
  - the 2-player replay's reshuffles (2) and let-gos (3).

  Compared with `f1-minus-d1`, it costs +189 moves and the two trained-red games: there, 2p s4's Junior declares red at round 23,
  but with D1's recruits the seat goes broke and lets it go at round 21's Regulation Audit.
- **Side effects.**
  - Alone, it ends the QA Engineer's Bug cleans (3 games to 0), a counted key that examples pin.
  - It moves two required Event keys, both well above 2: Regulation Audit let-gos go 4 to 5 (6 in `final`) and Angel Investors
    payouts 12 to 10.

### D2: keep a TechCrunch Feature first at the Brainstorm (`drivers/D2-techcrunch-first.patch`)

- **What and when.** In the brainstorm step, the keep takes the row's TechCrunch Feature when it holds one. Otherwise it keeps the
  row's first playable card as before, else the `t`-picked one.
- **Why within the rules.** The keep may take any card of the row (§6, §15). A TechCrunch Feature scores 5 Hype on an Active product for
  $5, or $2 with a working Sales Rep, at no action (§12, §20.A). A seat that kept the row's first playable card passed it over in most
  games that drew it.
- **Alone (`d2`).** It brings:
  - 3-player TechCrunch: 2 games (3p s1, s4);
  - TechCrunch for $5: 5;
  - reassign from the ops team to a product: 2 (2p s4, 3p s4).

  Moves go 4464 to 4421 (-43) and Launches 52 to 51. No required key falls below 2; the lowest it moves is Visionary played, 6 to 3.

### D3: play the Workaholic on any turn (`drivers/D3-workaholic-any-turn.patch`)

- **What and when.** `training()` plays a Workaholic from the hand on any turn, as it does Training cards. The other Buffs still wait
  for a turn when `t % 3 === 0`.
- **Why within the rules.** A Buff is a free play on the seat's own staff (§20.A), and `takes` asks the rules for its targets. At 3
  players, `t % 3` belongs to one seat, so only the first seat ever played Buffs. The Workaholic is the Buff that pays at once, with +2
  output in its card's colour.
- **Alone (`d3`).** It brings Workaholic: 7 games. It also brings a Workaholic's +2 at the Engine in 5 games (R3).

  Moves go 4464 to 4469 (+5) and Launches are unchanged. The only required key it lowers is pay salaries, 16 to 15.

### D4: the Growth Hacker's reassign on every other turn of the seat's own (`drivers/D4-reassign-own-turn.patch`)

- **What and when.** `moveGrowthHacker` now fires when `⌊t / n⌋` is odd, with n the seats, instead of when `t % 4 === 1`.
  - Under `t % 4 === 1`, at 4 players the move belonged to one seat alone.
  - At 2 players it went to one seat alone, on every other round.

  The arranged test "reassigns the Growth Hacker … once on a turn when ⌊t / n⌋ is odd …" is updated to match:
  - it now walks t = 0 to 5;
  - it expects the reassign at t = 2 and 3.
- **Why within the rules.** The reassign from the ops team to another product is an ordinary later action (§6, §20.B). The gate
  changes only when it is tried.
- **Alone (`d6`).** It brings reassign from the ops team to a product: 2 games (2p s4, 3p s4).

  Moves go 4464 to 4408 (-56) and Launches 52 to 50. Risk: **Hype scored drops 2 to 1**, a required key below the bar. In `final`, with
  D2, it is held by 6 games.

### The combination (`final` = D1 + D2 + D3 + D4)

| | Targets at 2+ | Moves | Launches | Rounds | Required keys below 2 |
|---|---|---|---|---|---|
| a526ffe | 0 | 4464 | 52 | 221 | none (replay ≥1-log keys at 1: 2p reshuffles, 2p strips, 3p strips) |
| D2 + D3 + D4 (`f1-minus-d1`) | 5 (3p TechCrunch, TechCrunch $5, Workaholic, reassign, **trained red: 2p s4, 5p s2**) | 4426 | 50 | 219 | none new (2p reshuffles still 1 log) |
| **all four (`final`)** | **6** (3p TechCrunch, Trade Show $2, TechCrunch $5, Workaholic, reassign, Intern) | 4615 | 61 | 223 | none; every replay key at 2+ logs |
| D1 only under $2 + D2-D4 (`c9`, rejected D1c) | 5 | 4483 | 53 | 221 | 2p reshuffles, strips and let-gos at 1 log |

`final` is the proposal, since it brings the most targets. If time matters more than the sixth key, D2 + D3 + D4 alone is the cheaper
fallback:

- it brings 5 targets at -38 moves;
- trained red comes in, but Intern and Trade Show stay counted.

**Required keys whose game count fell under `final`.** All stay at 2 or more:

- pay salaries: 16 to 15;
- scouting to a development card: 10 to 9;
- switch off in operations: 15 to 14;
- a cut filled in: 5 to 4;
- Full Stack Bootcamp on a Junior: 7 to 6;
- a trained Junior declared blue: 4 to 3;
- Visionary played: 6 to 3;
- a Debuff on a development card: 14 to 12;
- Burnout leaving a unit idle: 8 to 6;
- Angel Investors paid: 12 to 10;
- Open Source Boom at work: 10 to 9;
- Hardware Hackathon at work: 14 to 13;
- Online Course Boom's $1 Training: 5 to 4;
- the 2-player replay's Milestone claims: 4 to 3.

The full tally, every key with the games holding it before and after, is in `$S/tally-before-after.txt`.

**Counted keys that fell** (none is required; each keeps its pin):

| Key | Games before → after | Pin |
|---|---|---|
| a Bug cleaned by a QA Engineer | 3 → 0 | its examples |
| a token kept by choice | 1 → 0 | arranged test "makes the graduation choices the auto-player picks, …" |
| keep blue on a card in the ops team | 1 → 0 | the same graduation test |
| a Visionary leading | 1 → 0 | "a Junior with Visionary leads in both colours, …" and "Visionary makes any unit a …" |
| a trained Junior declared red | 1 → 0 | "a Junior Software Dev with 2 Blue XP and a Red Skill token declared Red makes 1 Red, its Blue XP idle" |
| Toxic: a Blue cube taken | 2 → 1 | "Toxic Personality takes one cube off its …" |
| a mode carried between teams | 4 → 2 | its examples |

## 3. Launches, moves and rounds per game

Values are listed in seed order 1 to 5.

| | 2p | 3p | 4p | 5p | Total |
|---|---|---|---|---|---|
| Launches, a526ffe | 1 4 2 8 0 | 1 5 2 6 1 | 2 2 0 4 2 | 0 5 1 4 2 | 52 (17 games of 20) |
| Launches, final | 1 5 2 7 0 | 1 8 2 6 1 | 2 8 0 4 2 | 0 5 1 4 2 | 61 (17 of 20) |
| Moves, a526ffe | 201 265 153 449 155 | 185 304 165 310 184 | 183 212 141 363 153 | 145 267 152 322 155 | 4464 |
| Moves, final | 199 343 153 404 155 | 188 315 166 326 186 | 183 297 141 363 154 | 145 265 152 325 155 | 4615 |
| Rounds, a526ffe | 14 21 13 27 12 | 10 14 9 16 9 | 7 10 6 13 6 | 5 9 5 10 5 | 221 |
| Rounds, final | 14 22 13 25 12 | 10 15 9 16 9 | 7 12 6 13 6 | 5 9 5 10 5 | 223 |

`MAX_TURNS` is not approached. Every game still ends with a result.

## 4. Comments the retune makes false, and their new words

All of these are in `drivers/D5-tallies-and-comments.patch`; Appendix A gives the exact old and new words of each hunk.

1. **`playTurn`'s doc.** It now says:
   - free moves play "Training cards and the Workaholic on any turn and of the other Buffs too on a turn when `t % 3 === 0` (the second
     retune's D3)";
   - each later action, "as its last action while Intern Season makes a recruit free, it recruits the Junior a recruit below would (see
     `internRecruit`, the second retune's D1)";
   - the reassign comes "once a turn when `⌊t / n⌋` is odd, n the seats";
   - the brainstorm "keeps a TechCrunch Feature (the second retune's D2), else the row's first card the runs play".

   The first retune's "(the retune's D2/D3)" references now read "(the first retune's …)" here and in three tally comments.
2. **`training()`'s and `moveGrowthHacker`'s docs.** These are in the D3 and D4 patches.
3. **`HELD_BY_FEWER_THAN_TWO`.**
   - The six promoted keys leave the set.
   - The doc says "as the second retune promoted six: …".
   - It moves trained red to "None", with the reason and its pin.
   - It moves Attributes kept (2p s2) and agency row to the bench (4p s2) to "One game".
4. **"every" tally.**
   - The scouting's hire to the ops team is now in three games (2p s2, 4p s2, 4p s4).
   - The Held-by sentence is redone. The fewest is now the agency row's hire to the bench at one game, and the reassign is noted as
     promoted.
5. **Slice 3 tally.**
   - `LICENSE_TO_A_CHOSEN_PROVIDER` joins the paths.
   - The title now says "Licenses paid to the only provider and to a chosen one".
   - The counted text explains its promotion, and the Held-by is redone.
6. **Slice 4 tally.** The Held-by is redone: a mode forgotten on a bench by 5, a mode declared QA by 9.
7. **Slice 5 talent tally.**
   - `PROMOTED` joins the paths, and the title ends "… and a Junior PM promoted at a Launch".
   - Its counted bullet goes.
   - The QA Engineer's clean is now "three games held one before the second retune; none now".
   - The Held-by is redone.
8. **Slice 5 Strategy and Milestones tally.**
   - The reshuffle is now in "five games … (2 players seeds 2 and 4, 3 players seed 2, 4 and 5 players seed 4)".
   - `${CLAIMED}: Platform Power` joins the paths, and the title ends "and Clean Launch and Platform Power claimed".
   - The Milestone bullet now covers only First Mover Advantage (2) and Full Stack Founder (4), and says Platform Power is required.
   - The Held-by gains "by two: Platform Power claimed (3 and 4 players, seed 2)" and trained red's new "none".
9. **Slice 6 Strategy tally.**
   - `WORKAHOLIC_AT_ENGINE` and `TOXIC_OPS` join the paths, and their counted bullets go.
   - The header says "the Buffs but the Workaholic only on turns with t % 3 === 0".
   - Attributes boxed is now in 2p s2, Visionary leading in none, and Toxic Blue in 2p s4 only.
   - The Held-by is redone.
10. **Slice 6 Events tally.** The fewest are now Venture Capital Rain and Intern Season. The by-game list is redone, and the counted
    keys are now Legacy Code, Crunch Time's stop and Patent Trolls.
11. **The 3p s2 undo test.** It now reads "Seed 2 makes all four by its 69th move, … (seeds 5 and 4 take 78 and 79, seeds 3 and 1 137
    and 140)". It was "83rd … seed 5 takes 90, and seed 1 launches nothing".
12. **The Greenlight seeds test.** It now reads "up to seed 6 since the second retune (up to seed 10 before it)". It was "up to seed 4",
    already stale at a526ffe.
13. **The 2-player replay.**
    - Declarations are in seeds 1, 2, 4 and 5, Debuffs in seeds 2 to 5, and the reshuffle and TechCrunch in seeds 2 and 4.
    - Strips are in seeds 1, 2 and 4, Event reshuffles in seeds 2 and 4, and let-gos in seeds 1, 2 and 4.
    - The last move is the end of the actions in seeds 1 and 3, a final-check switch-off in seed 2 and a backlog cleanup's discard in
      seeds 4 and 5.
14. **The 3-player replay.**
    - The title now says "TechCrunch Features".
    - Strips are in seeds 1, 2 and 5, TechCrunch in seeds 1, 2 and 4, and Design Sprints in seeds 2 and 5.
    - The last move is a final-check switch-off in every seed.
15. **The graduation test.** It now reads "The long runs press no button of the graduation step (one keep, at 3 players seed 2, before
    the second retune)".
16. **The Revenue Leader test.** It now reads "an Income in the long runs comes to $10 only at 3 players seed 4". It was "2 and 4
    players seed 4".
17. **The scouting hire to the ops team test.** It now reads "the long runs make it in three games (2 players seed 2, 4 players seeds 2
    and 4)". It was "one game (5 players seed 3)", already stale at a526ffe.

**Stale at a526ffe and still stale, left as they are** (outside this retune's tallies; mention only):

- **The Training target test** says "a Masterclass reaches a QA Engineer once, at 4 players seed 4". No game holds it before or after.
- **The First Mover Advantage arranged test** says "only 2 players seed 4 runs 3 Tags … only 2 and 4 players seed 4 run both sides of
  the stack (plan 5-2b's P8)".
- **The agency row's ops hire test** says "The retuned long runs never make this hire (D3)". The agency row's hire to the ops team was
  held by 2 games at a526ffe and 3 now. It stays counted, as it was at a526ffe.

## 5. Keys left counted

Each key below is still pinned by the example or arranged test named.

| Key | Why it stays below 2 | Pin |
|---|---|---|
| Toxic: a Red cube taken | needs the one Toxic Personality on a team that makes Red and no Blue; steering Toxic to such a team (rejected Dx) moved no key | "a team that makes no Blue loses a Red cube to Toxic Personality" |
| the Engineer paid 1 in the ops team | the Engineer comes late or is let go for money (3p s5; 5p s4 hires him in the last round) | "the Engineer's salary is $1 in the ops team" |
| Legacy Code at an Income | needs a bugged product online at an Income while Legacy Code is in play; no game has both | "Legacy Code makes each Bug cost $2 of revenue, …" |
| Crunch Time: a Bug stopped by Clean Code | needs a Clean Coder working on a project that isn't Stalled during Crunch Time | "Crunch Time gives each project that isn't Stalled 1 more cube, …" |
| a trained Junior declared red | at 2 players `t` parity fixes the answer; the fix by `⌊t / n⌋` (rejected D7) lost 2p s4's strategy reshuffle; D2-D4 alone hold it in 2 games, but D1's recruits make 2p s4's seat let its Junior go | "a Junior Software Dev with 2 Blue XP and a Red Skill token declared Red makes 1 Red, its Blue XP idle" |
| Attributes kept through a bench discard | 1 game (2p s2): a Talent holding Attributes must be laid off from the bench | "a Talent discarded from the bench keeps its Attributes, and the rival who hires it from the open job market gets them" |
| hire from the agency row to the bench | 1 game (4p s2): the agency row's hire onto a product or the ops team comes first, and money runs short | "a Sales Rep hired from the open job market costs 1 while the agency row has one too, …"; "the Hacker hired from the agency row straight onto a project adds a Bug to it" |
| Patent Trolls: a $5 License | 1 game (2p s4): needs a Greenlight needing a License, the money, and a Tag provider, all during Patent Trolls | "during Patent Trolls a Greenlight License costs $5, …" |
| a milestone claimed: Revenue Leader | an Income of $10 or more comes only at 3p s4 now (2p s4 and 3p s4 before), and Revenue Leader is revealed only in odd seeds | arranged "claims Talent Magnet and Clean Launch … and Revenue Leader at its next Income of $10, …" |
| Training: Leadership Masterclass on a Sales Rep | the target rule sends a Masterclass to a Sales Rep only when `t % 3 === 2` and the seat holds one, while a Junior nearly always takes it first | arranged "plays its %s at t = %i on the %s the target rule picks, …" |
| keep red on a card in the ops team | the graduation step's buttons are pressed in no game now (one keep before) | arranged "makes the graduation choices the auto-player picks, …" |
| (optional) a 4-player Event reshuffle | no 4-player game passes 13 rounds; the Event deck needs 19 | not attempted: it would need a much longer 4-player game |

## 6. Timing

The figure is vitest's `tests` time for `bunx vitest run src/games/startup-simulator.test.ts`. Runs alternate the unchanged a526ffe
(`$S/probe`, detached at a526ffe) with the retune (`$S/work`, branch `final`), one vitest process of mine at a time
(`tools/timing.sh`). Other agents ran their own vitest processes on the same 4 CPUs throughout. From run 4 on, the script waited up to
5 minutes for them to finish before each run; "others" counts the processes still running at the start.

| Pair | a526ffe `tests` | final `tests` | a526ffe CPU | final CPU | others at start (base / final) |
|---|---|---|---|---|---|
| 1 | 30.91 s | **28.77 s** | | | 2 / 1 |
| 2 | 31.21 s | 40.95 s | | | 1 / 1 |
| 3 | 45.47 s | 32.05 s | | | 3 / 2 |
| 4 | 38.20 s | 28.81 s | | | 0 / 0 |
| 5 | 43.67 s | 41.08 s | | | 2 / 2 |
| 6 | **28.38 s** | 29.14 s | | | 1 / 1 |
| 7 | 35.22 s | 29.10 s | 57.4 s | 53.8 s | 2 / 0 |
| 8 | 32.58 s | 29.71 s | 55.5 s | 52.7 s | 0 / 0 |
| 9 | 30.36 s | 28.74 s | 55.5 s | 52.7 s | 0 / 0 |

- **Best of 3** (pairs 1 to 3, the protocol): 30.91 s at a526ffe and 28.77 s with the retune.
- **Best of 9:** 28.38 s and 28.74 s.

The brief's quiet figure is about 26 s at a526ffe. No run here was quiet enough to reach it, so the wall times compare the two only
roughly. Both are within the 30 s watch at their best, though contention pushed single runs to 45 s.

CPU time (user + sys of all vitest processes, from pair 7 on) is steadier under contention, and the retune is 2.8 s (5%) cheaper.
Its long runs play 151 more moves (+3.4%), but two tests stop sooner:

- the Greenlight test plays seeds up to 6, not 10;
- the 3-player seed 2 undo test reaches its board at move 69, not 82.

Plausibly these outweigh the extra moves.

Other runs of `final`, not in the table:

- the functional run before these pairs: 26.92 s;
- the run after the Platform Power line: 31.51 s;
- the full suite: Startup at 52.9 s while 121 files ran in parallel.

## 7. Rejected probes (`drivers/rejected/`)

| Patch | What | Why rejected |
|---|---|---|
| `D1a-intern-first-once-a-turn.patch` (on master) | D1 before every later action, once a turn | took the Brainstorm's action; in `c2`, 2p s4 lost the strategy reshuffle the Review Focus test pins |
| `D1b-intern-not-on-brainstorm-action.patch` (on combo2) | D1 kept off the Brainstorm's action | `c3` and `c5`: the 2-player replay's let-gos fell to 1 log |
| `D1c-intern-only-under-2.patch` (on `8dda20d`) | D1 only with less than $2 | `c9`: 5 targets; keeps the QA Engineer's cleans (2) and the graduation keep (1); but the 2-player replay's reshuffles, strips and let-gos stay at 1 log |
| `D7-trained-junior-declares-by-own-turn.patch` (on combo3) | a trained Junior's declaration answered by `⌊t / n⌋` | `c4`: 2p s4 lost its strategy reshuffle |
| `Dx-toxic-red-only-team.patch` (on master) | Toxic Personality on a team making Red and no Blue | `d4`: no key moved |

## 8. Deliverables and checks

**Files**

- `$S/all-changes.diff` is `git -C $S/work diff master final`.
- `$S/drivers/D1-…D4-….patch` hold one driver each. Each applies to master alone.
- `$S/drivers/D5-tallies-and-comments.patch` holds the tallies, `HELD_BY_FEWER_THAN_TWO` and the comments. It needs D1 to D4 for the
  tests to pass.
- D1 to D5, applied in order, give `final`'s test file exactly. `tools/check_split.sh` checks this.
- `$S/tally-before-after.txt` has every key and replay count, before and after, and each test's list.
- `$S/tools` holds the probe tools:
  - `run.sh`, `probe_patch.py`, `analyse.py`, `allkeys.py`, `heldby.py`, `prose.py`;
  - `trace.sh`, `trace_patch.py`, `turns.py`, `ends.py`;
  - `edit_comments.py`, `edit_pp.py`, `span.py`, `rewrap.py`;
  - `split_drivers.py`, `check_split.sh`, `timing.sh`.
- `$S/out` holds the probe outputs: `base`, `d1f`, `d2`, `d3`, `d6`, `f1-minus-d1`, `c1`-`c9`, `f1`, `final`, and the timing logs.

**Checks**

- The Startup file passes 109 of 109 (`out/final-file2.log`).
- The full suite, run once (`out/full-suite.log`), passes 121 files and 3817 tests, including "loads Startup Simulator with no
  problems, all 306 examples passing".
- `git diff master final` touches only `src/games/startup-simulator.test.ts`.
- No rules file and nothing under `src/engine/**` or `src/utils/**` changed. `game-state.ts`, `flow.ts`, `game-engine.ts` and
  `src/pages/hearts-demo/**` are unchanged.

## Appendix A: the comment hunks, old and new words

**A.1** (line 695 → 695)

```diff
  * - **Free moves** come first in the actions phase, each at most once a turn. While its development has fewer than 3, it greenlights
  *   the first backlog card whose press is allowed, Tier 2 and 3 included, but an idea Domain Expertise cuts before any other. Then it
  *   plays the first card of its Strategy Hand that has a target the rules take, in its bench, development team or ops team, of the
- *   Training cards on any turn and of the Buffs too on a turn when `t % 3 === 0`: a Leadership Masterclass on the first such target of
- *   the kind `t % 3` names (a Junior, a QA Engineer or a Sales Rep), else on the first such target; a Workaholic on the first that makes
- *   some colour, a Clean Coder on the Hacker, else on an attaching card in the ops team, and a Visionary on a Junior on a Stalled
- *   project, each else on the one at `t` (mod how many) among them, as any other card is (see `training`, §20.A). Then it plays the first
- *   Debuff of its Strategy Hand that has a target the rules take, on the rival card at `t` (mod how many) among them (see `debuffing`).
- *   Then one Utility card at most: a TechCrunch Feature it can pay for, on its first product a working Sales Rep pitches when it can pay
- *   for that one, else on its product at `t` (mod how many) among those it can pay for; else, on a turn when `t % 3 === 0`, a Design
- *   Sprint (see `utility`). It dismisses the ops team's first card it can spare when `t % 9 === 4` and the development team's first
- *   when `t % 9 === 8`. In the last round, with the Market Crash in the crash pile, it dismisses on an even `t` the ops team's first
- *   card that gives Blue or Red bandwidth, once a turn (see `lastRound`): a path-driver, not play, that sends a seat short so that the
- *   final check has a choice to make (see below).
+ *   Training cards and the Workaholic on any turn and of the other Buffs too on a turn when `t % 3 === 0` (the second retune's D3): a
+ *   Leadership Masterclass on the first such target of the kind `t % 3` names (a Junior, a QA Engineer or a Sales Rep), else on the
+ *   first such target; a Workaholic on the first that makes some colour, a Clean Coder on the Hacker, else on an attaching card in the
+ *   ops team, and a Visionary on a Junior on a Stalled project, each else on the one at `t` (mod how many) among them, as any other
+ *   card is (see `training`, §20.A). Then it plays the first Debuff of its Strategy Hand that has a target the rules take, on the rival
+ *   card at `t` (mod how many) among them (see `debuffing`). Then one Utility card at most: a TechCrunch Feature it can pay for, on its
+ *   first product a working Sales Rep pitches when it can pay for that one, else on its product at `t` (mod how many) among those it
+ *   can pay for; else, on a turn when `t % 3 === 0`, a Design Sprint (see `utility`). It dismisses the ops team's first card it can
+ *   spare when `t % 9 === 4` and the development team's first when `t % 9 === 8`. In the last round, with the Market Crash in the crash
+ *   pile, it dismisses on an even `t` the ops team's first card that gives Blue or Red bandwidth, once a turn (see `lastRound`): a
+ *   path-driver, not play, that sends a seat short so that the final check has a choice to make (see below).
  * - **The first action** launches the first project the engine takes (see `launch`), else it is an Ideation. A seat that researches and
- *   runs no product yet first researches the seed deck, else drafts the seed market's first card, since a Tier 1 card is what it can build
- *   (the retune's D2). Else the Ideation goes by `t % 4`: a growth idea (0 and 2), draft from the growth market (1), or (3) by
- *   `⌊t / 4⌋ % 3` research the seed deck, draft from the seed market or draft the open idea pool's first card. A growth idea researches
- *   the growth deck when the `style` researches, and drafts from the growth market when it drafts. A draft from a market takes a hybrid
- *   Domain Expertise cuts, else an idea it cuts, else the market's first. When the rules refuse that, it tries researching the growth
- *   deck, drafting from the growth market, researching the seed deck and drafting from the seed market, in that order, and with none
- *   allowed it recruits instead.
- * - **Each later action** first tries to reassign the Diva while she works for the seat, which her Ego refuses at no cost
- *   (§20.B.1). Then it launches the first project the engine takes, which a Tier 2 or 3 project needs to be fully led for as well as
- *   complete (P11), so that the Diva may go to the ops team with her team. Else it puts QA on its first project with Bugs that no QA
- *   on it cleans and that isn't Stalled, since a project with Bugs can't Launch (§6): the bench's first card that would clean them
- *   (see `qaForBugs`). Else, when the action by `(t + a) % 9` below is 0, the recruit, it hires instead the agency row's first
- *   attaching card it can pay for, the Growth Hacker or a Sales Rep, onto its first product in operation (see `hireGrowthHacker`).
- *   Else it hires the Hacker from the agency row, when it can pay for him, onto its first project that needs blue cubes and no red
- *   (see `hireHacker`). Else, once a turn when `t % 4 === 1`, it reassigns the first card of its ops team that sits on a product to
- *   its first other product (see `moveGrowthHacker`). Else, when `t % 3 === 1`, it assigns the bench's first PM to its project with
- *   the most cards on it (see `pmToProject`). Else it pivots the project the Diva is on, which fires her (ruling 9), and it
- *   assigns her from the bench to the ops team, where her Ego refuses a reassign too. Else it hires the agency row's Diva onto its first
- *   project when it can pay for her (see `hireDiva`). Else it assigns the bench's makers of a colour its first open project lacks, a
- *   project with a cut first, to that project (see `makersToProject`). Else, when `(t + a) % 5 === 2`, it Brainstorms (see
- *   `brainstorming`). With none of those, it assigns the bench's makers of a color its first Tier 1 project with a cut lacks to that
- *   project (see `buildCut`), else it finds a lead for its first Stalled project (§3): the bench's first Senior Developer who would lead a
- *   colour it needs, assigned to it, else the agency row's first such Senior it can pay for, hired onto it, else the open job market's
- *   first, hired when it has the $1 the hire costs, else a Layoff of the bench's first card, which digs the talent deck for one. With no
- *   Stalled project, it is one by `(t + a) % 9`:
+ *   runs no product yet first researches the seed deck, else drafts the seed market's first card, since a Tier 1 card is what it can
+ *   build (the first retune's D2). Else the Ideation goes by `t % 4`: a growth idea (0 and 2), draft from the growth market (1), or (3)
+ *   by `⌊t / 4⌋ % 3` research the seed deck, draft from the seed market or draft the open idea pool's first card. A growth idea
+ *   researches the growth deck when the `style` researches, and drafts from the growth market when it drafts. A draft from a market
+ *   takes a hybrid Domain Expertise cuts, else an idea it cuts, else the market's first. When the rules refuse that, it tries
+ *   researching the growth deck, drafting from the growth market, researching the seed deck and drafting from the seed market, in that
+ *   order, and with none allowed it recruits instead.
+ * - **Each later action** first tries to reassign the Diva while she works for the seat, which her Ego refuses at no cost (§20.B.1).
+ *   Then it launches the first project the engine takes, which a Tier 2 or 3 project needs to be fully led for as well as complete
+ *   (P11), so that the Diva may go to the ops team with her team. Else, as its last action while Intern Season makes a recruit free, it
+ *   recruits the Junior a recruit below would (see `internRecruit`, the second retune's D1). Else it puts QA on its first project with
+ *   Bugs that no QA on it cleans and that isn't Stalled, since a project with Bugs can't Launch (§6): the bench's first card that would
+ *   clean them (see `qaForBugs`). Else, when the action by `(t + a) % 9` below is 0, the recruit, it hires instead the agency row's
+ *   first attaching card it can pay for, the Growth Hacker or a Sales Rep, onto its first product in operation (see
+ *   `hireGrowthHacker`). Else it hires the Hacker from the agency row, when it can pay for him, onto its first project that needs blue
+ *   cubes and no red (see `hireHacker`). Else, once a turn when `⌊t / n⌋` is odd, n the seats, it reassigns the first card of its ops
+ *   team that sits on a product to its first other product (see `moveGrowthHacker`). Else, when `t % 3 === 1`, it assigns the bench's
+ *   first PM to its project with the most cards on it (see `pmToProject`). Else it pivots the project the Diva is on, which fires her
+ *   (ruling 9), and it assigns her from the bench to the ops team, where her Ego refuses a reassign too. Else it hires the agency row's
+ *   Diva onto its first project when it can pay for her (see `hireDiva`). Else it assigns the bench's makers of a colour its first open
+ *   project lacks, a project with a cut first, to that project (see `makersToProject`). Else, when `(t + a) % 5 === 2`, it Brainstorms
+ *   (see `brainstorming`). With none of those, it assigns the bench's makers of a color its first Tier 1 project with a cut lacks to
+ *   that project (see `buildCut`), else it finds a lead for its first Stalled project (§3): the bench's first Senior Developer who
+ *   would lead a colour it needs, assigned to it, else the agency row's first such Senior it can pay for, hired onto it, else the open
+ *   job market's first, hired when it has the $1 the hire costs, else a Layoff of the bench's first card, which digs the talent deck
+ *   for one. With no Stalled project, it is one by `(t + a) % 9`:
  *   0. recruit the Junior of kind `(t + ⌊t / 9⌋) % 3` (`(t + a) % 3` is 0 whenever `(t + a) % 9` is);
  *   1. hire the first agency Senior Developer it can pay for, else the first agency card it can pay for, to its bench, its first
  *      project or its ops team, by `(t + ⌊t / 9⌋) % 3`; to the ops team by its first product's button when the card attaches or
```

**A.2** (line 767 → 768)

```diff
  *   When the rules refuse that, or it has nothing to pick, it tries the next of those places in that order, and with none it passes
  *   on the rest (see `sourcing`).
  * - In research it keeps a hybrid Domain Expertise cuts, else an idea it cuts, else the research row's card at `t` (mod the row's
- *   length). In the brainstorm step it keeps the row's first card the runs play (a Training card, an Attribute, a TechCrunch Feature or
- *   a Design Sprint: see `isPlayable`), else the row's card at `t` (mod the row's length) (§6). In the backlog cleanup it discards the
- *   first card Domain Expertise doesn't cut, else the row's first; in the strategy cleanup, the first card the runs don't play, else
- *   the row's first; in the bench cleanup, the row's first.
+ *   length). In the brainstorm step it keeps a TechCrunch Feature (the second retune's D2), else the row's first card the runs play (a
+ *   Training card, an Attribute or a Design Sprint: see `isPlayable`), else the row's card at `t` (mod the row's length) (§6). In the
+ *   backlog cleanup it discards the first card Domain Expertise doesn't cut, else the row's first; in the strategy cleanup, the first
+ *   card the runs don't play, else the row's first; in the bench cleanup, the row's first.
  *
  * A hire's place goes by `(t + ⌊t / 9⌋) % 3`, not `t % 3`: the action that hires from the agency row comes only when `t % 9` is 0
  * or 8, and the Layoff before a sourcing only when it is 6 or 7, so `t % 3` would never send either to one of its three places.
```

**A.3** (line 1547 → 1565)

```diff
 /**
  * Paths (tally keys, and `REPLAYED` counts of the replay tests) that fewer than 2 of the long runs' 20 games hold once the Event deck
  * replays every seeded game (plan 6-2b): counted, not required, as plan 6-2a's precedent has it, each pinned by its examples or the
- * arranged test named here. A later cadence change may promote them.
- * - None: Attributes kept through a bench discard ('a Talent discarded from the bench keeps its Attributes, and the rival who hires it
- *   from the open job market gets them'); Toxic taking a Red cube ('a team that makes no Blue loses a Red cube to Toxic Personality');
- *   the agency row's hire to the bench ('a Sales Rep hired from the open job market costs 1 while the agency row has one too, and the
- *   agency row keeps its own'; the agency row's own hires: 'the Hacker hired from the agency row straight onto a project adds a Bug to
- *   it'); the Engineer paid $1 in the ops team ('the Engineer's salary is $1 in the ops team'); a TechCrunch Feature in a 3-player log
- *   (the 2-player replay rebuilds one, seed 4; 'TechCrunch Feature adds 1 Hype to one of the player's products for $5 and no
- *   action, or $2 when a working Sales Rep is on that product'); Legacy Code at an Income ('Legacy Code makes each Bug cost $2 of
- *   revenue, …'); a Crunch Time Bug stopped by Clean Code ('Crunch Time gives each project that isn't Stalled 1 more cube, …'); a
- *   TechCrunch Feature under Trade Show ('during Trade Show TechCrunch Feature costs $2, …').
- * - One game: TechCrunch for $5 (2 players seed 4; the TechCrunch example above); a trained Junior declared red (5 players seed 2);
- *   Workaholic played (5 players seed 5; 'Workaholic gives +2 output in the colour its staff member makes and +$2 salary'); the
- *   reassign from the ops team to a product in operation (3 players seed 4; 'the Growth Hacker reassigned to another product is
- *   onboarding, …'); Intern Season's free recruit (2 players seed 4; 'during Intern Season recruiting from the University costs $0,
- *   …'); and Patent Trolls' $5 License (2 players seed 4; 'during Patent Trolls a Greenlight License costs $5, …').
+ * arranged test named here. A later cadence change may promote them, as the second retune promoted six: TechCrunch for $5, a TechCrunch
+ * Feature in a 3-player log and one at Trade Show's $2, Workaholic played, the reassign from the ops team to a product in operation and
+ * Intern Season's free recruit.
+ * - None: Toxic taking a Red cube ('a team that makes no Blue loses a Red cube to Toxic Personality'); the Engineer paid $1 in the ops
+ *   team ('the Engineer's salary is $1 in the ops team'); Legacy Code at an Income ('Legacy Code makes each Bug cost $2 of revenue,
+ *   …'); a Crunch Time Bug stopped by Clean Code ('Crunch Time gives each project that isn't Stalled 1 more cube, …'); a trained Junior
+ *   declared red, which 5 players seed 2 held until the second retune's Intern Season recruit changed that game ('a Junior Software Dev
+ *   with 2 Blue XP and a Red Skill token declared Red makes 1 Red, its Blue XP idle').
+ * - One game: Attributes kept through a bench discard (2 players seed 2; 'a Talent discarded from the bench keeps its Attributes, and
+ *   the rival who hires it from the open job market gets them'); the agency row's hire to the bench (4 players seed 2; 'a Sales Rep
+ *   hired from the open job market costs 1 while the agency row has one too, and the agency row keeps its own'; the agency row's own
+ *   hires: 'the Hacker hired from the agency row straight onto a project adds a Bug to it'); and Patent Trolls' $5 License (2 players
+ *   seed 4; 'during Patent Trolls a Greenlight License costs $5, …').
  */
 const HELD_BY_FEWER_THAN_TWO = new Set<string>([
   'Attributes kept through a bench discard',
   'Toxic: a Red cube taken',
   'hire a card from the agency row to their bench',
   'the Engineer paid 1 in the ops team',
-  'TechCrunch Features',
   'Legacy Code at an Income',
   'Crunch Time: a Bug stopped by Clean Code',
-  'Trade Show: a TechCrunch Feature for $2',
-  'TechCrunch for $5',
   'a trained Junior declared red',
-  'an Attribute played: Workaholic',
-  'reassign a card from their ops team to a card in their operations',
-  'Intern Season: a free recruit',
   'Patent Trolls: a $5 License',
 ]);
 
```

**A.4** (line 3931 → 3941)

```diff
       //   products in operation ('cleans the Bug the auto-player picks when ops QA can’t clean them all, …');
       // - the graduation step's keep and Mentor presses: a Junior earns a Pending token of a second colour only by working in it, which
       //   takes a Skill token, and it must then Launch with it (P8) ('makes the graduation choices the auto-player picks, …');
-      // - the bench's discard: the retuned seats put their makers on projects first, so no bench overflows (the retune's D3) ('discards
-      //   the bench’s first card at the bench cleanup once it ends its actions with more than 5 there, …');
+      // - the bench's discard: the retuned seats put their makers on projects first, so no bench overflows (the first retune's D3)
+      //   ('discards the bench’s first card at the bench cleanup once it ends its actions with more than 5 there, …');
       // - the agency row's hire to the ops team: a seat with a product hires onto it, and the cycle seldom comes to the hire while one
-      //   without has a Senior's price (the retune's D3) ('hires the agency row’s first Senior it can pay for to the ops team when it
-      //   can’t go to a product, …');
-      // - the scouting's hire to the ops team: the Buffs' spending leaves it to two games (3 and 4 players seed 4; it was held by three)
-      //   under every Buff cadence that keeps the other tests (plan 6-2a's pre-flight) ('hires the card a Layoff found to the ops team
-      //   while it has a product, …').
-      // Held by none, the fewest: the agency row's hire to the bench, and by one game: the reassign from one product to another (3
-      // players seed 4), both in `HELD_BY_FEWER_THAN_TWO` once plan 6-2b's Event deck replayed every game; by two games: the TechCrunch
-      // Feature (2 and 4 players, seed 4); by three each: the scouting's hire onto a product (2, 4 and 5 players seed 4) and the agency
-      // row's hire onto a product (3, 4 and 5 players seed 4); by four each: the strategy cleanup's discard (2 players seeds 1 and 2, 3
-      // players seed 5, 5 players seed 4) and a let-go in the event check (2 players seeds 1 and 4, 3 players seeds 1 and 3); by five
-      // each: the assign onto a product (2 and 3 players seed 4, 4 players seeds 1, 2 and 4) and the ops team's let go (2 players seeds 2
-      // and 4, 3 players seeds 2 and 5, 4 players seed 4); by six each: the assign to the ops team and the ops check's switch on; by eight
-      // each: the scouting's hire to the bench and the ops check's confirm; the Design Sprint by ten, the flushing Brainstorm by thirteen
-      // and the Debuff by fourteen. A failure here means a cadence moved: retune the auto-player, never the rules.
+      //   without has a Senior's price (the first retune's D3) ('hires the agency row’s first Senior it can pay for to the ops team
+      //   when it can’t go to a product, …');
+      // - the scouting's hire to the ops team: the Buffs' spending left it to two games under every Buff cadence that kept the other
+      //   tests (plan 6-2a's pre-flight), and the second retune's seats make it in three (2 players seed 2, 4 players seeds 2 and 4)
+      //   ('hires the card a Layoff found to the ops team while it has a product, …').
+      // Held by one game, the fewest: the agency row's hire to the bench (4 players seed 2), in `HELD_BY_FEWER_THAN_TWO` once plan
+      // 6-2b's Event deck replayed every game; by three: the reassign from one product to another (2 players seeds 2 and 4, 3 players
+      // seed 4), which the second retune promoted; by four each: the strategy cleanup's discard (2 players seed 1, 3 players seeds 4
+      // and 5, 5 players seed 4) and the scouting's hire onto a product (2 players seeds 2 and 4, 4 and 5 players seed 4); by five
+      // each: the agency row's hire onto a product (3 players seed 4, 4 and 5 players seeds 2 and 4) and the ops team's declaration (2
+      // and 3 players, seeds 2 and 4, 4 players seed 4); by six each: a let-go in the event check (2 players seeds 1, 2 and 4, 3
+      // players seeds 1, 2 and 3) and the ops team's let go (2 players seeds 2 and 4, 3 players seeds 2 and 5, 4 players seeds 2 and
+      // 4); by seven: the assign onto a product; by eight each: the assign to the ops team and the ops check's switch on and confirm;
+      // by nine: the TechCrunch Feature; by ten each: the scouting's hire to the bench and the Design Sprint; the flushing Brainstorm
+      // by thirteen and the Debuff by fifteen. A failure here means a cadence moved: retune the auto-player, never the rules.
       expect(every.filter((key) => !(tally[key] > 0) && !HELD_BY_FEWER_THAN_TWO.has(key)), `never made or seen: ${JSON.stringify(tally)}`).toEqual([]);
     });
 
```

**A.5** (line 3962 → 3973; the hunk takes in the test "played slice 3 in those runs: Tier 2 and 3 greenlit and launched, Licenses paid to the only provider, the cut …")

```diff
       expect(Object.keys(played).filter((what) => !(played[what as keyof typeof played] > 0)), JSON.stringify(played)).toEqual([]);
     });
 
-    it('played slice 3 in those runs: Tier 2 and 3 greenlit and launched, Licenses paid to the only provider, the cut filled in and chosen three ways and launched, Stalled projects at the Engine, the Diva refused a reassign from a project and fired by a pivot, and the Engineer paid $1 in the ops team', () => {
+    it('played slice 3 in those runs: Tier 2 and 3 greenlit and launched, Licenses paid to the only provider and to a chosen one, the cut filled in and chosen three ways and launched, Stalled projects at the Engine, the Diva refused a reassign from a project and fired by a pivot, and the Engineer paid $1 in the ops team', () => {
       const paths = [
-        GROWTH_GREENLIT, GROWTH_LAUNCHED, LICENSE_TO_THE_ONLY_PROVIDER,
+        GROWTH_GREENLIT, GROWTH_LAUNCHED, LICENSE_TO_THE_ONLY_PROVIDER, LICENSE_TO_A_CHOSEN_PROVIDER,
         CUT_FILLED_IN, CUT_CHOSEN, 'the cut: Cut 2 blue', 'the cut: Cut 2 red', 'the cut: Cut 1 of each', CUT_LAUNCHED,
         STALLED_AT_THE_ENGINE, DIVA_REFUSED[REASSIGN_FROM_PROJECT], DIVA_PIVOTED, ENGINEER_IN_OPS,
       ];
-      // Two Licenses in one Greenlight takes a Tier 3 card whose both Tags the mover lacks; it is counted, but not required, and examples
-      // pin it. So are these two, each pinned by its examples and by the arranged test below of the auto-player's press named here:
-      // - LICENSE_TO_A_CHOSEN_PROVIDER, a License paid to a provider chosen among several: two rivals must run products of the Tag a
-      //   seat's Greenlight lacks, and the Strategy deck's shuffle at Setup replayed every game from plan 5-2b's Task 1 on (P7) ('names
-      //   the provider it pays a License to by t when two rivals provide the Tag, …');
-      // - DIVA_REFUSED[REASSIGN_FROM_OPS], the Diva refused a reassign from the ops team: she must reach the ops team, from the bench or
-      //   with her project's Launch, and the Milestones' shuffle at Setup replayed every game again at plan 5-2b's Task 3 (P7) ('tries
-      //   the Diva’s reassign from the ops team before each later action, …').
-      // Held by none, the fewest: the Engineer paid $1 in the ops team (in `HELD_BY_FEWER_THAN_TWO` once plan 6-2b's Event deck replayed
-      // every game); by two games each: a Tier 2 or 3 card launched (2 and 3 players, seed 4); by three: a project launched with a cut
-      // (2 players seeds 2 and 4, 3 players seed 4); by four each: the Diva refused a reassign from a project and fired by a pivot (every
-      // player count, seed 3); by five each: Cut 2 red (2 players seeds 2 and 4, 4 players seed 4, 5 players seeds 2 and 4), Cut 2 blue
-      // (2 players seed 4, 3 players seeds 2 and 4, 4 players seed 4, 5 players seed 5) and the cut filled in (the same games as Cut 2
-      // blue); by six: Cut 1 of each (2 players seed 2, 3 players seeds 4 and 5, 4 players seed 5, 5 players seeds 2 and 4); by nine
-      // each: a cut chosen among options and a License paid to the only provider. A failure here means a cadence moved: retune the
-      // auto-player, never the rules.
+      // Two Licenses in one Greenlight takes a Tier 3 card whose both Tags the mover lacks; it is counted, but not required, and
+      // examples pin it. So is DIVA_REFUSED[REASSIGN_FROM_OPS], the Diva refused a reassign from the ops team, pinned by its examples
+      // and by the arranged test 'tries the Diva’s reassign from the ops team before each later action, …' below: she must reach the
+      // ops team, from the bench or with her project's Launch, and the Milestones' shuffle at Setup replayed every game again at plan
+      // 5-2b's Task 3 (P7). LICENSE_TO_A_CHOSEN_PROVIDER, a License paid to a provider chosen among several, was counted too while one
+      // game held it (two rivals must run products of the Tag a seat's Greenlight lacks); the second retune's seats pay one in two
+      // games, so it is required, and the arranged test 'names the provider it pays a License to by t when two rivals provide the Tag,
+      // …' below still answers its choice each way.
+      // Held by none, the fewest: the Engineer paid $1 in the ops team (in `HELD_BY_FEWER_THAN_TWO` once plan 6-2b's Event deck
+      // replayed every game); by two: a License paid to a chosen provider (3 players seed 2, 4 players seed 4); by three: a project
+      // launched with a cut (2 players seeds 2 and 4, 3 players seed 4); by four each: the Diva refused a reassign from a project and
+      // fired by a pivot (every player count, seed 3) and the cut filled in (2, 3 and 4 players seed 4, 5 players seed 5); by six each:
+      // a Tier 2 or 3 card launched (2 and 3 players, seeds 2 and 4, 4 and 5 players seed 2), Cut 2 red (2, 4 and 5 players, seeds 2
+      // and 4), Cut 2 blue (2 players seed 4, 3 players seeds 2 and 4, 4 players seed 4, 5 players seeds 2 and 5) and Cut 1 of each (2
+      // players seed 2, 3 players seeds 2, 4 and 5, 4 players seeds 2 and 5); by ten: a cut chosen among options; by twelve: a License
+      // paid to the only provider. A failure here means a cadence moved: retune the auto-player, never the rules.
       expect(paths.filter((key) => !(tally[key] > 0) && !HELD_BY_FEWER_THAN_TWO.has(key)), `never seen: ${JSON.stringify(tally)}`).toEqual([]);
     });
 
```

**A.6** (line 4006 → 4017; the hunk takes in the test "played slice 5’s talent in those runs: Pending tokens gained and graduated, returned by pivots and stripped fr…")

```diff
       // - EARNING_LESS, a product earning less for its Bugs;
       // - GROWTH_HACKER_EARNED, the Growth Hacker's $3 earned;
       // - CLEANED_IN_OPS, a Bug cleaned in operations by itself.
-      // Held by five games, the fewest: a mode forgotten on a bench (2 players seeds 1 and 4, 3 players seeds 1 and 2, 4 players seed 4);
-      // by eight each: a mode declared QA (2 players seeds 1, 4 and 5, 3 players seeds 2, 4 and 5, 5 players seeds 3 and 4), a Bug cleaned
-      // on a project and an offline product at Income; by nine each: a mode declared Red and a Bug added to a project; a product switched
-      // off at the final check by twelve. A failure here means a cadence moved: retune the auto-player, never the rules.
+      // Held by five games, the fewest: a mode forgotten on a bench (2 and 3 players, seeds 1 and 2, 4 players seed 4); by eight each:
+      // a Bug cleaned on a project and an offline product at Income; by nine each: a mode declared QA (2 players seeds 1, 2, 4 and 5, 3
+      // players seeds 2, 4 and 5, 5 players seeds 3 and 4), a mode declared Red and a Bug added to a project; a product switched off at
+      // the final check by twelve. A failure here means a cadence moved: retune the auto-player, never the rules.
       expect(paths.filter((key) => !(tally[key] > 0) && !HELD_BY_FEWER_THAN_TWO.has(key)), `never seen: ${JSON.stringify(tally)}`).toEqual([]);
     });
 
-    it('played slice 5’s talent in those runs: Pending tokens gained and graduated, returned by pivots and stripped from fired staff, Synergy and the Sales Rep’s bonus', () => {
+    it('played slice 5’s talent in those runs: Pending tokens gained and graduated, returned by pivots and stripped from fired staff, Synergy, the Sales Rep’s bonus and a Junior PM promoted at a Launch', () => {
       const paths = [
         ...PENDING.map((name) => `${PENDING_GAINED}: ${name.slice('pending '.length)}`), GRADUATED, PIVOT_RETURNED, STRIPPED, SYNERGY,
-        SALES_BONUS, EXPERIENCED_PAID,
+        SALES_BONUS, EXPERIENCED_PAID, PROMOTED,
       ];
       // Counted, but not required, each pinned by its examples and by the arranged test below of the auto-player's presses named here:
       // - a token kept by choice and the Mentor's second token: a Junior gains a Pending token of a second colour only by working in it,
       //   which takes a Skill token from Training, and it must then Launch holding both (plan 5-2b's P8) ('makes the graduation choices
       //   the auto-player picks, …');
-      // - a Junior PM promoted at a Launch: a Junior PM must be on a Tier 2 or 3 team that Launches ('claims First Mover Advantage,
-      //   Platform Power and Full Stack Founder at one auto-player Launch of a Tier 2 card, which promotes its Junior PM, …');
       // - the Agile spare: only the one Senior PM is Agile until Agile Workshop badges a Junior PM, which no run plays (P8), and none of
       //   the runs moves a card onto a team it manages in a move that starts no turn ('reassigns a spare QA Engineer from the ops team
       //   onto the project the Senior PM manages, …').
-      // A Bug cleaned by a QA Engineer is counted too: a QA Engineer must be on a project with Bugs. Examples pin it.
-      // Held by three games, the fewest: an experienced Junior paid (2 players seeds 2 and 4, 3 players seed 4); by four: the Sales Rep's
-      // bonus (every player count 2 to 5, seed 4); by six: Pending tokens returned by a pivot (2 players seeds 1 and 3, 3 players seeds 1
-      // and 2, 4 players seeds 2 and 3); Synergy at the Engine by eight. A failure here means a cadence moved: retune the auto-player,
-      // never the rules.
+      // A Bug cleaned by a QA Engineer is counted too: a QA Engineer must be on a project with Bugs (three games held one before the
+      // second retune; none now). Examples pin it. A Junior PM promoted at a Launch, counted while no game held one (a Junior PM must
+      // be on a Tier 2 or 3 team that Launches), is required since the second retune's seats promote one in two games.
+      // Held by two games, the fewest: a Junior PM promoted at a Launch (2 and 3 players, seed 2); by five: an experienced Junior paid
+      // (2 and 3 players, seeds 2 and 4, 4 players seed 2); by seven each: the Sales Rep's bonus (2 players seeds 2 and 4, 3 players
+      // seed 4, 4 and 5 players seeds 2 and 4) and Pending tokens returned by a pivot (2 players seeds 1, 2 and 3, 3 players seeds 1
+      // and 2, 4 players seed 3, 5 players seed 2); Synergy at the Engine by nine. A failure here means a cadence moved: retune the
+      // auto-player, never the rules.
       expect(paths.filter((key) => !(tally[key] > 0) && !HELD_BY_FEWER_THAN_TWO.has(key)), `never seen: ${JSON.stringify(tally)}`).toEqual([]);
     });
 
-    it('played slice 5’s Strategy and Milestones in those runs: Brainstorms of 2, a reshuffle and the cleanup, Training on Juniors and on a Sales Rep, trained Juniors declared in each colour they lacked, the Sales Rep’s XP bonus, and Clean Launch claimed', () => {
+    it('played slice 5’s Strategy and Milestones in those runs: Brainstorms of 2, a reshuffle and the cleanup, Training on Juniors and on a Sales Rep, trained Juniors declared in each colour they lacked, the Sales Rep’s XP bonus, and Clean Launch and Platform Power claimed', () => {
       const paths = [
         `${BRAINSTORM_DRAWING} 2`, DISCARDED_AT_CLEANUP,
         ...['Full Stack Bootcamp', 'QA Certification', 'Leadership Masterclass'].map((name) => `${TRAINING_ON}: ${name} on a Junior`),
         `${TRAINING_ON}: Sales Seminar on a Sales Rep`,
         ...['blue', 'red', 'qa'].map((answer) => `${TRAINED_DECLARED} ${answer}`),
-        BADGED_LEADING, SALES_XP_BONUS, `${CLAIMED}: Clean Launch`,
+        BADGED_LEADING, SALES_XP_BONUS, `${CLAIMED}: Clean Launch`, `${CLAIMED}: Platform Power`,
       ];
       // Counted, but not required, each pinned by its examples (plan 5-2b's P8):
-      // - the reshuffle: only 2, 4 and 5 players seed 4 run their Strategy deck dry, once each, and 'leaves no id a seat saw face up in the
-      //   strategy discard in the strategy deck, …' below pins the reshuffle at 2 players seed 4 (the retune's D3);
+      // - the reshuffle: only five games run their Strategy deck dry, once each (2 players seeds 2 and 4, 3 players seed 2, 4 and 5
+      //   players seed 4), and 'leaves no id a seat saw face up in the strategy discard in the strategy deck, …' below pins the
+      //   reshuffle at 2 players seed 4 (the first retune's D3);
       // - a Brainstorm drawing 3: a PM must be working on the seat's Board, and a seat seldom keeps one there;
       // - a single Strategy card kept at once: the deck and its discard must hold one card between them;
       // - QA Certification and Leadership Masterclass on a QA Engineer, the Masterclass on a Sales Rep, and Agile Workshop on a Junior
```

**A.7** (line 4053 → 4066)

```diff
       //   or a Masterclass first, so the arranged test 'plays its %s at t = %i on the %s the target rule picks, …' below plays each;
       // - Bug Decay stopped by a QA Engineer or waived by a VP of Sales: each needs one Training card, or two, on one card that then works
       //   where it matters;
-      // - First Mover Advantage, Platform Power and Full Stack Founder: held by two games (2 and 3 players seed 4), one (2 players seed 2)
-      //   and four (2 players seeds 2 and 4, 4 players seed 4, 5 players seed 2) (the arranged test 'claims First Mover Advantage,
-      //   Platform Power and Full Stack Founder at one auto-player Launch of a Tier 2 card, …' below claims all three, and 'claims
-      //   Platform Power only once the seat has chosen which products its ops check runs, …' Platform Power again);
+      // - First Mover Advantage and Full Stack Founder: held by two games (2 and 3 players, seed 4) and four (2 players seed 4, 3
+      //   players seed 2, 4 players seeds 2 and 4) (the arranged test 'claims First Mover Advantage, Platform Power and Full Stack
+      //   Founder at one auto-player Launch of a Tier 2 card, …' below claims all three, and 'claims Platform Power only once the seat
+      //   has chosen which products its ops check runs, …' Platform Power again). Platform Power was counted with them while one game
+      //   held it (2 players seed 2); the second retune's seats claim it in two, so it is required;
       // - Revenue Leader and Talent Magnet: no run claims either now (an Income comes to $10 seldom, and Setup reveals no Talent Magnet at
       //   seeds 1 to 5) (the arranged test 'claims Talent Magnet and Clean Launch at an auto-player Launch that graduates a second Junior
       //   to 3 XP, and Revenue Leader at its next Income of $10, …' below claims both);
       // - a Milestone claimed at the last check: one must be met only as the final Ops check brings products back online (the arranged
       //   test 'rebuilds and takes back Platform Power claimed at the last check, …' below claims one).
-      // Held by none, the fewest: a trained Junior declared red, but by one game (5 players seed 2), in `HELD_BY_FEWER_THAN_TWO` once
-      // plan 6-2b's Event deck replayed every game; by three each: Sales Seminar on a Sales Rep and the Sales Rep's XP bonus (2, 3 and 4
-      // players, seed 4); by four each: a trained Junior declared blue (2 and 3 players, seeds 1 and 2) and a strategy card discarded at
-      // cleanup (2 players seeds 1 and 2, 3 players seed 5, 5 players seed 4); by five: a badged Junior leading at the Engine (2, 3 and 4
-      // players seed 4, 5 players seeds 2 and 4); by seven: a trained Junior declared qa; Leadership Masterclass on a Junior by ten. A
-      // failure here means a cadence moved: retune the auto-player, never the rules.
+      // Held by none, the fewest: a trained Junior declared red (in `HELD_BY_FEWER_THAN_TWO` once plan 6-2b's Event deck replayed every
+      // game; one game, 5 players seed 2, held it until the second retune's Intern Season recruit changed that game); by two: Platform
+      // Power claimed (3 and 4 players, seed 2); by three each: Sales Seminar on a Sales Rep and the Sales Rep's XP bonus (2, 3 and 4
+      // players, seed 4) and a trained Junior declared blue (2 players seeds 1 and 2, 3 players seed 1); by four: a strategy card
+      // discarded at cleanup (2 players seed 1, 3 players seeds 4 and 5, 5 players seed 4); by six each: a badged Junior leading at the
+      // Engine (2 players seeds 2 and 4, 3 players seed 3, 4 players seed 4, 5 players seeds 2 and 4) and Full Stack Bootcamp on a
+      // Junior; by seven: a trained Junior declared qa; Leadership Masterclass on a Junior by ten. A failure here means a cadence
+      // moved: retune the auto-player, never the rules.
       expect(paths.filter((key) => !(tally[key] > 0) && !HELD_BY_FEWER_THAN_TWO.has(key)), `never seen: ${JSON.stringify(tally)}`).toEqual([]);
     });
 
```

**A.8** (line 4075 → 4091)

```diff
       const paths = [
         ...[...BUFFS, ...DEBUFFS].map((name) => `${ATTRIBUTE_PLAYED}: ${name}`), BUFF_ON_BENCH, BUFF_ON_BOARD, DEBUFF_ON_DEV, DEBUFF_ON_OPS,
         ATTRIBUTES_FIRED, ATTRIBUTES_KEPT, TOXIC_RED, BURNOUT_IDLE, TECHCRUNCH_5, HYPE_SCORED, SPRINT_5, SPRINT_FEWER,
+        WORKAHOLIC_AT_ENGINE, TOXIC_OPS,
       ];
-      // Counted, but not required, each held by one game or none, and each pinned by its examples or by the arranged test named here. Each
-      // needs a card played on the one kind of target it works on, or a Talent holding Attributes to take one road out, and the runs play
-      // few such cards: the Buffs only on turns with t % 3 === 0, the Debuffs on the rival card t picks, a TechCrunch Feature on a pitched
-      // product only when a Sales Rep sits on one. Retargeting them cost other tests' keys in plan 6-2a's pre-flight.
+      // Counted, but not required, each held by one game or none, and each pinned by its examples or by the arranged test named here.
+      // Each needs a card played on the one kind of target it works on, or a Talent holding Attributes to take one road out, and the
+      // runs play few such cards: the Buffs but the Workaholic only on turns with t % 3 === 0, the Debuffs on the rival card t picks, a
+      // TechCrunch Feature on a pitched product only when a Sales Rep sits on one. Retargeting them cost other tests' keys in plan
+      // 6-2a's pre-flight. (A Workaholic's +2 at the Engine and Toxic Personality in the ops team were counted so too, until the second
+      // retune's seats held them in five games and two: they are required now.)
       // - Attributes rehired (none): the example 'a Talent discarded from the bench keeps its Attributes, and the rival who hires it from
       //   the open job market gets them, …';
-      // - Attributes boxed with an evicted Talent (none): 'Talents evicted from the open job market take their Attributes to
-      //   the box, …' and 'a Talent evicted with Flight Risk takes it to the box, …';
-      // - a Workaholic's +2 at the Engine (none): 'Workaholic gives +2 output in the colour its staff member makes and +$2
-      //   salary, …', 'a Workaholic Junior PM gets only the +$2 salary, …' and 'Workaholic's +2 follows the mode a unit works in: …';
+      // - Attributes boxed with an evicted Talent (2 players seed 2): 'Talents evicted from the open job market take their Attributes
+      //   to the box, …' and 'a Talent evicted with Flight Risk takes it to the box, …';
       // - Clean Coder stopping the Hacker's Bug (none): 'the Hacker with Clean Coder adds no Bug to the projects he joins, …';
       // - Clean Coder shielding a viral product (none): 'a Sales Rep with Clean Coder shields only the product it is on, …' and
       //   'a Sales Rep with Clean Coder on the Growth Hacker's own product stops its Bug, …';
-      // - a Visionary leading (3 players seed 4): 'a Junior with Visionary leads in both colours, …' and 'Visionary makes any unit a
+      // - a Visionary leading (none): 'a Junior with Visionary leads in both colours, …' and 'Visionary makes any unit a
       //   lead, …';
-      // - Toxic Personality taking a Blue cube (2 and 3 players, seed 4) and leaving a Bug (none): 'Toxic Personality takes one cube off its
+      // - Toxic Personality taking a Blue cube (2 players seed 4) and leaving a Bug (none): 'Toxic Personality takes one cube off its
       //   team's total after Synergy, Blue first, …' and 'a team that makes neither Blue nor Red cleans one Bug fewer for Toxic
       //   Personality, …';
-      // - Toxic Personality in the ops team (2 players seed 4): 'in the ops team Toxic Personality takes one off the Blue bandwidth first, …',
-      //   'an ops team that makes no Blue loses a Red to Toxic Personality, …' and 'an ops team that makes neither Blue nor Red cleans
-      //   one Bug fewer for Toxic Personality, …';
       // - Burnout on a PM giving no Synergy (none): 'a Junior PM with Burnout gives no Synergy, …';
       // - TechCrunch for $2 with a Sales Rep (4 players seed 4; a Trade Show play at $2 on a product no Sales Rep pitches is no longer
       //   counted as one): 'TechCrunch Feature adds 1 Hype to one of the player's products for $5 and no action,
       //   or $2 when a working Sales Rep is on that product, …', and the arranged test 'plays a TechCrunch Feature the auto-player holds
       //   on the product a working Sales Rep pitches, …' below.
-      // Held by none, the fewest: Attributes kept through a bench discard and Toxic Personality taking a Red cube; by one game each:
-      // Workaholic played (5 players seed 5) and TechCrunch for $5 (2 players seed 4), both in `HELD_BY_FEWER_THAN_TWO` once plan
-      // 6-2b's Event deck replayed every game; by two games each: a Buff on a bench card (4 and 5 players, seed 5), Hype scored (2 and 4
-      // players, seed 4) and a Debuff on an ops team card (2 players seed 4, 3 players seed 2); by three: Toxic Personality played (2
-      // players seed 4, 3 players seeds 1 and 4); by four each: Clean Coder played (2 players seeds 2 and 4, 3 players seed 3, 4
-      // players seed 4), Attributes discarded with a fired Talent (2 players seed 4, 3 players seed 5, 4 players seed 2, 5 players seed
-      // 4) and a Design Sprint dealing fewer than 5 (2 and 3 players seed 5, 4 players seeds 4 and 5); by six: Visionary played; by seven:
-      // a Design Sprint dealing 5; by eight each: a Buff on a Board card, Burnout played and Burnout leaving a unit idle; Flight Risk
-      // played by ten and a Debuff on a development team card by fourteen. A failure here means a cadence moved: retune the auto-player,
-      // never the rules.
+      // Held by none, the fewest: Toxic Personality taking a Red cube; by one game: Attributes kept through a bench discard (2 players
+      // seed 2), both in `HELD_BY_FEWER_THAN_TWO` once plan 6-2b's Event deck replayed every game; by two: Toxic Personality in the ops
+      // team (2 and 3 players, seed 4); by three each: Visionary played (2 players seed 1, 4 players seeds 2 and 5) and a Debuff on an
+      // ops team card (3 players seed 4, 5 players seeds 2 and 4); by four each: Toxic Personality played (2 players seed 4, 3 players
+      // seeds 1 and 4, 4 players seed 2) and a Design Sprint dealing fewer than 5 (2 and 3 players seed 5, 4 players seeds 4 and 5); by
+      // five each: Clean Coder played (2 players seeds 2 and 4, 3 players seed 3, 4 players seed 4, 5 players seed 2), a Buff on a
+      // bench card (3 players seeds 3 and 5, 4 players seeds 2 and 5, 5 players seed 5) and a Workaholic's +2 at the Engine (2 players
+      // seed 1, 3 players seeds 1, 3 and 5, 4 players seed 5); by six each: Hype scored and Burnout leaving a unit idle; by seven: a
+      // Design Sprint dealing 5; by eight each: TechCrunch for $5, Workaholic played and a Buff on a Board card; by nine each: Burnout
+      // played and Attributes discarded with a fired Talent; Flight Risk played by ten and a Debuff on a development team card by
+      // twelve. A failure here means a cadence moved: retune the auto-player, never the rules.
       expect(paths.filter((key) => !(tally[key] > 0) && !HELD_BY_FEWER_THAN_TWO.has(key)), `never seen: ${JSON.stringify(tally)}`).toEqual([]);
     });
 
```

**A.9** (line 4124 → 4139)

```diff
         CRUNCH_CUBE, CRUNCH_BUG, CRUNCH_STOPPED,
       ];
       // Setup reveals the first Event, so a reveal is counted from the second round on. Each Event is revealed in 2 games or more; the
-      // fewest are Intern Season (2 players seed 4, 3 players seed 4) and Venture Capital Rain (2 players seeds 2 and 4), then Trade Show
-      // (5 games) and Open Source Boom and Server Crash (6 each); Tech Bubble is revealed in 18. The discard shuffled into the event deck in
-      // 2 games (2 players seeds 2 and 4), the only games to last the 19 rounds that takes. By game: Regulation Audit paid in 3 (2 players
-      // seeds 2 and 4, 5 players seed 4), staff let go in 4 (2 and 3 players, seeds 1 and 4 and seeds 1 and 3), Server Crash at an Income
-      // in 4 (2 players seeds 2 and 4, 3 and 4 players seed 4), Online Course Boom's Training card in 5, Tech Bubble at an Income in 7,
-      // Crunch Time's cube and Bug in 9, Open Source Boom at work in 10 and Angel Investors paid in 12; Chip Shortage's Hardware hire in 2
-      // (2 and 3 players, seeds 2 and 3). Held by none or one game, so counted and not required (`HELD_BY_FEWER_THAN_TWO`), each pinned by
-      // its examples: Legacy Code at an Income, a Bug Crunch Time's Clean Code stopped and a TechCrunch Feature at Trade Show's $2
-      // (none), and Intern Season's free recruit and Patent Trolls' $5 License (2 players seed 4).
+      // fewest are Venture Capital Rain (2 players seeds 2 and 4) and Intern Season (2 players seeds 2 and 4, 3 players seed 4), then
+      // Open Source Boom, Server Crash and Trade Show (6 each); Tech Bubble is revealed in 18. The discard shuffled into the event deck
+      // in 2 games (2 players seeds 2 and 4), the only games to last the 19 rounds that takes. By game: Chip Shortage's Hardware hire
+      // in 2 (2 players seed 2, 3 players seed 3), a TechCrunch Feature at Trade Show's $2 in 2 (2 and 3 players, seed 2), Regulation
+      // Audit paid in 3 (2 players seed 4, 3 players seed 2, 5 players seed 4), Server Crash at an Income in 4 (2 players seeds 2 and
+      // 4, 3 and 4 players seed 4), Online Course Boom's Training card in 4 (2 players seeds 1, 2 and 5, 3 players seed 2), staff let
+      // go in 6 (2 players seeds 1, 2 and 4, 3 players seeds 1, 2 and 3), Intern Season's free recruit in 6 (2 and 3 players, seeds 2
+      // and 4, 4 and 5 players seed 2), Tech Bubble at an Income in 7, Crunch Time's cube and Bug in 9, Open Source Boom at work in 9
+      // and Angel Investors paid in 10. Held by none or one game, so counted and not required (`HELD_BY_FEWER_THAN_TWO`), each pinned
+      // by its examples: Legacy Code at an Income and a Bug Crunch Time's Clean Code stopped (none), and Patent Trolls' $5 License (2
+      // players seed 4).
       // A failure here means a cadence moved: retune the auto-player, never the rules.
       expect(paths.filter((key) => !(tally[key] > 0) && !HELD_BY_FEWER_THAN_TWO.has(key)), `never seen: ${JSON.stringify(tally)}`).toEqual([]);
     });
```

**A.10** (line 4250 → 4267)

```diff
       const board = (log: readonly Move[]) => made(log, [ASSIGN_TO_PROJECT, ASSIGN_TO_OPS]) && made(log, [LAUNCH]) && made(log, [PIVOT])
         && made(log, [REASSIGN_FROM_PROJECT, REASSIGN_FROM_OPS]);
       const states: GameState[] = [];
-      // Seed 2 makes all four by its 83rd move, the soonest of the 3-player seeds 1 to 5 (seed 5 takes 90, and seed 1 launches nothing).
+      // Seed 2 makes all four by its 69th move, the soonest of the 3-player seeds 1 to 5 (seeds 5 and 4 take 78 and 79, seeds 3 and 1
+      // 137 and 140).
       const engine = playGame(3, 2, (_before, _move, after) => states.push(after), { until: board });
       const log = [...engine.getLog()];
       expect(board(log), `the moves made: ${[...new Set(log.map((move) => move.type))].join(', ')}`).toBe(true);
```

**A.11** (line 4290 → 4308)

```diff
       /** Whether some Greenlight has paid a License, some chose among several answers, and some had every answer filled in. */
       const everyKind = () => Object.values(seen).every((times) => times > 0);
       // Each game stops at its first such Greenlight, and the seeds run from 1 until a game of each kind has been seen, which takes the
-      // games up to seed 4 since plan 6-2a's Strategy cards replayed every game again; a seed past 30 means the auto-player or the rules
-      // moved too far for this to be a seed's matter.
+      // games up to seed 6 since the second retune (up to seed 10 before it); a seed past 30 means the auto-player or the rules moved
+      // too far for this to be a seed's matter.
       const lastSeed = 30;
       let seed = 1;
       for (; seed <= lastSeed && !everyKind(); seed++) {
```

**A.12** (line 4483 → 4502; the hunk takes in the test "takes back the last move and rebuilds whole games from their logs, through Attribute plays, strips, a TechCrun…")

```diff
         replayed.undo();
         expect(replayed.getState(), `${where}: the game with its last move, ${log.at(-1)!.type}, taken back`).toEqual(beforeLast);
       }
-      // Some log declared a mode, switched a product off, added a Bug to a project, raised a Pending token at the Engine, graduated one at
-      // a Launch, shuffled the strategy discard into the deck, played a Training card that asked a choice or had it filled in, claimed
-      // a Milestone, played a Debuff, discarded a fired Talent's Attributes and played a TechCrunch Feature, shuffled the event discard into
-      // the event deck and let staff go in an event check that waited, so the replays rebuilt each of them. Every log reveals Events. The
-      // declarations are in seeds 1, 2, 4 and 5, the Debuffs in seeds 2 to 5, the reshuffle, the strips and the TechCrunch Feature in seed
-      // 4 only, the Event reshuffle in seeds 2 and 4 (only 2-player games last the 19 rounds a reshuffle takes) and a let-go in the event check in seeds 1 and 4. The last move taken back is the end of the
-      // actions in seeds 1 to 3, a final-check switch-off in seed 4 and a backlog cleanup's discard in seed 5. No log holds a clean press, so the test
-      // 'Review Focus: cleans no more Bugs than its QA when one product is left with Bugs partway through the step (R3)' above replays one;
-      // none a keep or Mentor press, so 'makes the graduation choices the auto-player picks, …' below replays those; none moves a card
-      // onto an Agile PM's team (P8), so 'reassigns a spare QA Engineer from the ops team onto the project the Senior PM manages, …'
-      // below replays the Agile spare; and none claims a Milestone at the last check, so 'rebuilds and takes back Platform Power claimed
-      // at the last check, …' below replays one.
+      // Some log declared a mode, switched a product off, added a Bug to a project, raised a Pending token at the Engine, graduated one
+      // at a Launch, shuffled the strategy discard into the deck, played a Training card that asked a choice or had it filled in,
+      // claimed a Milestone, played a Debuff, discarded a fired Talent's Attributes and played a TechCrunch Feature, shuffled the event
+      // discard into the event deck and let staff go in an event check that waited, so the replays rebuilt each of them. Every log
+      // reveals Events. The declarations are in seeds 1, 2, 4 and 5, the Debuffs in seeds 2 to 5, the reshuffle and the TechCrunch
+      // Feature in seeds 2 and 4, the strips in seeds 1, 2 and 4, the Event reshuffle in seeds 2 and 4 (only 2-player games last the 19
+      // rounds a reshuffle takes) and a let-go in the event check in seeds 1, 2 and 4. The last move taken back is the end of the
+      // actions in seeds 1 and 3, a final-check switch-off in seed 2 and a backlog cleanup's discard in seeds 4 and 5. No log holds a
+      // clean press, so the test 'Review Focus: cleans no more Bugs than its QA when one product is left with Bugs partway through the
+      // step (R3)' above replays one; none a keep or Mentor press, so 'makes the graduation choices the auto-player picks, …' below
+      // replays those; none moves a card onto an Agile PM's team (P8), so 'reassigns a spare QA Engineer from the ops team onto the
+      // project the Senior PM manages, …' below replays the Agile spare; and none claims a Milestone at the last check, so 'rebuilds
+      // and takes back Platform Power claimed at the last check, …' below replays one.
       expect(Object.entries(seen).filter(([what, times]) => times === 0 && !HELD_BY_FEWER_THAN_TWO.has(what)), JSON.stringify(seen)).toEqual([]);
     }, 120_000);
 
-    it('takes back the last move and rebuilds whole games from their logs, through Attribute plays, strips, a TechCrunch Feature and a Design Sprint (Review Focus: 3 players, seeds 1 to 5)', () => {
+    it('takes back the last move and rebuilds whole games from their logs, through Attribute plays, strips, TechCrunch Features and a Design Sprint (Review Focus: 3 players, seeds 1 to 5)', () => {
       // The games are the long run's (see `keptGames`), with what each counted as it was played. A Debuff is in every seed's log, the
-      // strips (Attributes discarded with a fired Talent) in seed 5 only, no TechCrunch Feature in any (plan 6-2b's Event deck left it to
-      // one game, 2 players seed 4: `HELD_BY_FEWER_THAN_TWO`, replayed by the 2-player test above) and a Design Sprint in seeds 2 and 5.
-      // The last move taken back is a final-check switch-off in seeds 1, 2, 3 and 5 and a backlog cleanup's discard in seed 4.
+      // strips (Attributes discarded with a fired Talent) in seeds 1, 2 and 5, a TechCrunch Feature in seeds 1, 2 and 4 (none before
+      // the second retune kept the TechCrunch Feature first) and a Design Sprint in seeds 2 and 5. The last move taken back is a
+      // final-check switch-off in every seed.
       const seen = { Debuffs: 0, strips: 0, 'TechCrunch Features': 0, 'Design Sprints': 0 };
       for (let seed = 1; seed <= 5; seed++) {
         const where = `3 players, seed ${seed}`;
```

**A.13** (line 4519 → 4539; the hunk takes in the test "makes the graduation choices the auto-player picks, through the page’s view and without it (§11.B.2, ruling 25…")

```diff
     }, 120_000);
 
     it('makes the graduation choices the auto-player picks, through the page’s view and without it (§11.B.2, ruling 25)', () => {
-      // The long runs press a button of the graduation step once (a keep, at 3 players seed 2): a Junior earns a Pending token of a second
-      // colour only by working in it, which takes a Skill token from Training, and it must then Launch holding both (plan 5-2b's P8). So
-      // this arranges a Launch with two Juniors holding two Pending tokens each, one in a colour their Skill token lets them work in, and
-      // the Veteran on the team to coach them.
+      // The long runs press no button of the graduation step (one keep, at 3 players seed 2, before the second retune): a Junior earns
+      // a Pending token of a second colour only by working in it, which takes a Skill token from Training, and it must then Launch
+      // holding both (plan 5-2b's P8). So this arranges a Launch with two Juniors holding two Pending tokens each, one in a colour
+      // their Skill token lets them work in, and the Veteran on the team to coach them.
       const start = setUp(2, 1);
       const seats = seatsFor(2);
       const S = startPlayerOf(start, seats);
```

**A.14** (line 4835 → 4855; the hunk takes in the test "claims Talent Magnet and Clean Launch at an auto-player Launch that graduates a second Junior to 3 XP, and Rev…")

```diff
     });
 
     it('claims Talent Magnet and Clean Launch at an auto-player Launch that graduates a second Junior to 3 XP, and Revenue Leader at its next Income of $10, through the page’s view and without it (§12.5, §20.G, ruling 25)', () => {
-      // Setup reveals no Talent Magnet at seeds 1 to 5, and an Income in the long runs comes to $10 only at 2 and 4 players seed 4, so
+      // Setup reveals no Talent Magnet at seeds 1 to 5, and an Income in the long runs comes to $10 only at 3 players seed 4, so
       // this arranges both, as their examples do: the seat's bench holds a Junior Software Dev of 3 XP, and its complete Smart Lock a
       // Junior Hardware Eng of 2 XP with 1 Pending token, which the Launch graduates to 3 (§11.B.2). Then its App Store, Trading Bot and
       // Smart Lock earn $4, $4 and $2 (§20.C.1), which the Architect's Blue and the Junior's Red run. The other three Milestones go back
```

**A.15** (line 5104 → 5124; the hunk takes in the test "hires the card a Layoff found to the ops team while it has a product, by the product’s button when ⌊t / 9⌋ is …")

```diff
 
     it('hires the card a Layoff found to the ops team while it has a product, by the product’s button when ⌊t / 9⌋ is odd, through the page’s view and without it (§13.B)', () => {
       // No accepted example presses the scouting's hire to the ops team (the rules' only example of it refuses it), and the long runs
-      // make it in one game (5 players seed 3). Here the seat runs a To-Do List, lays off its HR Manager and finds the Veteran, who
-      // doesn't attach, for $6 of its $7; the agency row is full, so no refill draws him. While the seat has a product its hire goes to
-      // the ops team first: on t = 0 by the ops team's button, and on t = 9, ⌊t / 9⌋ odd, by the button of its first product, which
-      // sends a card that doesn't attach to the ops team as well (see `sourcing`).
+      // make it in three games (2 players seed 2, 4 players seeds 2 and 4). Here the seat runs a To-Do List, lays off its HR Manager
+      // and finds the Veteran, who doesn't attach, for $6 of its $7; the agency row is full, so no refill draws him. While the seat has
+      // a product its hire goes to the ops team first: on t = 0 by the ops team's button, and on t = 9, ⌊t / 9⌋ odd, by the button of
+      // its first product, which sends a card that doesn't attach to the ops team as well (see `sourcing`).
       const seats = seatsFor(2);
       const [toDo, hr, veteran] = ['To-Do List', 'HR Manager', 'Veteran'].map(idOf);
       const arranged = arrange({
```
