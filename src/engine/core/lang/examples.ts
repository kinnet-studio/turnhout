// Runs a game's `Example:` blocks on the real engine: Given lines arrange the table, When lines make moves and
// Then lines check what came of them. Every result is in a designer's words.
import type { GameState } from '../game-state';
import { checkPlayers, createEngine, initialState, seatsFor } from './build';
import { MissingPhraseError, RuleError } from './diagnostics';
import { friendlyError, friendlyReason } from './friendly';
import { byCardId } from './library/example-phrases';
import type { PhraseLibrary } from './phrases';
import { LangRuntime } from './runtime';
import type { CompiledExample, CompiledGame, ExampleEnv } from './types';
import { matchesCard } from './zones';

export type ExampleResult = {
  name: string;
  line: number;
  status: 'pass' | 'fail' | 'blocked';
  message: string | null; // null on pass
  atLine: number | null; // the line of the example that failed or is blocked; null on pass
};

/** Every example is played from the same cards, so a run is the same every time. */
const SEED = 1;

/** Hands out each card at most once, the lowest-numbered one that matches first (c3 before c12). */
function claimer(): ExampleEnv['claim'] {
  const claimed = new Set<string>();
  return (match, text, state) => {
    const card = state.cards.filter((c) => !claimed.has(c.id) && matchesCard(c, match)).sort(byCardId)[0];
    if (!card) throw new RuleError(`No card matches “${text}”.`);
    claimed.add(card.id);
    return card.id;
  };
}

function runExample(game: CompiledGame, library: PhraseLibrary, example: CompiledExample): ExampleResult {
  const result = (status: ExampleResult['status'], message: string | null, atLine: number | null): ExampleResult =>
    ({ name: example.name, line: example.line, status, message, atLine });
  // The line being run, so that whatever goes wrong can say where.
  let at = example.line;
  try {
    const players = example.players ?? game.players.min;
    checkPlayers(game, players);
    const seats = seatsFor(players);
    const first = game.phases[0];

    const env: ExampleEnv = {
      last: null,
      claim: claimer(),
      // The game's own Setup, run on what is on the table so far.
      setUp: (state) => createEngine(game, library, players, { ...state, turn: undefined }).engine.getState(),
    };

    // Cards are in their starting zones and the first phase is on, so Given lines can arrange the table.
    let table: GameState = { ...initialState(game, SEED), turn: first ? { current: seats[0], phase: first.id } : undefined };
    let built: ReturnType<typeof createEngine> | null = null;
    const arranging = new LangRuntime(game, library, seats);

    for (const { keyword, ref } of example.steps) {
      at = ref.line;
      if (keyword === 'given') {
        table = arranging.run(ref, built ? built.engine.getState() : table, undefined, env);
        if (built) built = createEngine(game, library, players, table);
        continue;
      }

      if (!built) {
        // The rules themselves not settling is the example's trouble, not this line's.
        at = example.line;
        built = createEngine(game, library, players, table);
        at = ref.line;
      }
      const { engine, runtime } = built;
      if (keyword === 'when') {
        const before = engine.getState();
        const { by, move } = runtime.act(ref, before, env);
        const outcome = engine.dispatch({ ...move, by });
        env.last = {
          ok: outcome.ok,
          reason: outcome.reason === undefined ? undefined : friendlyReason(outcome.reason, before.turn?.current),
        };
      } else {
        const verdict = runtime.expect(ref, engine.getState(), env);
        if (verdict !== true) return result('fail', verdict, ref.line);
      }
    }
    return result('pass', null, null);
  } catch (error) {
    if (error instanceof MissingPhraseError) {
      return result('blocked', `Blocked by “${error.text ?? 'a rule'}” (line ${error.line ?? at}), which isn't implemented yet.`, at);
    }
    return result('fail', friendlyError(error), at);
  }
}

/** Plays each example of the game, in the order written, and says whether it passed, failed or cannot run yet. */
export function runExamples(game: CompiledGame, library: PhraseLibrary): ExampleResult[] {
  return game.examples.map((example) => runExample(game, library, example));
}
